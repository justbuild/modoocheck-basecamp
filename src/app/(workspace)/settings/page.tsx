import { Database, Link2, LockKeyhole, Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runtimeConfig } from "@/lib/env";

export const metadata = { title: "설정" };

export default function SettingsPage() {
  const config = runtimeConfig();
  const items = [
    { icon: Link2, title: "Agent API", value: config.agentApiBase, desc: "Basecamp 서버가 호출하는 유일한 외부 API" },
    { icon: Database, title: "로컬 데이터베이스", value: config.databasePath, desc: "세션·설정·로컬 감사와 확장 데이터를 저장" },
    { icon: LockKeyhole, title: "원장 세션", value: "AES-256-GCM + HttpOnly session id", desc: "원장 토큰은 암호화되어 서버 DB에만 저장" },
    { icon: Waypoints, title: "호출 경계", value: "Browser → Basecamp BFF → Agent API → Upstream", desc: "브라우저는 upstream이나 Agent API를 직접 호출하지 않음" },
  ];
  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">BASECAMP SETTINGS</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">설정</h1><p className="mt-2 text-muted-foreground">현재 런타임 연결과 보안 경계를 확인합니다.</p></header>
      <div className="grid gap-4 md:grid-cols-2">{items.map(({ icon: Icon, title, value, desc }) => <Card key={title}><CardHeader><div className="flex items-center justify-between"><Icon className="size-5" /><Badge variant="secondary">활성</Badge></div><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader><CardContent><code className="block break-all rounded-lg bg-zinc-100 p-3 text-xs">{value}</code></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>확장 원칙</CardTitle><CardDescription>자체 관리 기능을 추가할 때 유지해야 할 데이터 경계입니다.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>• 상담 기록, 커스텀 태그, 자동화 규칙은 Basecamp 로컬 DB에 저장합니다.</p><p>• 공식 학생·출결·원비·공지는 Agent API로 조회하고 승인된 요청으로만 변경합니다.</p><p>• 모두출첵 Core 데이터를 복제해 Basecamp를 진실의 원천으로 만들지 않습니다.</p></CardContent></Card>
    </div>
  );
}
