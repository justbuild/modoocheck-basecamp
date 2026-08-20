"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StudentDetailPanel } from "@/components/student-detail-panel";
import { formatYmdDot, ymdFromDateTime } from "@/lib/dates";
import { contactTail, type StudentRow } from "@/lib/official-catalog";

/**
 * 학생 명부 표. 이름 셀을 누르면 우측 패널로 상세정보를 연다.
 * 패널 열기는 화면 내 동작이므로 버튼으로 렌더링한다(참조 UX 규칙).
 */
export function StudentsTable({
  students,
  lastAttendance,
}: {
  students: StudentRow[];
  lastAttendance: Record<string, string>;
}) {
  const [selected, setSelected] = useState<{ uuid: string; name: string } | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">그룹명</th>
            <th className="py-2 pr-4 font-medium">이름</th>
            <th className="py-2 pr-4 font-medium">연락처 뒷자리</th>
            <th className="py-2 pr-4 font-medium">최근출석일</th>
            <th className="py-2 font-medium">등록일</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const tail = contactTail(student.primaryContactPhone);
            return (
              <tr key={student.uuid} className={`border-b last:border-0 ${selected?.uuid === student.uuid ? "bg-muted/50" : ""}`}>
                <td className="py-2.5 pr-4">
                  {student.groupNames || student.groupName
                    ? (student.groupNames || student.groupName || "").split(",").map((groupName) => groupName.trim()).filter(Boolean).map((groupName) => (
                        <Badge key={groupName} variant="secondary" className="mr-1">{groupName}</Badge>
                      ))
                    : <span className="text-muted-foreground">미지정</span>}
                </td>
                <td className="py-2.5 pr-4 font-medium">
                  <button
                    type="button"
                    onClick={() => setSelected({ uuid: student.uuid, name: student.name })}
                    className="rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={`${student.name} 상세정보 열기`}
                  >
                    {student.name}
                  </button>
                </td>
                <td className="py-2.5 pr-4 tabular-nums">{tail ?? "—"}</td>
                <td className="py-2.5 pr-4 tabular-nums">{formatYmdDot(lastAttendance[student.uuid]) ?? "—"}</td>
                <td className="py-2.5 tabular-nums">{formatYmdDot(ymdFromDateTime(student.createdAt)) ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selected && (
        <StudentDetailPanel key={selected.uuid} uuid={selected.uuid} name={selected.name} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
