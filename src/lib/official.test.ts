import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ExecutionStatus, RequestedOperation } from "./agent-api";

/**
 * 공식 데이터 요청 파이프라인(생성 → 승인 대기 → 실행 → 스냅샷 저장)의 상태 전이를
 * Agent API를 흉내 내는 mock으로 검증한다. 실제 네트워크는 사용하지 않는다.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "basecamp-official-"));
const dbFile = "official-test.db";

const createChangeRequest = vi.fn();
const changeRequestStatus = vi.fn();
const dispatchChangeRequest = vi.fn();

vi.mock("./agent-api", () => ({
  createChangeRequest: (...args: unknown[]) => createChangeRequest(...args),
  changeRequestStatus: (...args: unknown[]) => changeRequestStatus(...args),
  dispatchChangeRequest: (...args: unknown[]) => dispatchChangeRequest(...args),
}));
vi.mock("./delegated", () => ({
  delegatedAccessToken: vi.fn(async () => "test-access-token"),
}));
vi.mock("./session", () => ({
  audit: vi.fn(),
}));

const session = { id: "s", account: "owner", ownerToken: "t", expiresAt: new Date(Date.now() + 60_000) };

beforeAll(() => {
  process.env.DATABASE_FILENAME = dbFile;
  const cwdData = path.join(process.cwd(), "data");
  fs.mkdirSync(cwdData, { recursive: true });
  const sqlite = new Database(path.join(cwdData, dbFile));
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve("./drizzle") });
  sqlite.close();
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(path.join(process.cwd(), "data", `${dbFile}${suffix}`), { force: true });
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("official request pipeline", () => {
  it("조회 요청을 만들고, 승인 후 한 번만 실행하며, 스냅샷을 저장한다", async () => {
    const { startOfficialRequest, advanceOfficialRequest, readSnapshot } = await import("./official");

    const requested: RequestedOperation = {
      request_id: "req-1",
      operation: "groups.list",
      status: "REQUESTED",
      target_count: 1,
      side_effects: [],
      approval_digest: "d".repeat(64),
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      notification: "SENT",
    };
    createChangeRequest.mockResolvedValueOnce(requested);

    const created = await startOfficialRequest(session, "groups.list", {});
    expect(created).toMatchObject({ requestId: "req-1", kind: "READ", status: "REQUESTED" });
    expect(createChangeRequest).toHaveBeenCalledWith("test-access-token", "groups.list", {});

    // 아직 승인 전 — dispatch하지 않는다.
    changeRequestStatus.mockResolvedValueOnce({ request_id: "req-1", operation: "groups.list", status: "REQUESTED" } satisfies ExecutionStatus);
    const waiting = await advanceOfficialRequest(session, "req-1");
    expect(waiting.status).toBe("REQUESTED");
    expect(dispatchChangeRequest).not.toHaveBeenCalled();

    // 승인됨 — 정확히 한 번 dispatch하고 스냅샷을 저장한다.
    changeRequestStatus.mockResolvedValueOnce({ request_id: "req-1", operation: "groups.list", status: "APPROVED" } satisfies ExecutionStatus);
    dispatchChangeRequest.mockResolvedValueOnce({
      request_id: "req-1",
      operation: "groups.list",
      status: "EXECUTED",
      result: { category: "success", status: 200, body: { success: true, data: [{ _id: 7, name: "월수금반", studentCount: 3 }] } },
    } satisfies ExecutionStatus);
    const executed = await advanceOfficialRequest(session, "req-1");
    expect(executed.status).toBe("EXECUTED");
    expect(dispatchChangeRequest).toHaveBeenCalledTimes(1);

    const snapshot = readSnapshot("groups");
    expect(snapshot?.requestId).toBe("req-1");
    expect(snapshot?.data).toEqual([{ _id: 7, name: "월수금반", studentCount: 3 }]);

    // terminal 이후에는 Agent API를 다시 부르지 않는다.
    changeRequestStatus.mockClear();
    const settled = await advanceOfficialRequest(session, "req-1");
    expect(settled.status).toBe("EXECUTED");
    expect(changeRequestStatus).not.toHaveBeenCalled();
  });

  it("변경 요청이 FAILED로 끝나면 원인을 남기고 스냅샷을 건드리지 않는다", async () => {
    const { startOfficialRequest, advanceOfficialRequest, readSnapshot } = await import("./official");

    createChangeRequest.mockResolvedValueOnce({
      request_id: "req-2",
      operation: "groups.create",
      status: "REQUESTED",
      target_count: 1,
      side_effects: [],
      approval_digest: "d".repeat(64),
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      notification: "FAILED",
    } satisfies RequestedOperation);
    const created = await startOfficialRequest(session, "groups.create", { body: { name: "새 반" } });
    expect(created.notification).toBe("FAILED");

    changeRequestStatus.mockResolvedValueOnce({ request_id: "req-2", operation: "groups.create", status: "APPROVED" } satisfies ExecutionStatus);
    dispatchChangeRequest.mockResolvedValueOnce({
      request_id: "req-2",
      operation: "groups.create",
      status: "FAILED",
      result: { category: "guaranteed_no_change", status: 400, body: { success: false, data: null, error: "이미 있는 그룹 이름입니다." } },
    } satisfies ExecutionStatus);
    const failed = await advanceOfficialRequest(session, "req-2");
    expect(failed.status).toBe("FAILED");
    expect(failed.errorCause).toBe("이미 있는 그룹 이름입니다.");
    expect(readSnapshot("groups")?.requestId).toBe("req-1");
  });

  it("UNKNOWN은 terminal로 저장하고 next_action을 보존한다", async () => {
    const { startOfficialRequest, advanceOfficialRequest, pendingOfficialRequests } = await import("./official");

    createChangeRequest.mockResolvedValueOnce({
      request_id: "req-3",
      operation: "students.list",
      status: "REQUESTED",
      target_count: 1,
      side_effects: [],
      approval_digest: "d".repeat(64),
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      notification: "SENT",
    } satisfies RequestedOperation);
    await startOfficialRequest(session, "students.list", {});

    changeRequestStatus.mockResolvedValueOnce({
      request_id: "req-3",
      operation: "students.list",
      status: "UNKNOWN",
      next_action: "모두출첵에서 직접 확인하세요.",
    } satisfies ExecutionStatus);
    const unknown = await advanceOfficialRequest(session, "req-3");
    expect(unknown.status).toBe("UNKNOWN");
    expect(unknown.nextAction).toBe("모두출첵에서 직접 확인하세요.");
    expect(dispatchChangeRequest).toHaveBeenCalledTimes(2);
    expect(pendingOfficialRequests(["students.list"])).toHaveLength(0);
  });
});
