"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { OfficialRunState } from "@/components/use-official-request";

/** 공식 데이터 작업 진행 상태를 한 줄로 보여준다. */
export function OfficialStatusLine({ state }: { state: OfficialRunState }) {
  if (state.phase === "idle" || !state.message) return null;

  const tone = state.phase === "error" ? "text-destructive" : state.phase === "done" ? "text-emerald-600" : "text-muted-foreground";
  return (
    <div className={`flex items-start gap-2 text-sm ${tone}`} role="status">
      {state.phase === "done" ? <CircleCheck className="mt-0.5 size-4 shrink-0" />
        : state.phase === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" />
        : <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />}
      <span>
        {state.message}
        {state.detail ? <span className="block text-xs opacity-80">{state.detail}</span> : null}
      </span>
    </div>
  );
}
