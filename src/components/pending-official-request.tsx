"use client";

import { useEffect, useRef } from "react";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

type PendingView = {
  requestId: string;
  operation: string;
  status: string;
  nextAction: string | null;
  expiresAt: string;
};

/**
 * 페이지를 새로 열었을 때 아직 끝나지 않은 승인 대기 요청을 이어서 추적한다.
 * 승인되면 자동으로 실행하고 화면을 새로고침한다.
 */
export function PendingOfficialRequest({ view, label }: { view: PendingView; label: string }) {
  const { state, resume } = useOfficialRequest();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void resume({ ...view, nextAction: view.nextAction });
  }, [resume, view]);

  return (
    <div className="rounded-xl border bg-amber-50/50 p-4">
      <p className="mb-2 text-sm font-medium">{label} 요청이 진행 중입니다</p>
      <OfficialStatusLine state={state} />
    </div>
  );
}
