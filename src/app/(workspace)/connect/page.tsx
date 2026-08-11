import { EnrollmentCodeCard } from "@/components/enrollment-code-card";

export const metadata = { title: "모두출첵 로그인" };

export default function ConnectPage() {
  return (
    <div className="space-y-8">
      <header><p className="text-sm font-medium text-muted-foreground">AGENT ENROLLMENT</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">모두출첵 로그인</h1><p className="mt-2 text-muted-foreground">원장 권한으로 AI 에이전트를 모두출첵에 안전하게 연결합니다.</p></header>
      <EnrollmentCodeCard />
      <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
        {[['1', '코드 발급', '원장 세션으로 5분짜리 일회용 코드를 만듭니다.'], ['2', 'AI에게 전달', '현재 대화 중인 AI 에이전트에게 코드만 전달합니다.'], ['3', '자동 등록', 'AI가 Agent API에 등록하고 고정 scope를 발급받습니다.']].map(([number, title, text]) => <div key={number} className="rounded-xl border bg-white p-4"><span className="mb-3 grid size-7 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">{number}</span><p className="font-medium text-zinc-950">{title}</p><p className="mt-1 text-xs">{text}</p></div>)}
      </div>
    </div>
  );
}
