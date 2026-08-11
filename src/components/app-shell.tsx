import Link from "next/link";
import { Bot, CheckCheck, Home, KeyRound, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/connect", label: "모두출첵 로그인", icon: KeyRound },
  { href: "/approvals", label: "AI 작업 승인", icon: CheckCheck },
  { href: "/settings", label: "설정", icon: Settings },
];

export function AppShell({ account, children }: { account: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b bg-white md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 font-bold text-white">M</span>
          <div><p className="text-sm font-semibold">모두출첵 베이스캠프</p><p className="text-xs text-muted-foreground">AI 학원 관리시스템</p></div>
        </div>
        <Separator />
        <nav className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-zinc-100 hover:text-zinc-950">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="p-3 md:absolute md:inset-x-0 md:bottom-0">
          <Separator className="mb-3" />
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Bot className="size-4" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{account}</p><p className="text-xs text-emerald-700">원장 세션 연결됨</p></div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-5xl">{children}</div></main>
    </div>
  );
}
