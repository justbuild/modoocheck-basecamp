import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { officialRequests, officialSnapshots } from "@/db/schema";
import {
  changeRequestStatus,
  createChangeRequest,
  dispatchChangeRequest,
  type ExecutionStatus,
} from "./agent-api";
import { delegatedAccessToken } from "./delegated";
import { extractResultData, officialOperation, type OfficialOperationId } from "./official-catalog";
import { audit, type OwnerSession } from "./session";

const TERMINAL_STATUSES = new Set(["REJECTED", "EXPIRED", "EXECUTED", "FAILED", "UNKNOWN"]);

const requestInputSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
});
export type OfficialRequestInput = z.infer<typeof requestInputSchema>;

export type OfficialRequestView = {
  requestId: string;
  operation: string;
  kind: "READ" | "WRITE";
  status: string;
  notification?: "SENT" | "FAILED";
  nextAction: string | null;
  expiresAt: string;
  errorCause?: string;
};

/** 공식 데이터 요청 생성: 위임 토큰으로 change request를 만들고 로컬에 추적 기록을 남긴다. */
export async function startOfficialRequest(
  session: OwnerSession,
  operationId: OfficialOperationId,
  input: OfficialRequestInput,
): Promise<OfficialRequestView> {
  const operation = officialOperation(operationId);
  const request = requestInputSchema.parse(input);
  const token = await delegatedAccessToken(session);
  const created = await createChangeRequest(token, operationId, request);
  const now = new Date();
  getDb().insert(officialRequests).values({
    requestId: created.request_id,
    operation: operationId,
    kind: operation.kind,
    payloadJson: JSON.stringify(request),
    status: created.status,
    expiresAt: new Date(created.expires_at),
    createdAt: now,
    updatedAt: now,
  }).run();
  audit("OFFICIAL_REQUEST_CREATED", session.account, created.request_id, {
    operation: operationId,
    kind: operation.kind,
    notification: created.notification,
  });
  return {
    requestId: created.request_id,
    operation: operationId,
    kind: operation.kind,
    status: created.status,
    notification: created.notification,
    nextAction: null,
    expiresAt: created.expires_at,
  };
}

function persistStatus(requestId: string, status: ExecutionStatus) {
  getDb().update(officialRequests).set({
    status: status.status,
    resultJson: status.result ? JSON.stringify(status.result) : null,
    nextAction: status.next_action ?? null,
    updatedAt: new Date(),
  }).where(eq(officialRequests.requestId, requestId)).run();
}

function saveSnapshot(key: string, requestId: string, data: unknown) {
  const values = { requestId, dataJson: JSON.stringify(data), fetchedAt: new Date() };
  getDb().insert(officialSnapshots)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: officialSnapshots.key, set: values })
    .run();
}

/**
 * 요청 상태를 한 단계 전진시킨다.
 * REQUESTED → (원장 승인 대기), APPROVED → 1회 dispatch, EXECUTED(조회) → 스냅샷 저장.
 * UNKNOWN은 terminal이며 절대 재실행하지 않는다.
 */
export async function advanceOfficialRequest(session: OwnerSession, requestId: string): Promise<OfficialRequestView> {
  const row = getDb().select().from(officialRequests).where(eq(officialRequests.requestId, requestId)).get();
  if (!row) throw new Error("추적 중인 공식 데이터 요청이 아닙니다.");
  if (TERMINAL_STATUSES.has(row.status)) return toView(row);

  const operation = officialOperation(row.operation as OfficialOperationId);
  const token = await delegatedAccessToken(session);
  let status = await changeRequestStatus(token, requestId);
  if (status.status === "APPROVED") {
    status = await dispatchChangeRequest(token, requestId);
    audit("OFFICIAL_REQUEST_DISPATCHED", session.account, requestId, {
      operation: row.operation,
      status: status.status,
    });
  }
  persistStatus(requestId, status);
  if (status.status === "EXECUTED" && operation.kind === "READ" && operation.snapshotKey) {
    saveSnapshot(operation.snapshotKey, requestId, extractResultData(status.result));
  }
  const updated = getDb().select().from(officialRequests).where(eq(officialRequests.requestId, requestId)).get();
  return toView(updated!);
}

function toView(row: typeof officialRequests.$inferSelect): OfficialRequestView {
  let result: { category?: string; body?: { error?: string | null } } | undefined;
  try {
    result = row.resultJson ? JSON.parse(row.resultJson) : undefined;
  } catch {
    result = undefined;
  }
  return {
    requestId: row.requestId,
    operation: row.operation,
    kind: row.kind as "READ" | "WRITE",
    status: row.status,
    nextAction: row.nextAction,
    expiresAt: row.expiresAt.toISOString(),
    errorCause: row.status === "FAILED" && result?.body?.error ? String(result.body.error) : undefined,
  };
}

/** 화면 표시용: 아직 끝나지 않은 요청 목록. */
export function pendingOfficialRequests(operations: string[]): OfficialRequestView[] {
  if (operations.length === 0) return [];
  const rows = getDb().select().from(officialRequests)
    .where(inArray(officialRequests.operation, operations))
    .orderBy(desc(officialRequests.createdAt))
    .all();
  return rows
    .filter((row) => !TERMINAL_STATUSES.has(row.status) && row.expiresAt.getTime() > Date.now() - 60_000)
    .map((row) => toView(row));
}

export function readSnapshot(key: string) {
  const row = getDb().select().from(officialSnapshots).where(eq(officialSnapshots.key, key)).get();
  if (!row) return null;
  return { data: JSON.parse(row.dataJson) as unknown, fetchedAt: row.fetchedAt, requestId: row.requestId };
}
