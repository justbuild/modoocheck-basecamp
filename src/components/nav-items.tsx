"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCheck, Home, KeyRound, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/connect", label: "모두출첵 로그인", icon: KeyRound },
  { href: "/approvals", label: "AI 작업 승인", icon: CheckCheck },
  { href: "/settings", label: "설정", icon: Settings },
];

export function NavItems() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-muted-foreground hover:bg-zinc-100 hover:text-zinc-950",
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
