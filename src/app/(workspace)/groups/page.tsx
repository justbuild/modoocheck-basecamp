import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GroupActions } from "@/components/group-actions";
import { GroupCreateCard } from "@/components/group-create-card";
import { OfficialSyncButton } from "@/components/official-sync-button";
import { PendingOfficialRequest } from "@/components/pending-official-request";
import { pendingOfficialRequests, readSnapshot } from "@/lib/official";
import { groupRowSchema, parseSnapshotRows } from "@/lib/official-catalog";

export const metadata = { title: "그룹관리" };
export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const pendingLabels: Record<string, string> = {
  "groups.list": "그룹 목록 동기화",
  "groups.create": "그룹 만들기",
  "groups.update": "그룹 이름 변경",
  "groups.delete": "그룹 삭제",
};

export default function GroupsPage() {
  const snapshot = readSnapshot("groups");
  const groups = snapshot ? parseSnapshotRows(snapshot.data, groupRowSchema) : [];
  const pending = pendingOfficialRequests(Object.keys(pendingLabels));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">OFFICIAL DATA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">그룹관리</h1>
          <p className="mt-2 text-muted-foreground">
            그룹(반)의 원본은 모두출첵에 있습니다. 아래 목록은 마지막으로 동기화한 사본이며, 만들기·이름 변경·삭제는 모두 원장 승인을 거칩니다.
          </p>
        </div>
        <OfficialSyncButton operation="groups.list" label="그룹 목록 동기화" />
      </header>

      {pending.map((view) => (
        <PendingOfficialRequest key={view.requestId} view={view} label={pendingLabels[view.operation] || view.operation} />
      ))}

      <Card>
        <CardContent className="pt-2">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Users className="size-4" />총 {groups.length}개 그룹</span>
            {snapshot && <span>마지막 동기화 {formatTime(snapshot.fetchedAt)}</span>}
          </div>
          {groups.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {snapshot ? "동기화된 목록에 그룹이 없습니다. 아래에서 첫 그룹을 만들어 보세요." : "아직 동기화된 그룹 목록이 없습니다. 오른쪽 위 ‘그룹 목록 동기화’를 눌러 원장 승인 후 불러오세요."}
            </p>
          ) : (
            <ul className="divide-y">
              {groups.map((group) => (
                <li key={String(group._id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{group.name}</p>
                    {group.studentCount !== undefined && <p className="text-xs text-muted-foreground">학생 {group.studentCount}명</p>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <GroupActions groupId={String(group._id)} name={group.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <GroupCreateCard />
    </div>
  );
}
