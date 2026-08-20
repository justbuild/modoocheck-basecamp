"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupActions } from "@/components/group-actions";
import { OfficialStatusLine } from "@/components/official-status-line";
import { RightSidePanel } from "@/components/right-side-panel";
import { useOfficialRequest } from "@/components/use-official-request";
import type { GroupRow } from "@/lib/official-catalog";

/**
 * 그룹관리 버튼 + 우측 패널. 패널 안에서 팝업 없이 그룹 추가·이름 변경·삭제를 한다.
 * 변경이 끝나면 router.refresh()로 스냅샷이 갱신되어 열린 패널에도 바로 반영된다.
 */
export function GroupManagerButton({ groups }: { groups: GroupRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Users />그룹관리</Button>
      {open && (
        <RightSidePanel title="그룹 관리" onClose={() => setOpen(false)}>
          <GroupManager groups={groups} />
        </RightSidePanel>
      )}
    </>
  );
}

function GroupManager({ groups }: { groups: GroupRow[] }) {
  const { state, run, busy, reset } = useOfficialRequest();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) return setFormError("그룹 이름을 입력해 주세요.");
    const status = await run("groups.create", { body: { name: name.trim() } });
    if (status === "EXECUTED") {
      setName("");
      reset();
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="새 그룹 이름 (예: 월수금 5시반)"
            maxLength={100}
            disabled={busy}
          />
          <Button type="submit" disabled={busy} className="shrink-0">추가</Button>
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <OfficialStatusLine state={state} />
      </form>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">아직 만든 그룹이 없습니다.</p>
      ) : (
        <ul className="divide-y">
          {groups.map((group) => (
            <li key={String(group._id)} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{group.name}</p>
                  {group.studentCount !== undefined && <p className="text-xs text-muted-foreground">학생 {group.studentCount}명</p>}
                </div>
              </div>
              <GroupActions groupId={String(group._id)} name={group.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
