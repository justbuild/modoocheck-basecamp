import { GraduationCap, UserRound } from "lucide-react";
import { ApprovalsLink } from "@/components/approvals-link";
import { Separator } from "@/components/ui/separator";
import { NavItems } from "@/components/nav-items";
import { SIDE_PANEL_HOST_ID } from "@/components/right-side-panel";
import { SettingsLink } from "@/components/settings-link";
import type { AcademyProfile } from "@/lib/academy-profile";

export function AppShell({ account, academy, children }: { account: string; academy: AcademyProfile | null; children: React.ReactNode }) {
  const academyName = academy?.name ?? null;
  return (
    <div className="min-h-screen bg-zinc-50 md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b bg-white md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          {academy?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element -- 외부(S3) 로고라 next/image 설정 없이 단순 표시한다
            ? <img src={academy.logoUrl} alt={`${academy.name} 로고`} className="size-9 shrink-0 rounded-xl border border-zinc-200 bg-white object-cover" />
            : academyName
              ? <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-950 text-sm font-bold text-white">{academyName.trim().charAt(0)}</span>
              : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white"><GraduationCap className="size-4" /></span>}
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{academyName ?? "모두출첵 베이스캠프"}</p><p className="text-xs text-muted-foreground">AI 학원 관리시스템</p></div>
        </div>
        <Separator />
        <div className="p-3 pb-0">
          <ApprovalsLink />
        </div>
        <NavItems />
        <div className="p-3 md:absolute md:inset-x-0 md:bottom-0">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-700"><UserRound className="size-4" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{account}</p><p className="text-xs text-muted-foreground">원장 계정</p></div>
            <SettingsLink />
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 overflow-x-clip">
        <div className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-5xl">{children}</div></div>
        {/* Right-panel docking host. It must stay in the layout even while empty: a
            display:none parent has no style to transition from, which cancels the
            panel's enter animation. */}
        <div id={SIDE_PANEL_HOST_ID} className="sticky top-0 flex h-screen flex-none" />
      </main>
    </div>
  );
}
