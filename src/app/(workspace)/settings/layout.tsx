import { SettingsNav } from "@/components/settings-nav";
import { LogoutButton } from "@/components/logout-button";
import { Separator } from "@/components/ui/separator";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">BASECAMP SETTINGS</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">설정</h1>
        <p className="mt-2 text-muted-foreground">AI 도우미 연결과 베이스캠프 상태를 관리합니다.</p>
      </header>
      <div className="gap-8 md:grid md:grid-cols-[200px_1fr]">
        <aside className="mb-6 md:sticky md:top-8 md:mb-0 md:self-start">
          <SettingsNav />
          <Separator className="my-3" />
          <LogoutButton />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
