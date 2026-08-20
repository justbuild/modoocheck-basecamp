import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { officialSnapshots } from "@/db/schema";
import { officialOperation, resolveOperationPath, type OfficialOperationId } from "./official-catalog";
import { audit, type OwnerSession } from "./session";
import { callUpstream } from "./upstream";

const requestInputSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
});
export type OfficialRequestInput = z.infer<typeof requestInputSchema>;

export type OfficialRunView = {
  executionId: string;
  operation: string;
  kind: "READ" | "WRITE";
  status: "EXECUTED";
  /** 스냅샷 없이 바로 화면에 쓰는 조회(예: 학생 상세)의 응답 데이터. */
  data?: unknown;
};

/**
 * 원장이 Basecamp 화면에서 직접 실행하는 공식 데이터 작업.
 * 원장 본인의 조작이므로 승인 절차 없이 원장 세션 토큰으로 upstream을 바로 부른다.
 * 조회(READ)는 결과를 화면 표시용 스냅샷으로 저장한다.
 * 실패는 UpstreamApiError로 던져지고 BFF가 오류 응답으로 변환한다.
 */
export async function runOfficialOperation(
  session: OwnerSession,
  operationId: OfficialOperationId,
  input: OfficialRequestInput,
): Promise<OfficialRunView> {
  const operation = officialOperation(operationId);
  const request = requestInputSchema.parse(input);
  const executionId = randomUUID();
  const data = await callUpstream(session.ownerToken, {
    method: operation.method,
    path: resolveOperationPath(operation.path, request.params),
    query: request.query as Record<string, unknown> | undefined,
    body: request.body as Record<string, unknown> | undefined,
  });
  if (operation.kind === "READ" && operation.snapshotKey) {
    saveSnapshot(operation.snapshotKey, executionId, data);
  }
  audit("OFFICIAL_DIRECT_EXECUTED", session.account, executionId, {
    operation: operationId,
    kind: operation.kind,
  });
  const view: OfficialRunView = { executionId, operation: operationId, kind: operation.kind, status: "EXECUTED" };
  if (operation.kind === "READ" && !operation.snapshotKey) view.data = data;
  return view;
}

function saveSnapshot(key: string, requestId: string, data: unknown) {
  const values = { requestId, dataJson: JSON.stringify(data), fetchedAt: new Date() };
  getDb().insert(officialSnapshots)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: officialSnapshots.key, set: values })
    .run();
}

export function readSnapshot(key: string) {
  const row = getDb().select().from(officialSnapshots).where(eq(officialSnapshots.key, key)).get();
  if (!row) return null;
  return { data: JSON.parse(row.dataJson) as unknown, fetchedAt: row.fetchedAt, requestId: row.requestId };
}

/** 스냅샷이 maxAgeMs 안에 가져온 것이면 true. 렌더 함수의 순수성 규칙을 피하려고 여기 둔다. */
export function isSnapshotFresh(key: string, maxAgeMs: number): boolean {
  const row = getDb().select({ fetchedAt: officialSnapshots.fetchedAt })
    .from(officialSnapshots).where(eq(officialSnapshots.key, key)).get();
  return row !== undefined && Date.now() - row.fetchedAt.getTime() < maxAgeMs;
}
