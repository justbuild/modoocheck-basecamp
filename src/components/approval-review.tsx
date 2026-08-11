"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, CircleAlert, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { setPendingApproval } from "@/lib/pending-approval";

interface ApprovalRequest {
  requestId: string; locator: string; csrf: string; challenge: string; digest: string;
  operation: string; targetCount: string; sideEffects: string; expiresAt: string;
}

function readApproval(hash: string): ApprovalRequest | null {
  const params = new URLSearchParams(hash.slice(1));
  const request = {
    requestId: params.get("request_id") || "", locator: params.get("locator") || "",
    csrf: params.get("csrf") || "", challenge: params.get("challenge") || "",
    digest: params.get("digest") || "", operation: params.get("operation") || "(미상)",
    targetCount: params.get("target_count") || "(미상)", sideEffects: params.get("side_effects") || "없음",
    expiresAt: params.get("expires_at") || "",
  };
  return request.requestId && request.locator && request.csrf && request.challenge && request.digest ? request : null;
}

const HASH_EVENT = "basecamp:hashchange";

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener(HASH_EVENT, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(HASH_EVENT, callback);
  };
}
function getHash() { return window.location.hash; }
function getServerHash() { return ""; }

function clearHash() {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  window.dispatchEvent(new Event(HASH_EVENT));
}

export function ApprovalReview() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const request = useMemo(() => readApproval(hash), [hash]);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [result, setResult] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = useMemo(() => request?.expiresAt && now ? new Date(request.expiresAt).getTime() - now : Number.POSITIVE_INFINITY, [request, now]);
  const expired = remaining <= 0;

  useEffect(() => {
    setPendingApproval(request && !expired && !result ? request.requestId : null);
    return () => setPendingApproval(null);
  }, [request, expired, result]);

  async function decide(decision: "APPROVE" | "REJECT") {
    if (!request) return;
    setBusy(decision); setError(null);
    try {
      const response = await fetch(`/api/approvals/${encodeURIComponent(request.requestId)}/decision`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ locator: request.locator, csrf: request.csrf, challenge: request.challenge, digest: request.digest, decision }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.cause || "결정을 제출하지 못했습니다.");
      setResult(body.status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "결정을 제출하지 못했습니다.");
    } finally { setBusy(null); }
  }

  function close() {
    clearHash();
    setResult(null);
    setError(null);
  }

  if (!request) return <Card><CardContent className="py-16 text-center"><CircleAlert className="mx-auto mb-4 size-9 text-muted-foreground" /><p className="font-medium">열린 승인 요청이 없습니다</p><p className="mt-2 text-sm text-muted-foreground">원장 알림 채널로 받은 승인 링크를 열으면 요청 내용이 여기에 표시됩니다.</p></CardContent></Card>;

  const remainingText = Number.isFinite(remaining) ? `${Math.max(0, Math.floor(remaining / 60000))}:${String(Math.max(0, Math.floor((remaining % 60000) / 1000))).padStart(2, "0")}` : "만료 시각 없음";
  return (
    <div className="space-y-4">
      {result && <Alert><ShieldCheck /><AlertTitle>{result === "APPROVED" ? "승인 완료" : "거절 완료"}</AlertTitle><AlertDescription>{result === "APPROVED" ? "AI 에이전트가 승인된 요청을 한 번만 실행합니다." : "이 요청은 실행되지 않습니다."}</AlertDescription></Alert>}
      {error && <Alert variant="destructive"><AlertTitle>제출 실패</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>변경 요청 검토</CardTitle><CardDescription className="mt-1">요청 내용과 부작용을 확인한 뒤 직접 결정하세요.</CardDescription></div><Badge variant={expired ? "destructive" : "secondary"}>{expired ? "만료됨" : `남은 시간 ${remainingText}`}</Badge></div></CardHeader>
        <CardContent><dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-[140px_1fr]">{[["작업", request.operation], ["대상 수", request.targetCount], ["부작용", request.sideEffects], ["요청 ID", request.requestId]].map(([term, value]) => <div key={term} className="contents"><dt className="text-muted-foreground">{term}</dt><dd className="break-all font-medium">{value}</dd></div>)}</dl></CardContent>
        <CardFooter className="gap-2 border-t pt-6">
          {result || expired ? (
            <Button variant="outline" onClick={close}>닫기</Button>
          ) : (
            <>
              <Button onClick={() => decide("APPROVE")} disabled={!!busy}>{busy === "APPROVE" ? <LoaderCircle className="animate-spin" /> : <Check />}승인</Button>
              <Button variant="destructive" onClick={() => decide("REJECT")} disabled={!!busy}>{busy === "REJECT" ? <LoaderCircle className="animate-spin" /> : <X />}거절</Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
