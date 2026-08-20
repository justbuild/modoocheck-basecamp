"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 공식 모두출첵 데이터 요청의 전체 생명주기(생성 → 원장 승인 대기 → 실행)를
 * 클라이언트에서 따라가는 훅. 3초마다 진행 상태를 확인한다.
 */
export type OfficialRunPhase = "idle" | "creating" | "waiting" | "done" | "error";

export type OfficialRunState = {
  phase: OfficialRunPhase;
  message?: string;
  detail?: string;
  requestId?: string;
  expiresAt?: string;
};

type RequestView = {
  requestId: string;
  status: string;
  notification?: "SENT" | "FAILED";
  nextAction: string | null;
  expiresAt: string;
  errorCause?: string;
};

const POLL_MS = 3000;

function terminalMessage(view: RequestView): { message: string; detail?: string } | null {
  switch (view.status) {
    case "EXECUTED":
      return { message: "완료되었습니다." };
    case "REJECTED":
      return { message: "원장님이 요청을 거절했습니다." };
    case "EXPIRED":
      return { message: "승인 시간이 지나 요청이 만료되었습니다. 다시 시도해 주세요." };
    case "FAILED":
      return { message: "모두출첵이 요청을 반영하지 않았습니다.", detail: view.errorCause };
    case "UNKNOWN":
      return {
        message: "결과를 확인할 수 없습니다. 같은 요청을 다시 보내지 말고 모두출첵에서 직접 확인해 주세요.",
        detail: view.nextAction || undefined,
      };
    default:
      return null;
  }
}

export function useOfficialRequest() {
  const router = useRouter();
  const [state, setState] = useState<OfficialRunState>({ phase: "idle" });
  const stopped = useRef(false);

  useEffect(() => () => {
    stopped.current = true;
  }, []);

  const follow = useCallback(async (view: RequestView) => {
    const waitingMessage = view.notification === "FAILED"
      ? "승인 알림을 보내지 못했습니다. 모두출첵 알림이 오지 않으면 이 요청은 5분 뒤 자동 만료됩니다."
      : "원장 승인 대기 중 — 모두출첵 알림으로 받은 승인 링크에서 요청을 확인하고 승인해 주세요.";
    setState({ phase: "waiting", message: waitingMessage, requestId: view.requestId, expiresAt: view.expiresAt });

    let current = view;
    while (!stopped.current) {
      const terminal = terminalMessage(current);
      if (terminal) {
        if (current.status === "EXECUTED") {
          setState({ phase: "done", ...terminal, requestId: current.requestId });
          router.refresh();
        } else {
          setState({ phase: "error", ...terminal, requestId: current.requestId });
        }
        return current.status;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (stopped.current) return current.status;
      const response = await fetch(`/api/official/requests/${encodeURIComponent(current.requestId)}/advance`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setState({ phase: "error", message: body?.error?.cause || "진행 상태를 확인하지 못했습니다.", requestId: current.requestId });
        return "ERROR";
      }
      current = body as RequestView;
    }
    return current.status;
  }, [router]);

  const run = useCallback(async (operation: string, request: Record<string, unknown> = {}) => {
    setState({ phase: "creating", message: "요청을 만드는 중입니다…" });
    try {
      const response = await fetch("/api/official/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, request }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setState({ phase: "error", message: body?.error?.cause || "요청을 만들지 못했습니다.", detail: body?.error?.resolution });
        return "ERROR";
      }
      return await follow(body as RequestView);
    } catch {
      setState({ phase: "error", message: "서버에 연결하지 못했습니다." });
      return "ERROR";
    }
  }, [follow]);

  const resume = useCallback((view: RequestView) => follow(view), [follow]);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, resume, reset, busy: state.phase === "creating" || state.phase === "waiting" };
}
