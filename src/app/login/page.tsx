import { redirect } from "next/navigation";
import { Bot, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { currentOwnerSession } from "@/lib/session";

export const metadata = { title: "로그인" };

export default async function LoginPage() {
  if (await currentOwnerSession()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-zinc-950">M</span>
          모두출첵 베이스캠프
        </div>
        <div className="max-w-xl space-y-7">
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-400">AI-NATIVE ACADEMY OS</p>
            <h1 className="text-4xl font-semibold tracking-tight">학원장과 AI가 함께 만드는<br />자체 관리시스템의 출발점</h1>
            <p className="text-zinc-400">모두출첵 Agent API와 안전하게 연결하고, 로컬 데이터와 업무 화면을 원하는 방식으로 확장하세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              [ShieldCheck, "승인 기반 변경"], [Database, "자체 로컬 DB"],
              [Bot, "AI 확장 구조"], [CheckCircle2, "감사 가능한 실행"],
            ].map(([Icon, label]) => (
              <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <Icon className="size-4 text-zinc-400" />{String(label)}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">비밀번호는 저장하지 않습니다. 원장 세션은 암호화된 서버 저장소에만 보관됩니다.</p>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 p-6 sm:p-12">
        <div className="flex items-center gap-3 font-semibold lg:hidden">
          <span className="grid size-10 place-items-center rounded-xl bg-zinc-950 text-white">M</span>
          <div><p>모두출첵 베이스캠프</p><p className="text-xs font-normal text-muted-foreground">AI 학원 관리시스템</p></div>
        </div>
        <Card className="w-full max-w-md border-zinc-200 shadow-xl shadow-zinc-200/40">
          <CardHeader>
            <CardTitle className="text-2xl">원장 로그인</CardTitle>
            <CardDescription>모두출첵 원장 계정으로 베이스캠프에 연결합니다.</CardDescription>
          </CardHeader>
          <CardContent><LoginForm /></CardContent>
        </Card>
      </section>
    </main>
  );
}
