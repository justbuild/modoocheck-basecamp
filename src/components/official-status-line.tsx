"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { OfficialRunState } from "@/components/use-official-request";

/** 공식 데이터 요청 진행 상태를 한 줄로 보여준다 (남은 승인 시간 포함). */
export function OfficialStatusLine({ state }: { state: OfficialRunState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.phase !== "waiting") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.phase]);

  if (state.phase === "idle" || !state.message) return null;

  const remaining = state.expiresAt ? new Date(state.expiresAt).getTime() - now : null;
  const remainingText = remaining !== null && remaining > 0
    ? ` (남은 시간 ${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")})`
    : "";

  const tone = state.phase === "error" ? "text-destructive" : state.phase === "done" ? "text-emerald-600" : "text-muted-foreground";
  return (
    <div className={`flex items-start gap-2 text-sm ${tone}`} role="status">
      {state.phase === "done" ? <CircleCheck className="mt-0.5 size-4 shrink-0" />
        : state.phase === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" />
        : <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />}
      <span>
        {state.message}
        {state.phase === "waiting" ? remainingText : null}
        {state.detail ? <span className="block text-xs opacity-80">{state.detail}</span> : null}
      </span>
    </div>
  );
}
