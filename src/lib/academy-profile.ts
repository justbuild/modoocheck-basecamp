import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { OwnerSession } from "./session";
import { callUpstream } from "./upstream";

/**
 * 사이드바에 보여줄 학원 이름과 로고.
 * 진실의 원천은 모두출첵 Core의 회원정보(/service/user — 공식 웹이 학원명·학원 로고로 사용)이고,
 * 여기서는 화면 표시용 캐시(app_settings)만 둔다. 캐시가 오래됐을 때만 upstream을 다시 부른다.
 */
const CACHE_KEY = "academy-profile";
const CACHE_TTL_MS = 60 * 60 * 1000;

export type AcademyProfile = {
  name: string;
  /** 업로드된 학원 로고(S3 절대 URL). 기본 이미지 같은 상대 경로는 로고로 쓰지 않고 null. */
  logoUrl: string | null;
};

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  profileImageUrl: z.string().max(2048).optional(),
});
const cacheSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().regex(/^https:\/\//).nullable(),
  fetchedAt: z.number(),
});

function readCache(): (AcademyProfile & { fetchedAt: number }) | null {
  const row = getDb().select({ valueJson: appSettings.valueJson }).from(appSettings)
    .where(eq(appSettings.key, CACHE_KEY)).get();
  if (!row) return null;
  const parsed = cacheSchema.safeParse(JSON.parse(row.valueJson));
  return parsed.success ? parsed.data : null;
}

function writeCache(profile: AcademyProfile) {
  const values = {
    valueJson: JSON.stringify({ ...profile, fetchedAt: Date.now() }),
    updatedAt: new Date(),
  };
  getDb().insert(appSettings).values({ key: CACHE_KEY, ...values })
    .onConflictDoUpdate({ target: appSettings.key, set: values }).run();
}

/** 학원 이름·로고를 돌려준다. upstream 실패 시 오래된 캐시라도 쓰고, 캐시마저 없으면 null. */
export async function academyProfile(session: OwnerSession): Promise<AcademyProfile | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { name: cached.name, logoUrl: cached.logoUrl };
  }
  try {
    const raw = profileSchema.parse(await callUpstream(session.ownerToken, {
      method: "GET",
      path: "/service/user",
    }));
    const logoUrl = raw.profileImageUrl && /^https:\/\//.test(raw.profileImageUrl)
      ? raw.profileImageUrl
      : null;
    const profile = { name: raw.name, logoUrl };
    writeCache(profile);
    return profile;
  } catch {
    return cached ? { name: cached.name, logoUrl: cached.logoUrl } : null;
  }
}
