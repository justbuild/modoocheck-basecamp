"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

/** 공식 모두출첵에 새 학생을 등록한다. 등록은 원장 승인 후 한 번만 실행된다. */
export function StudentCreateCard() {
  const { state, run, busy } = useOfficialRequest();
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const contactList = contacts.split(",").map((value) => value.trim()).filter(Boolean);
    if (!name.trim()) return setFormError("학생 이름을 입력해 주세요.");
    if (contactList.length === 0) return setFormError("보호자나 학생 연락처를 1개 이상 입력해 주세요.");
    if (contactList.length > 10) return setFormError("연락처는 최대 10개까지 등록할 수 있습니다.");
    const status = await run("students.create", { body: { name: name.trim(), contacts: contactList } });
    if (status === "EXECUTED") {
      setName("");
      setContacts("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="size-4" />학생 등록</CardTitle>
        <CardDescription>모두출첵 공식 명부에 학생을 추가합니다. 원장 승인 후 반영됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-name">이름</Label>
              <Input id="student-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" maxLength={50} disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-contacts">연락처 (쉼표로 구분, 최대 10개)</Label>
              <Input id="student-contacts" value={contacts} onChange={(event) => setContacts(event.target.value)} placeholder="01012345678, 01087654321" disabled={busy} />
            </div>
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
