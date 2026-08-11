import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { localAudit, sessions } from "@/db/schema";
import { openString, sealString } from "./crypto";
import { runtimeConfig } from "./env";

export const SESSION_COOKIE = "basecamp_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type OwnerSession = {
  id: string;
  account: string;
  ownerToken: string;
  expiresAt: Date;
};

export async function createOwnerSession(account: string, ownerToken: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const id = randomUUID();
  const sealed = sealString(ownerToken, runtimeConfig().sessionKey);
  getDb().insert(sessions).values({
    id,
    account,
    ownerTokenCiphertext: sealed.ciphertext,
    ownerTokenIv: sealed.iv,
    ownerTokenTag: sealed.tag,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  }).run();
  audit("SESSION_CREATED", account, null, { expires_at: expiresAt.toISOString() });
  return { id, expiresAt };
}

export function readOwnerSession(id: string): OwnerSession | null {
  const row = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    getDb().delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return {
    id: row.id,
    account: row.account,
    expiresAt: row.expiresAt,
    ownerToken: openString({
      ciphertext: row.ownerTokenCiphertext,
      iv: row.ownerTokenIv,
      tag: row.ownerTokenTag,
    }, runtimeConfig().sessionKey),
  };
}

export function deleteOwnerSession(id: string) {
  const existing = getDb().select({ account: sessions.account }).from(sessions).where(eq(sessions.id, id)).get();
  getDb().delete(sessions).where(eq(sessions.id, id)).run();
  if (existing) audit("SESSION_DELETED", existing.account, null, {});
}

export async function currentOwnerSession() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  return sessionId ? readOwnerSession(sessionId) : null;
}

export function audit(eventType: string, actorAccount: string | null, requestId: string | null, evidence: Record<string, unknown>) {
  getDb().insert(localAudit).values({
    eventType,
    actorAccount,
    requestId,
    evidenceJson: JSON.stringify(evidence),
    createdAt: new Date(),
  }).run();
}
