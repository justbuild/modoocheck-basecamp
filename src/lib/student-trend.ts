import { z } from "zod";

/**
 * 월간 등록 학생 수 집계.
 * 학생 목록의 등록일(createdAt)을 기준으로 최근 N개월 각 월말 시점의
 * 누적 등록 학생 수를 만든다.
 */
const studentRowSchema = z.object({
  createdAt: z.string().optional(),
  createdAtMs: z.number().nullish(),
}).loose();
export type MonthlyCount = {
  month: string; // YYYY-MM
  label: string; // N월
  count: number;
};

/** YYYY-MM에 개월 수를 더한다. */
export function addMonths(month: string, months: number): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1 + months;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return date.toISOString().slice(0, 7);
}

/** 학생 행에서 등록 연월(YYYY-MM)을 뽑는다. 알 수 없으면 null. */
function createdMonth(row: z.infer<typeof studentRowSchema>): string | null {
  if (row.createdAt && /^\d{4}-\d{2}-\d{2}/.test(row.createdAt)) {
    return row.createdAt.slice(0, 7);
  }
  if (typeof row.createdAtMs === "number" && Number.isFinite(row.createdAtMs)) {
    return new Date(row.createdAtMs).toISOString().slice(0, 7);
  }
  return null;
}

/**
 * 학생 목록 응답을 최근 months개월의 월말 누적 등록 학생 수로 변환한다.
 * 등록일을 알 수 없는 학생은 가장 오래된 월 이전부터 있던 것으로 센다.
 */
export function buildMonthlyTrend(data: unknown, todayYmd: string, months = 12): MonthlyCount[] {
  const currentMonth = todayYmd.slice(0, 7);
  const firstMonth = addMonths(currentMonth, -(months - 1));
  const createdMonths: (string | null)[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      const parsed = studentRowSchema.safeParse(item);
      if (!parsed.success) continue;
      createdMonths.push(createdMonth(parsed.data));
    }
  }
  const trend: MonthlyCount[] = [];
  for (let offset = 0; offset < months; offset += 1) {
    const month = addMonths(firstMonth, offset);
    trend.push({
      month,
      label: `${Number(month.slice(5, 7))}월`,
      // 연월 문자열(YYYY-MM)은 사전식 비교가 시간 순서와 같다.
      count: createdMonths.filter((created) => created === null || created <= month).length,
    });
  }
  return trend;
}
