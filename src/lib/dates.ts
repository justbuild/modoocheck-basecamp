/** 날짜 관련 공통 도구. 서울(Asia/Seoul) 기준으로 계산한다. */

/** 서울 기준 오늘 날짜(YYYY-MM-DD). */
export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** YYYY-MM-DD에 일수를 더한다. */
export function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD ↔ YYYYMMDD 변환. */
export function compactDate(ymd: string): string {
  return ymd.replaceAll("-", "");
}
export function expandDate(compact: string): string | null {
  if (!/^\d{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/** YYYY-MM-DD를 "2026. 8. 20." 형태로 바꾼다. 형식이 다륵면 null을 돌려준다. */
export function formatYmdDot(ymd: string | null | undefined): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return `${Number(ymd.slice(0, 4))}. ${Number(ymd.slice(5, 7))}. ${Number(ymd.slice(8, 10))}.`;
}

/** "2025-11-05 18:33:03" 같은 날짜시간 문자열에서 날짜 부분(YYYY-MM-DD)만 뽑는다. */
export function ymdFromDateTime(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return value.slice(0, 10);
}
