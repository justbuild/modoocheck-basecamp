import type { MonthlyCount } from "@/lib/student-trend";

/** 월간 등록 학생 수 막대그래프. 외부 차트 라이브러리 없이 CSS만으로 그린다. */
export function StudentTrendChart({ trend }: { trend: MonthlyCount[] }) {
  const max = Math.max(1, ...trend.map((month) => month.count));
  return (
    <div className="flex h-44 items-end gap-1.5 sm:gap-2.5" role="img" aria-label="월간 등록 학생 수 그래프">
      {trend.map((month) => (
        <div
          key={month.month}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 self-stretch"
          title={`${month.month} 등록 학생 ${month.count}명`}
        >
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{month.count}</span>
          <div
            className={`w-full rounded-t-md ${month.count > 0 ? "bg-zinc-900" : "bg-zinc-200"}`}
            style={{ height: `${month.count > 0 ? Math.max(8, Math.round((month.count / max) * 120)) : 3}px` }}
          />
          <span className="text-[10px] tabular-nums text-muted-foreground">{month.label}</span>
        </div>
      ))}
    </div>
  );
}
