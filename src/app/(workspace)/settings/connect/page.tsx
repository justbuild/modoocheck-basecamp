import { EnrollmentCodeCard } from "@/components/enrollment-code-card";

export const metadata = { title: "AI 에이전트 등록" };

export default function ConnectSettingsPage() {
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold tracking-tight">AI 에이전트 등록</h2><p className="mt-1 text-sm text-muted-foreground">AI 도우미가 원장님 대신 모두출첵을 사용할 수 있도록 안전하게 연결합니다.</p></div>
      <EnrollmentCodeCard />
      <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
        {[['1', '코드 발급', '5분 동안만 쓸 수 있는 일회용 코드를 만듭니다.'], ['2', 'AI에게 전달', '대화 중인 AI 도우미에게 코드만 알려 주세요.'], ['3', '연결 완료', 'AI가 코드를 사용해 모두출첵에 안전하게 연결됩니다.']].map(([number, title, text]) => <div key={number} className="rounded-xl border bg-white p-4"><span className="mb-3 grid size-7 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">{number}</span><p className="font-medium text-zinc-950">{title}</p><p className="mt-1 text-xs">{text}</p></div>)}
      </div>
    </div>
  );
}
