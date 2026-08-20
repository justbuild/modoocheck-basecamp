import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { getDb } from "@/db";
import { localAudit } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentTrendChart } from "@/components/student-trend-chart";
import { buildMonthlyTrend, type MonthlyCount } from "@/lib/student-trend";
import { seoulToday } from "@/lib/dates";
import { currentOwnerSession } from "@/lib/session";
import { callUpstream } from "@/lib/upstream";

export const metadata = { title: "대시보드" };

const onboardingSteps = [
  "아래 버튼을 눌러 등록 코드를 발급합니다",
  "대화 중인 AI 도우미에게 코드를 붙여넣습니다",
  "AI가 스스로 연결을 마치면 준비 완료입니다",
];

export default async function DashboardPage() {
  const hasIssuedCode = getDb()
    .select({ id: localAudit.id })
    .from(localAudit)
    .where(eq(localAudit.eventType, "ENROLLMENT_CODE_ISSUED"))
    .limit(1)
    .get() !== undefined;

  const session = await currentOwnerSession();
  let trend: MonthlyCount[] | null = null;
  if (session) {
    try {
      const data = await callUpstream(session.ownerToken, {
        method: "GET",
        path: "/service/students/view/plain",
      });
      trend = buildMonthlyTrend(data, seoulToday(), 12);
    } catch {
      trend = null;
    }
  }

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">BASECAMP OVERVIEW</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">대시보드</h1><p className="mt-2 text-muted-foreground">우리 학원 현황을 한눈에 확인하세요.</p></header>
      {!hasIssuedCode && (
        <Card className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-white">
          <CardContent className="space-y-6 py-2">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold">아직 AI 도우미가 연결되지 않았어요</p>
                <p className="mt-1 text-sm text-muted-foreground">AI 도우미가 학원 일을 도우려면 딱 한 번, 등록 코드를 전달해 연결해야 합니다. 3분이면 충분해요.</p>
              </div>
            </div>
            <ol className="grid gap-3 md:grid-cols-3">
              {onboardingSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-white/70 p-3.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">{index + 1}</span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
            <div>
              <Link href="/settings/connect" className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-md shadow-zinc-950/10 transition hover:bg-zinc-800">
                지금 연결하기
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">월간 학생 수 추이</CardTitle>
          <CardDescription>최근 12개월 동안 시스템에 등록된 학생 수입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {trend ? (
            <StudentTrendChart trend={trend} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">학생 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-4 py-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold">원하는 대시보드를 AI에게 요청해 보세요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              “이번 달 신규 등록 학생 수를 보여줘”, “그룹별 출석률을 비교해줘”처럼 말하면 AI가 이 화면에 새로운 지표를 만들어 줍니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
