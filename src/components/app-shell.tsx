import { Bot } from "lucide-react";
import { ApprovalsLink } from "@/components/approvals-link";
import { Separator } from "@/components/ui/separator";
import { NavItems } from "@/components/nav-items";
import { SettingsLink } from "@/components/settings-link";

export function AppShell({ account, children }: { account: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b bg-white md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 font-bold text-white">M</span>
          <div><p className="text-sm font-semibold">모두출첵 베이스캠프</p><p className="text-xs text-muted-foreground">AI 학원 관리시스템</p></div>
        </div>
        <Separator />
        <div className="p-3 pb-0">
          <ApprovalsLink />
        </div>
        <NavItems />
        <div className="p-3 md:absolute md:inset-x-0 md:bottom-0">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Bot className="size-4" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{account}</p><p className="text-xs text-emerald-700">로그인됨</p></div>
            <SettingsLink />
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-5xl">{children}</div></main>
    </div>
  );
}
