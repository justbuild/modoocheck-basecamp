"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsLink() {
  const pathname = usePathname();
  const active = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <Link
      href="/settings"
      aria-label="설정"
      aria-current={active ? "page" : undefined}
      title="설정"
      className={cn(
        "ml-auto grid size-8 shrink-0 place-items-center rounded-lg transition",
        active
          ? "bg-zinc-100 text-zinc-950"
          : "text-muted-foreground hover:bg-zinc-100 hover:text-zinc-950",
      )}
    >
      <Settings className="size-4" />
    </Link>
  );
}
