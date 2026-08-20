"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PendingApprovalItem = {
  request_id: string;
  operation_id: string;
  target_count: number;
  side_effects: string[];
  challenge: string;
  request_digest: string;
  expires_at: string;
  created_at: string;
};

type PendingApprovalsResponse = {
  approvals: PendingApprovalItem[];
};

export type PendingApprovalsConnectionError = {
  cause: string;
  resolution?: string;
};

export function usePendingApprovals(intervalMs = 30000) {
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<PendingApprovalsConnectionError | null>(null);
  const mounted = useRef(false);
  const latestRequest = useRef(0);

  // loading은 첫 조회 완료 시점에만 내려간다. 백그라운드 재조회는 기존 목록을 그대로 유지한다.
  // 조회 실패는 "요청 없음"과 구분해 connectionError로 알린다. 서버가 죽었는데 '요청 없음'으로 보이면 안 된다.
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { cause?: string; resolution?: string } } | null;
        if (mounted.current && request === latestRequest.current) {
          setApprovals([]);
          setConnectionError({
            cause: body?.error?.cause || "승인 요청 목록을 불러오지 못했습니다.",
            resolution: body?.error?.resolution,
          });
        }
        return;
      }
      const body = (await response.json()) as PendingApprovalsResponse;
      if (mounted.current && request === latestRequest.current) {
        setApprovals(Array.isArray(body.approvals) ? body.approvals : []);
        setConnectionError(null);
      }
    } catch {
      if (mounted.current && request === latestRequest.current) {
        setApprovals([]);
        setConnectionError({
          cause: "서버에 연결하지 못했습니다.",
          resolution: "인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.",
        });
      }
    } finally {
      if (mounted.current && request === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const tick = () => void refresh();
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      mounted.current = false;
      latestRequest.current += 1;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [intervalMs, refresh]);

  return { approvals, refresh, loading, connectionError };
}
