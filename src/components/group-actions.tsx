"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

/** 그룹 한 개의 이름 변경/삭제. 원장 본인의 조작이므로 바로 실행된다. */
export function GroupActions({ groupId, name }: { groupId: string; name: string }) {
  const { state, run, busy, reset } = useOfficialRequest();
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [nextName, setNextName] = useState(name);

  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!nextName.trim() || nextName.trim() === name) return;
    const status = await run("groups.update", { params: { groupId }, body: { name: nextName.trim() } });
    if (status === "EXECUTED") setMode("idle");
  }

  async function remove() {
    const status = await run("groups.delete", { params: { groupId } });
    if (status === "EXECUTED") setMode("idle");
  }

  function close() {
    setMode("idle");
    setNextName(name);
    reset();
  }

  return (
    <div className="space-y-2">
      {mode === "idle" && (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMode("rename")} aria-label={`${name} 이름 변경`}><Pencil /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("delete")} aria-label={`${name} 삭제`}><Trash2 /></Button>
        </div>
      )}
      {mode === "rename" && (
        <form onSubmit={rename} className="flex items-center justify-end gap-2">
          <Input value={nextName} onChange={(event) => setNextName(event.target.value)} maxLength={100} className="h-8 max-w-48" disabled={busy} />
          <Button type="submit" size="sm" disabled={busy}>이름 변경</Button>
          <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy} aria-label="취소"><X /></Button>
        </form>
      )}
      {mode === "delete" && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">그룹을 삭제하면 학생과 그룹의 연결도 함께 정리됩니다.</span>
          <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>삭제</Button>
          <Button variant="ghost" size="sm" onClick={close} disabled={busy} aria-label="취소"><X /></Button>
        </div>
      )}
      <OfficialStatusLine state={state} />
    </div>
  );
}
