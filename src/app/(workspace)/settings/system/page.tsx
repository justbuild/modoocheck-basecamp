import { Database, Link2, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runtimeConfig } from "@/lib/env";

export const metadata = { title: "시스템 정보" };

export default function SystemSettingsPage() {
  const config = runtimeConfig();
  const items = [
    { icon: Link2, title: "모두출첵 연결 주소", value: config.agentApiBase, desc: "베이스캠프가 모두출첵과 통신할 때 사용하는 주소" },
    { icon: Database, title: "데이터 저장 위치", value: config.databasePath, desc: "우리 학원 데이터가 저장되는 이 컴퓨터의 파일" },
    { icon: LockKeyhole, title: "로그인 보안", value: "암호화되어 안전하게 보관", desc: "비밀번호는 저장하지 않고, 로그인 정보는 암호화해 서버에만 둡니다" },
  ];
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold tracking-tight">연결과 보관 상태</h2><p className="mt-1 text-sm text-muted-foreground">베이스캠프의 연결과 데이터 보관 상태를 확인합니다.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">{items.map(({ icon: Icon, title, value, desc }) => <Card key={title}><CardHeader><div className="flex items-center justify-between"><Icon className="size-5" /><Badge variant="secondary">정상</Badge></div><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader><CardContent><code className="block break-all rounded-lg bg-zinc-100 p-3 text-xs">{value}</code></CardContent></Card>)}</div>
      </section>
      <Card><CardHeader><CardTitle>데이터 관리 원칙</CardTitle><CardDescription>베이스캠프가 우리 학원 데이터를 다루는 방식입니다.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>• 상담 기록이나 메모처럼 우리 학원만의 데이터는 이 컴퓨터에 저장됩니다.</p><p>• 학생·출결·원비·공지는 모두출첵에서 가져오며, 변경은 원장 승인을 거친 뒤에만 반영됩니다.</p><p>• 모두출첵의 원본 데이터를 복사해 따로 관리하지 않아 항상 최신 정보를 보게 됩니다.</p></CardContent></Card>
    </div>
  );
}
