import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, Bot, CheckCheck, KeyRound } from "lucide-react";
import { getDb } from "@/db";
import { localAudit } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { agentHealth } from "@/lib/agent-api";

export const metadata = { title: "대시보드" };

const onboardingSteps = [
  "아래 버튼을 눌러 등록 코드를 발급합니다",
  "대화 중인 AI 도우미에게 코드를 붙여넣습니다",
  "AI가 스스로 연결을 마치면 준비 완료입니다",
];

export default async function DashboardPage() {
  const health = await agentHealth().catch(() => null);
  const ready = health?.upstream.ready === true;
  const hasIssuedCode = getDb()
    .select({ id: localAudit.id })
    .from(localAudit)
    .where(eq(localAudit.eventType, "ENROLLMENT_CODE_ISSUED"))
    .limit(1)
    .get() !== undefined;

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">BASECAMP OVERVIEW</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">대시보드</h1><p className="mt-2 text-muted-foreground">모두출첵 연결 상태를 확인하고 자주 쓰는 기능으로 이동하세요.</p></header>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>모두출첵 연결</CardDescription>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="relative flex size-2.5">
                {ready && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex size-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              {ready ? "정상 연결" : "확인 필요"}
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{ready ? "지금 바로 사용할 수 있어요" : "잠시 후 다시 확인해 주세요"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>우리 학원 데이터</CardDescription>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="relative flex size-2.5"><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>
              안전하게 보관 중
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">학원 데이터는 이 컴퓨터에만 저장됩니다.</p></CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/connect" className="group"><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><KeyRound className="size-5" /><CardTitle className="flex items-center justify-between">AI 에이전트 등록 <ArrowRight className="size-4 transition group-hover:translate-x-1" /></CardTitle><CardDescription>AI 도우미에게 전달할 일회용 연결 코드를 발급합니다.</CardDescription></CardHeader></Card></Link>
        <Link href="/approvals" className="group"><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><CheckCheck className="size-5" /><CardTitle className="flex items-center justify-between">AI 작업 승인 <ArrowRight className="size-4 transition group-hover:translate-x-1" /></CardTitle><CardDescription>AI가 요청한 중요한 작업을 확인하고 승인 여부를 결정합니다.</CardDescription></CardHeader></Card></Link>
      </div>
    </div>
  );
}
