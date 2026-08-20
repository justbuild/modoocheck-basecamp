import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OfficialSyncButton } from "@/components/official-sync-button";
import { PendingOfficialRequest } from "@/components/pending-official-request";
import { StudentCreateCard } from "@/components/student-create-card";
import { pendingOfficialRequests, readSnapshot } from "@/lib/official";
import { parseSnapshotRows, studentRowSchema } from "@/lib/official-catalog";

export const metadata = { title: "학생관리" };
export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function StudentsPage() {
  const snapshot = readSnapshot("students");
  const students = snapshot ? parseSnapshotRows(snapshot.data, studentRowSchema) : [];
  const pending = pendingOfficialRequests(["students.list", "students.create", "students.update"]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">OFFICIAL DATA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">학생관리</h1>
          <p className="mt-2 text-muted-foreground">
            학생 명부의 원본은 모두출첵에 있습니다. 아래 목록은 마지막으로 동기화한 사본이며, 조회와 변경 모두 원장 승인을 거칩니다.
          </p>
        </div>
        <OfficialSyncButton operation="students.list" label="학생 목록 동기화" />
      </header>

      {pending.map((view) => (
        <PendingOfficialRequest key={view.requestId} view={view} label={view.operation === "students.list" ? "학생 목록 동기화" : "학생 정보 변경"} />
      ))}

      <Card>
        <CardContent className="pt-2">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><GraduationCap className="size-4" />총 {students.length}명</span>
            {snapshot && <span>마지막 동기화 {formatTime(snapshot.fetchedAt)}</span>}
          </div>
          {students.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {snapshot ? "동기화된 목록에 학생이 없습니다." : "아직 동기화된 학생 목록이 없습니다. 오른쪽 위 ‘학생 목록 동기화’를 눌러 원장 승인 후 불러오세요."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">이름</th>
                    <th className="py-2 pr-4 font-medium">그룹</th>
                    <th className="py-2 pr-4 font-medium">학년</th>
                    <th className="py-2 font-medium">반 / 번호</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.uuid} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{student.name}</td>
                      <td className="py-2.5 pr-4">
                        {student.groupNames || student.groupName
                          ? (student.groupNames || student.groupName || "").split(",").map((groupName) => groupName.trim()).filter(Boolean).map((groupName) => (
                              <Badge key={groupName} variant="secondary" className="mr-1">{groupName}</Badge>
                            ))
                          : <span className="text-muted-foreground">미지정</span>}
                      </td>
                      <td className="py-2.5 pr-4">{student.schoolGrade ?? "—"}</td>
                      <td className="py-2.5">{[student.schoolClass, student.schoolNumber].filter((value) => value !== null && value !== undefined && value !== "").join(" / ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <StudentCreateCard />
    </div>
  );
}
