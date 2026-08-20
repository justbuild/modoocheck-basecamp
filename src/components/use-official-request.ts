"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 원장이 화면에서 직접 실행하는 공식 모두출첵 작업(조회/변경)을 보내는 훅.
 * 원장 본인의 조작은 승인 절차가 없으므로 요청 한 번으로 즉시 실행된다.
 */
export type OfficialRunPhase = "idle" | "running" | "done" | "error";

export type OfficialLoad = {
  operation: string;
  request?: Record<string, unknown>;
};

export type OfficialRunState = {
  phase: OfficialRunPhase;
  message?: string;
  detail?: string;
};

export function useOfficialRequest() {
  const router = useRouter();
  const [state, setState] = useState<OfficialRunState>({ phase: "idle" });

  const runAll = useCallback(async (loads: OfficialLoad[]) => {
    setState({ phase: "running", message: "처리 중입니다…" });
    try {
      for (const load of loads) {
        const response = await fetch("/api/official/requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operation: load.operation, request: load.request ?? {} }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setState({ phase: "error", message: body?.error?.cause || "요청을 처리하지 못했습니다.", detail: body?.error?.resolution });
          return "ERROR";
        }
      }
      setState({ phase: "done", message: "완료되었습니다." });
      router.refresh();
      return "EXECUTED";
    } catch {
      setState({ phase: "error", message: "서버에 연결하지 못했습니다." });
      return "ERROR";
    }
  }, [router]);

  const run = useCallback(async (operation: string, request: Record<string, unknown> = {}) => {
    return runAll([{ operation, request }]);
  }, [runAll]);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, runAll, reset, busy: state.phase === "running" };
}
