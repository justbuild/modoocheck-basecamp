import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * 원장 직접 실행 흐름(입력 검증 → upstream 직접 호출 → 스냅샷 저장)을
 * upstream mock으로 검증한다. 실제 네트워크는 사용하지 않는다.
 * 원장 조작에는 승인 파이프라인이 없어야 한다 — agent-api mock 자체가 없다.
 */
const dbFile = "official-test.db";

const callUpstream = vi.fn();

vi.mock("./upstream", () => ({
  callUpstream: (...args: unknown[]) => callUpstream(...args),
}));
vi.mock("./session", () => ({
  audit: vi.fn(),
}));

const session = { id: "s", account: "owner", ownerToken: "owner-token", expiresAt: new Date(Date.now() + 60_000) };

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
});

describe("official direct execution", () => {
  it("조회는 원장 토큰으로 upstream을 바로 부르고 스냅샷을 저장한다", async () => {
    const { runOfficialOperation, readSnapshot } = await import("./official");

    callUpstream.mockResolvedValueOnce([{ _id: 7, name: "월수금반", studentCount: 3 }]);
    const view = await runOfficialOperation(session, "groups.list", {});
    expect(view).toMatchObject({ operation: "groups.list", kind: "READ", status: "EXECUTED" });
    expect(callUpstream).toHaveBeenCalledWith("owner-token", {
      method: "GET",
      path: "/service/groups",
      query: undefined,
      body: undefined,
    });

    const snapshot = readSnapshot("groups");
    expect(snapshot?.data).toEqual([{ _id: 7, name: "월수금반", studentCount: 3 }]);
  });

  it("변경은 승인 없이 한 번의 upstream 호출로 실행되고 스냅샷을 만들지 않는다", async () => {
    const { runOfficialOperation } = await import("./official");
    callUpstream.mockClear();

    callUpstream.mockResolvedValueOnce({ uuid: "s-1", name: "홍길동" });
    const view = await runOfficialOperation(session, "students.create", {
      body: { name: "홍길동", contacts: ["01012345678"] },
    });
    expect(view).toMatchObject({ operation: "students.create", kind: "WRITE", status: "EXECUTED" });
    expect(view.data).toBeUndefined();
    expect(callUpstream).toHaveBeenCalledTimes(1);
    expect(callUpstream).toHaveBeenCalledWith("owner-token", {
      method: "POST",
      path: "/service/students",
      query: undefined,
      body: { name: "홍길동", contacts: ["01012345678"] },
    });
  });

  it("스냅샷 없는 조회(학생 상세)는 응답 데이터를 그대로 돌려준다", async () => {
    const { runOfficialOperation } = await import("./official");
    callUpstream.mockClear();

    callUpstream.mockResolvedValueOnce({ uuid: "u-1", name: "홍길동", memo: "메모" });
    const view = await runOfficialOperation(session, "students.detail", { params: { student_uuid: "u-1" } });
    expect(view).toMatchObject({ operation: "students.detail", kind: "READ", status: "EXECUTED" });
    expect(view.data).toEqual({ uuid: "u-1", name: "홍길동", memo: "메모" });
    expect(callUpstream).toHaveBeenCalledWith("owner-token", expect.objectContaining({
      method: "GET",
      path: "/service/students/u-1",
    }));
  });

  it("경로 매개변수를 URL에 안전하게 끼워 넣는다", async () => {
    const { runOfficialOperation } = await import("./official");
    callUpstream.mockClear();

    callUpstream.mockResolvedValueOnce(null);
    await runOfficialOperation(session, "groups.delete", { params: { groupId: "7" } });
    expect(callUpstream).toHaveBeenCalledWith("owner-token", expect.objectContaining({
      method: "DELETE",
      path: "/service/groups/7",
    }));
  });

  it("upstream 실패는 그대로 던지고 스냅샷을 바꾸지 않는다", async () => {
    const { runOfficialOperation, readSnapshot } = await import("./official");
    callUpstream.mockClear();

    const before = readSnapshot("groups");
    callUpstream.mockRejectedValueOnce(new Error("UPSTREAM_DOWN"));
    await expect(runOfficialOperation(session, "groups.list", {})).rejects.toThrow("UPSTREAM_DOWN");
    expect(readSnapshot("groups")?.data).toEqual(before?.data);
  });
});
