import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * 학원 이름·로고 표시용 캐시 흐름을 upstream mock으로 검증한다. 실제 네트워크는 사용하지 않는다.
 * 진실의 원천은 모두출첵 Core(/service/user)이고 app_settings는 표시용 캐시일 뿐이다.
 */
const dbFile = "academy-profile-test.db";

const callUpstream = vi.fn();

vi.mock("./upstream", () => ({
  callUpstream: (...args: unknown[]) => callUpstream(...args),
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

async function overwriteCache(value: unknown) {
  const { getDb } = await import("@/db");
  const { appSettings } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  getDb().update(appSettings).set({ valueJson: JSON.stringify(value) })
    .where(eq(appSettings.key, "academy-profile")).run();
}

async function clearCache() {
  const { getDb } = await import("@/db");
  const { appSettings } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  getDb().delete(appSettings).where(eq(appSettings.key, "academy-profile")).run();
}

describe("academy profile cache", () => {
  it("회원정보에서 학원 이름과 로고를 가져와 캐시에 저장한다", async () => {
    const { academyProfile } = await import("./academy-profile");

    callUpstream.mockResolvedValueOnce({
      uuid: "u-1",
      name: "  햇살영어학원  ",
      email: "a@b.c",
      profileImageUrl: "https://cdn.example.com/user-profile/logo.png",
    });
    await expect(academyProfile(session)).resolves.toEqual({
      name: "햇살영어학원",
      logoUrl: "https://cdn.example.com/user-profile/logo.png",
    });
    expect(callUpstream).toHaveBeenCalledWith("owner-token", { method: "GET", path: "/service/user" });
  });

  it("캐시가 신선하면 upstream을 다시 부르지 않는다", async () => {
    const { academyProfile } = await import("./academy-profile");
    callUpstream.mockClear();

    await expect(academyProfile(session)).resolves.toEqual({
      name: "햇살영어학원",
      logoUrl: "https://cdn.example.com/user-profile/logo.png",
    });
    expect(callUpstream).not.toHaveBeenCalled();
  });

  it("로고가 상대 경로(기본 이미지)면 로고 없이 이름만 쓴다", async () => {
    const { academyProfile } = await import("./academy-profile");
    callUpstream.mockClear();
    await overwriteCache({ name: "햇살영어학원", logoUrl: null, fetchedAt: Date.now() - 2 * 60 * 60 * 1000 });

    callUpstream.mockResolvedValueOnce({ name: "햇살영어학원", profileImageUrl: "/img/no_img.svg" });
    await expect(academyProfile(session)).resolves.toEqual({ name: "햇살영어학원", logoUrl: null });
  });

  it("upstream 실패 시 오래된 캐시라도 돌려준다", async () => {
    const { academyProfile } = await import("./academy-profile");
    callUpstream.mockClear();
    await overwriteCache({ name: "햇살영어학원", logoUrl: "https://cdn.example.com/logo.png", fetchedAt: Date.now() - 2 * 60 * 60 * 1000 });

    callUpstream.mockRejectedValueOnce(new Error("UPSTREAM_DOWN"));
    await expect(academyProfile(session)).resolves.toEqual({
      name: "햇살영어학원",
      logoUrl: "https://cdn.example.com/logo.png",
    });
  });

  it("캐시가 없고 upstream도 실패하면 null을 돌려준다", async () => {
    const { academyProfile } = await import("./academy-profile");
    callUpstream.mockClear();
    await clearCache();

    callUpstream.mockRejectedValueOnce(new Error("UPSTREAM_DOWN"));
    await expect(academyProfile(session)).resolves.toBeNull();
  });

  it("응답에 이름이 없으면 캐시를 쓰지 않고 null을 돌려준다", async () => {
    const { academyProfile } = await import("./academy-profile");
    callUpstream.mockClear();

    callUpstream.mockResolvedValueOnce({ uuid: "u-1" });
    await expect(academyProfile(session)).resolves.toBeNull();
  });
});
