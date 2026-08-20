import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OfficialListLoader } from "@/components/official-sync-button";
import { StudentCreateDialog } from "@/components/student-create-dialog";
import { GroupManagerButton } from "@/components/group-manager";
import { StudentsTable } from "@/components/students-table";
import { addDays, compactDate, seoulToday } from "@/lib/dates";
import { isSnapshotFresh, readSnapshot } from "@/lib/official";
import {
  groupRowSchema,
  lastAttendanceByStudent,
  parseSnapshotRows,
  studentRowSchema,
} from "@/lib/official-catalog";

// 출결 스냅샷은 행 수가 많아 무겁다(1년치 수만 건). 최근출석일 표시 용도로
// 몇 분 차이는 의미가 없으므로 이 시간 안의 스냅샷은 다시 가져오지 않는다.
const ATTENDANCE_REFRESH_MS = 10 * 60 * 1000;

export const metadata = { title: "학생관리" };
export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function StudentsPage() {
  const snapshot = readSnapshot("students");
  const students = snapshot ? parseSnapshotRows(snapshot.data, studentRowSchema) : [];
  const groups = parseSnapshotRows(readSnapshot("groups")?.data, groupRowSchema);
  const attendanceSnapshot = readSnapshot("attendances");
  const lastAttendance = lastAttendanceByStudent(attendanceSnapshot?.data);

  const today = seoulToday();
  const attendanceFresh = isSnapshotFresh("attendances", ATTENDANCE_REFRESH_MS);
  const loads = [
    { operation: "students.list" },
    { operation: "groups.list" },
    ...(attendanceFresh ? [] : [{
      operation: "attendances.list",
      request: { query: { startDate: compactDate(addDays(today, -365)), endDate: compactDate(addDays(today, 1)) } },
    }]),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">OFFICIAL DATA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">학생관리</h1>
          <p className="mt-2 text-muted-foreground">
            학생 명단을 관리하고 새 학생을 등록하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <GroupManagerButton groups={groups} />
          <StudentCreateDialog />
        </div>
      </header>

      <OfficialListLoader loads={loads} />

      <Card>
        <CardContent className="pt-2">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><GraduationCap className="size-4" />총 {students.length}명</span>
            {snapshot && <span>마지막 동기화 {formatTime(snapshot.fetchedAt)}</span>}
          </div>
          {students.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {snapshot ? "조회한 목록에 학생이 없습니다." : "학생 목록을 불러오는 중입니다."}
            </p>
          ) : (
            <StudentsTable students={students} lastAttendance={lastAttendance} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
