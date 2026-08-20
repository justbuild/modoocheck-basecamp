"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AppDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficialStatusLine } from "@/components/official-status-line";
import { useOfficialRequest } from "@/components/use-official-request";

/** 새 학생 등록 팝업을 여는 버튼. 원장 본인의 조작이므로 승인 절차가 없다. */
export function StudentCreateDialog() {
  const { state, run, busy, reset } = useOfficialRequest();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset();
    }
  }

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
      setOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => changeOpen(true)}><UserPlus />학생 등록</Button>
      <AppDialog open={open} onOpenChange={changeOpen} title="학생 등록" description="새 학생을 명단에 바로 추가합니다.">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">이름</Label>
            <Input id="student-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" maxLength={50} disabled={busy} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-contacts">연락처 (쉼표로 구분, 최대 10개)</Label>
            <Input id="student-contacts" value={contacts} onChange={(event) => setContacts(event.target.value)} placeholder="01012345678, 01087654321" disabled={busy} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={busy}>취소</Button>
            <Button type="submit" disabled={busy}>등록</Button>
          </div>
          <OfficialStatusLine state={state} />
        </form>
      </AppDialog>
    </>
  );
}
