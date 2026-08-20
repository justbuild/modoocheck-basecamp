"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

/**
 * 공식 목록 동기화 버튼. 조회도 원장 승인이 필요한 보안 구조이므로,
 * 누르면 조회 요청을 만들고 승인·실행까지 진행 상황을 보여준다.
 */
export function OfficialSyncButton({ operation, label }: { operation: string; label: string }) {
  const { state, run, busy } = useOfficialRequest();
  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => run(operation)} disabled={busy}>
        <RefreshCw className={busy ? "animate-spin" : ""} />
        {label}
      </Button>
      <OfficialStatusLine state={state} />
    </div>
  );
}
