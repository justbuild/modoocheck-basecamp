import { describe, expect, it } from "vitest";
import { addMonths, buildMonthlyTrend } from "./student-trend";
import { seoulToday } from "./dates";

describe("addMonths", () => {
  it("연 경계를 넘는 개월 계산이 맞다", () => {
    expect(addMonths("2026-08", -11)).toBe("2025-09");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2025-12", 1)).toBe("2026-01");
  });
});

describe("seoulToday", () => {
  it("서울 기준 오늘을 돌려준다", () => {
    // UTC 2026-08-19 16:00 = 서울 2026-08-20 01:00
    expect(seoulToday(new Date("2026-08-19T16:00:00Z"))).toBe("2026-08-20");
    expect(seoulToday(new Date("2026-08-19T14:59:59Z"))).toBe("2026-08-19");
  });
});

describe("buildMonthlyTrend", () => {
  const today = "2026-08-20";

  it("각 월말 시점의 누적 등록 학생 수를 만든다", () => {
    const data = [
      { createdAt: "2025-11-05 18:33:03" },
      { createdAt: "2026-01-15 09:00:00" },
      { createdAt: "2026-01-20 09:00:00" },
      { createdAt: "2026-08-01 09:00:00" },
    ];
    const trend = buildMonthlyTrend(data, today, 12);
    expect(trend).toHaveLength(12);
    expect(trend[0]).toMatchObject({ month: "2025-09", label: "9월", count: 0 });
    expect(trend.find((m) => m.month === "2025-11")?.count).toBe(1);
    expect(trend.find((m) => m.month === "2026-01")?.count).toBe(3);
    expect(trend[11]).toMatchObject({ month: "2026-08", label: "8월", count: 4 });
  });

  it("createdAt이 없으면 createdAtMs를 쓰고, 둘 다 없으면 처음부터 있던 것으로 센다", () => {
    const data = [
      { createdAtMs: Date.UTC(2026, 6, 10) }, // 2026-07
      { name: "등록일 없음" },
    ];
    const trend = buildMonthlyTrend(data, today, 2);
    expect(trend.map((m) => m.count)).toEqual([2, 2]);
  });

  it("깨진 행은 걸러내고, 등록일을 알 수 없는 학생은 처음부터 있던 것으로 센다", () => {
    expect(buildMonthlyTrend(null, today, 2).map((m) => m.count)).toEqual([0, 0]);
    // "문자열"은 행 자체가 깨져서 제외, createdAt이 이상한 행은 등록일 미상으로 간주
    expect(buildMonthlyTrend(["문자열", { createdAt: "이상함" }], today, 2).map((m) => m.count)).toEqual([1, 1]);
  });
});
