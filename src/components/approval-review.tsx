"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, ShieldCheck, Unplug, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePendingApprovals } from "@/lib/pending-approval";
import type { PendingApprovalItem } from "@/lib/pending-approval";

type Decision = "APPROVE" | "REJECT";
type DecisionResult = "APPROVED" | "REJECTED";

function formatRemaining(expiresAt: string, now: number) {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ApprovalCard({ approval, now, refresh }: {
  approval: PendingApprovalItem;
  now: number;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<Decision | null>(null);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expiresAt = new Date(approval.expires_at).getTime();
  const expired = !Number.isFinite(expiresAt) || expiresAt <= now;
  const remainingText = formatRemaining(approval.expires_at, now);

  async function decide(decision: Decision) {
    setBusy(decision);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${encodeURIComponent(approval.request_id)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge: approval.challenge,
          digest: approval.request_digest,
          operationId: approval.operation_id,
          targetCount: approval.target_count,
          expiresAt: approval.expires_at,
          decision,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error([body.error?.cause || "결정을 제출하지 못했습니다.", body.error?.resolution].filter(Boolean).join("\n"));
      setResult(body.status as DecisionResult);
      void refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "결정을 제출하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>변경 요청 검토</CardTitle>
            <CardDescription className="mt-1">요청 내용과 부작용을 확인한 뒤 직접 결정하세요.</CardDescription>
          </div>
          <Badge variant={expired ? "destructive" : "secondary"}>
            {expired ? "만료됨" : `남은 시간 ${remainingText}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {result && (
          <Alert>
            <ShieldCheck />
            <AlertTitle>{result === "APPROVED" ? "승인 완료" : "거절 완료"}</AlertTitle>
            <AlertDescription>{result === "APPROVED" ? "AI 에이전트가 승인된 요청을 한 번만 실행합니다." : "이 요청은 실행되지 않습니다."}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>제출 실패</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}
        <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-[140px_1fr]">
          <div className="contents"><dt className="text-muted-foreground">작업</dt><dd className="break-all font-medium">{approval.operation_id}</dd></div>
          <div className="contents"><dt className="text-muted-foreground">대상 수</dt><dd className="font-medium">{approval.target_count}</dd></div>
          <div className="contents">
            <dt className="text-muted-foreground">부작용</dt>
            <dd className="font-medium">
              {approval.side_effects.length > 0
                ? approval.side_effects.map((sideEffect, index) => <div key={`${sideEffect}-${index}`}>{sideEffect}</div>)
                : "없음"}
            </dd>
          </div>
          <div className="contents"><dt className="text-muted-foreground">요청 ID</dt><dd className="break-all font-medium">{approval.request_id}</dd></div>
        </dl>
      </CardContent>
      <CardFooter className="gap-2 border-t pt-6">
        <Button onClick={() => decide("APPROVE")} disabled={expired || !!busy || !!result}>
          {busy === "APPROVE" ? <LoaderCircle className="animate-spin" /> : <Check />}
          승인
        </Button>
        <Button variant="destructive" onClick={() => decide("REJECT")} disabled={expired || !!busy || !!result}>
          {busy === "REJECT" ? <LoaderCircle className="animate-spin" /> : <X />}
          거절
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ApprovalReview() {
  const { approvals, refresh, loading, connectionError } = usePendingApprovals(5000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && approvals.length === 0) {
    return <Card><CardContent className="py-16 text-center"><LoaderCircle className="mx-auto size-9 animate-spin text-muted-foreground" /><p className="mt-4 font-medium">승인 요청을 불러오는 중입니다</p></CardContent></Card>;
  }

  if (connectionError) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Unplug className="mx-auto mb-4 size-9 text-destructive" />
          <p className="font-medium">승인 요청을 확인할 수 없습니다</p>
          <p className="mt-2 text-sm text-muted-foreground">{connectionError.cause}</p>
          {connectionError.resolution && <p className="mt-1 text-sm text-muted-foreground">{connectionError.resolution}</p>}
          <p className="mt-4 text-xs text-muted-foreground">연결이 복구되면 이 화면이 자동으로 다시 조회됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return <Card><CardContent className="py-16 text-center"><CircleAlert className="mx-auto mb-4 size-9 text-muted-foreground" /><p className="font-medium">열린 승인 요청이 없습니다</p><p className="mt-2 text-sm text-muted-foreground">AI가 등록·수정·삭제 같은 중요한 작업을 요청하면 이 화면에 자동으로 표시됩니다. 별도의 알림 링크는 필요하지 않습니다.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <ApprovalCard key={approval.request_id} approval={approval} now={now} refresh={refresh} />
      ))}
    </div>
  );
}
