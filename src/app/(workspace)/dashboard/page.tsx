import Link from "next/link";
import { desc } from "drizzle-orm";
import { ArrowRight, Bot, CheckCheck, Database, KeyRound, Radio } from "lucide-react";
import { getDb } from "@/db";
import { localAudit } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { agentHealth } from "@/lib/agent-api";

export const metadata = { title: "대시보드" };

export default async function DashboardPage() {
  const health = await agentHealth().catch(() => null);
  const events = getDb().select().from(localAudit).orderBy(desc(localAudit.id)).limit(5).all();
  const ready = health?.upstream.ready === true;

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">BASECAMP OVERVIEW</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">대시보드</h1><p className="mt-2 text-muted-foreground">모두출첵 연결 상태와 로컬 시스템 활동을 확인하세요.</p></header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Agent API</CardDescription><CardTitle className="flex items-center gap-2 text-lg"><Radio className="size-4" />{ready ? "정상 연결" : "확인 필요"}</CardTitle></CardHeader><CardContent><Badge variant={ready ? "default" : "destructive"}>{ready ? "upstream ready" : "degraded"}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>로컬 데이터베이스</CardDescription><CardTitle className="flex items-center gap-2 text-lg"><Database className="size-4" />SQLite 연결됨</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">세션·설정·로컬 감사 저장소</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>보안 경계</CardDescription><CardTitle className="flex items-center gap-2 text-lg"><Bot className="size-4" />BFF 활성화</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">브라우저는 Basecamp API만 호출</p></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/connect" className="group"><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><KeyRound className="size-5" /><CardTitle className="flex items-center justify-between">모두출첵 로그인 <ArrowRight className="size-4 transition group-hover:translate-x-1" /></CardTitle><CardDescription>AI 에이전트에 전달할 일회용 등록 코드를 발급합니다.</CardDescription></CardHeader></Card></Link>
        <Link href="/approvals" className="group"><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><CheckCheck className="size-5" /><CardTitle className="flex items-center justify-between">AI 작업 승인 <ArrowRight className="size-4 transition group-hover:translate-x-1" /></CardTitle><CardDescription>알림 링크로 도착한 민감 작업을 검토하고 결정합니다.</CardDescription></CardHeader></Card></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>최근 로컬 활동</CardTitle><CardDescription>비밀값을 제외한 Basecamp 자체 감사 기록입니다.</CardDescription></CardHeader>
        <CardContent>
          {events.length ? <div className="divide-y">{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{event.eventType}</p><p className="text-xs text-muted-foreground">{event.actorAccount || "system"}{event.requestId ? ` · ${event.requestId}` : ""}</p></div><time className="shrink-0 text-xs text-muted-foreground">{event.createdAt.toLocaleString("ko-KR")}</time></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">아직 기록된 활동이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
