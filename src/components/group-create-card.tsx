"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

/** 공식 모두출첵에 새 그룹(반)을 만든다. 원장 승인 후 한 번만 실행된다. */
export function GroupCreateCard() {
  const { state, run, busy } = useOfficialRequest();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) return setFormError("그룹 이름을 입력해 주세요.");
    const status = await run("groups.create", { body: { name: name.trim() } });
    if (status === "EXECUTED") setName("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FolderPlus className="size-4" />그룹 만들기</CardTitle>
        <CardDescription>반, 요일, 시간대 등 학생을 묶어 관리할 그룹을 추가합니다. 원장 승인 후 반영됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">그룹 이름</Label>
            <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="월수금 5시반" maxLength={100} disabled={busy} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>승인 요청 보내기</Button>
          </div>
          <OfficialStatusLine state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
