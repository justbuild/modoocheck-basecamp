import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { delegatedCredentials } from "@/db/schema";
import { AgentApiError, enrollDelegatedFamily, issueEnrollmentCode, refreshDelegatedFamily } from "./agent-api";
import { openString, sealString } from "./crypto";
import { runtimeConfig } from "./env";
import { audit } from "./session";

/**
 * Basecamp 자신이 공식 데이터를 조회/변경 요청할 때 쓰는 위임 자격(가족) 관리.
 * Agent API에는 원장용 읽기 endpoint가 없으므로, Basecamp도 하나의 위임
 * 클라이언트로 등록해 change-request 흐름(요청 → 원장 승인 → 1회 실행)을 그대로 따른다.
 */
const CREDENTIAL_ID = "basecamp";
const ACCESS_TOKEN_SAFETY_MS = 60 * 1000;

type CredentialRow = typeof delegatedCredentials.$inferSelect;

function readCredentials(): CredentialRow | undefined {
  return getDb().select().from(delegatedCredentials).where(eq(delegatedCredentials.id, CREDENTIAL_ID)).get();
}

export function delegatedClientStatus() {
  const row = readCredentials();
  if (!row) return { connected: false as const };
  return {
    connected: true as const,
    familyId: row.familyId,
    status: row.status,
    scopes: JSON.parse(row.scopesJson) as string[],
  };
}

function saveEnrollment(account: string, result: {
  family_id: string;
  family_secret: string;
  access_token: string;
  access_expires_at: string;
  scopes: string[];
}) {
  const key = runtimeConfig().sessionKey;
  const now = new Date();
  const secret = sealString(result.family_secret, key);
  const token = sealString(result.access_token, key);
  const values = {
    familyId: result.family_id,
    familySecretCiphertext: secret.ciphertext,
    familySecretIv: secret.iv,
    familySecretTag: secret.tag,
    accessTokenCiphertext: token.ciphertext,
    accessTokenIv: token.iv,
    accessTokenTag: token.tag,
    accessExpiresAt: new Date(result.access_expires_at),
    scopesJson: JSON.stringify(result.scopes),
    status: "ACTIVE",
    updatedAt: now,
  };
  getDb().insert(delegatedCredentials)
    .values({ id: CREDENTIAL_ID, createdAt: now, ...values })
    .onConflictDoUpdate({ target: delegatedCredentials.id, set: values })
    .run();
  audit("DELEGATED_CLIENT_ENROLLED", account, null, { family_id: result.family_id });
  return result.access_token;
}

async function enrollWithOwner(account: string, ownerToken: string) {
  const code = await issueEnrollmentCode(ownerToken);
  const result = await enrollDelegatedFamily(code.enrollment_code);
  return saveEnrollment(account, result);
}

function markReenrollRequired() {
  getDb().update(delegatedCredentials)
    .set({ status: "REENROLL_REQUIRED", updatedAt: new Date() })
    .where(eq(delegatedCredentials.id, CREDENTIAL_ID))
    .run();
}

function saveAccessToken(accessToken: string, expiresAt: string) {
  const sealed = sealString(accessToken, runtimeConfig().sessionKey);
  getDb().update(delegatedCredentials).set({
    accessTokenCiphertext: sealed.ciphertext,
    accessTokenIv: sealed.iv,
    accessTokenTag: sealed.tag,
    accessExpiresAt: new Date(expiresAt),
    updatedAt: new Date(),
  }).where(eq(delegatedCredentials.id, CREDENTIAL_ID)).run();
}

/**
 * 유효한 10분짜리 위임 access token을 반환한다.
 * 자격이 없거나 폐기되었으면 로그인한 원장 세션 토큰으로 즉시 재등록한다.
 */
export async function delegatedAccessToken(session: { account: string; ownerToken: string }): Promise<string> {
  const row = readCredentials();
  if (!row || row.status !== "ACTIVE") {
    return enrollWithOwner(session.account, session.ownerToken);
  }
  const key = runtimeConfig().sessionKey;
  if (
    row.accessTokenCiphertext && row.accessTokenIv && row.accessTokenTag &&
    row.accessExpiresAt && row.accessExpiresAt.getTime() - Date.now() > ACCESS_TOKEN_SAFETY_MS
  ) {
    return openString({
      ciphertext: row.accessTokenCiphertext,
      iv: row.accessTokenIv,
      tag: row.accessTokenTag,
    }, key);
  }
  const familySecret = openString({
    ciphertext: row.familySecretCiphertext,
    iv: row.familySecretIv,
    tag: row.familySecretTag,
  }, key);
  try {
    const refreshed = await refreshDelegatedFamily(row.familyId, familySecret);
    saveAccessToken(refreshed.access_token, refreshed.access_expires_at);
    return refreshed.access_token;
  } catch (error) {
    if (error instanceof AgentApiError && (error.status === 401 || error.status === 409)) {
      // refresh 재사용 감지 등으로 가족이 폐기됨 — 원장 세션으로 새로 등록한다.
      markReenrollRequired();
      return enrollWithOwner(session.account, session.ownerToken);
    }
    throw error;
  }
}
