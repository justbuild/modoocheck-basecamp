"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { usePendingApprovals } from "@/lib/pending-approval";

export function ApprovalsLink() {
  const { approvals } = usePendingApprovals(30000);
  const pending = approvals.length > 0;

  return (
    <Link
      href="/approvals"
      aria-label={pending ? "AI 작업 승인 (검토할 요청 있음)" : "AI 작업 승인"}
      className="relative flex items-center gap-3 rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-zinc-950/10 transition hover:bg-zinc-800"
    >
      <ShieldCheck className="size-4" />
      AI 작업 승인
      {pending && (
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-red-500 ring-2 ring-white" />
        </span>
      )}
    </Link>
  );
}
