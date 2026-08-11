"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function EnrollmentCodeCard() {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = expiresAt && now ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;

  async function issue() {
    setBusy(true); setError(null); setCode(null); setExpiresAt(null); setCopyError(false);
    try {
      const response = await fetch("/api/agent/enrollment-code", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.cause || "등록 코드를 발급하지 못했습니다.");
      setCode(body.enrollment_code);
      const issuedAt = Date.now();
      setNow(issuedAt);
      setExpiresAt(issuedAt + body.expires_in * 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "등록 코드를 발급하지 못했습니다.");
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-5" />AI 에이전트 등록</CardTitle><CardDescription>코드는 일회용이며 5분 뒤 만료됩니다. AI 대화창에만 전달하세요.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive"><AlertTitle>발급 실패</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {code && <Alert><AlertTitle className="flex items-center justify-between">등록 코드 <span className="font-mono text-xs text-muted-foreground">{remaining ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "만료됨"}</span></AlertTitle><AlertDescription><code className="mt-3 block break-all rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">{code}</code></AlertDescription></Alert>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={issue} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}{busy ? "발급 중…" : code ? "새 코드 발급" : "등록 코드 발급"}</Button>
        {code && <Button variant="outline" onClick={copy} disabled={!remaining}>{copied ? <Check /> : <Copy />}{copied ? "복사됨" : "복사"}</Button>}
        {copyError && <p className="text-xs text-destructive">자동 복사가 차단되었습니다. 코드를 직접 선택해 복사하세요.</p>}
      </CardFooter>
    </Card>
  );
}
