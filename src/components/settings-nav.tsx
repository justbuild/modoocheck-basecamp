"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Info, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/settings/connect", label: "AI 에이전트 등록", icon: KeyRound },
  { href: "/settings/db", label: "데이터 조회", icon: Database },
  { href: "/settings/system", label: "시스템 정보", icon: Info },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="설정 메뉴" className="flex gap-1 overflow-x-auto md:flex-col">
      {sections.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-zinc-100 text-zinc-950"
                : "text-muted-foreground hover:bg-zinc-100/60 hover:text-zinc-950",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
