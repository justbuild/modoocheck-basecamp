import { describe, expect, it } from "vitest";
import {
  contactTail,
  groupRowSchema,
  isOfficialOperation,
  lastAttendanceByStudent,
  officialOperation,
  parseContact,
  parseSnapshotRows,
  resolveOperationPath,
  studentDetailSchema,
  studentRowSchema,
} from "./official-catalog";

describe("official operation allowlist", () => {
  it("허용 목록에 있는 작업만 통과시킨다", () => {
    expect(isOfficialOperation("students.list")).toBe(true);
    expect(isOfficialOperation("groups.delete")).toBe(true);
    expect(isOfficialOperation("attendances.list")).toBe(true);
    expect(isOfficialOperation("students.bulk-delete")).toBe(false);
    expect(isOfficialOperation("devices.push-send")).toBe(false);
    expect(isOfficialOperation("")).toBe(false);
  });

  it("조회 작업은 스냅샷 키를 갖고 변경 작업은 갖지 않는다", () => {
    expect(officialOperation("students.list")).toMatchObject({ kind: "READ", snapshotKey: "students" });
    expect(officialOperation("groups.list")).toMatchObject({ kind: "READ", snapshotKey: "groups" });
    expect(officialOperation("groups.create").snapshotKey).toBeNull();
  });

  it("계약에 없는 필드가 섞인 입력을 거절한다", () => {
    const input = officialOperation("groups.create").input;
    expect(() => input.parse({ body: { name: "월수금반" } })).not.toThrow();
    expect(() => input.parse({ body: { name: "월수금반", tenantId: "override" } })).toThrow();
    expect(() => input.parse({ body: { name: "" } })).toThrow();
  });

  it("학생 등록은 이름과 연락처 1~10개를 요구한다", () => {
    const input = officialOperation("students.create").input;
    expect(() => input.parse({ body: { name: "홍길동", contacts: ["01012345678"] } })).not.toThrow();
    expect(() => input.parse({ body: { name: "홍길동", contacts: [] } })).toThrow();
    expect(() => input.parse({ body: { name: "홍길동", contacts: Array(11).fill("01012345678") } })).toThrow();
  });
});

describe("resolveOperationPath", () => {
  it("path 템플릿의 매개변수를 URL-인코딩해 치환한다", () => {
    expect(resolveOperationPath("/service/groups/{groupId}", { groupId: "7" })).toBe("/service/groups/7");
    expect(resolveOperationPath("/service/students/{student_uuid}", { student_uuid: "a/b" })).toBe("/service/students/a%2Fb");
    expect(resolveOperationPath("/service/groups", {})).toBe("/service/groups");
  });

  it("매개변수 값이 없으면 거절한다", () => {
    expect(() => resolveOperationPath("/service/groups/{groupId}", {})).toThrow();
    expect(() => resolveOperationPath("/service/groups/{groupId}", { groupId: "" })).toThrow();
  });

  it("모든 허용 작업은 upstream 호출 정보를 갖는다", () => {
    for (const id of ["students.list", "groups.list", "students.create", "students.update", "groups.create", "groups.update", "groups.delete"] as const) {
      const operation = officialOperation(id);
      expect(operation.method).toMatch(/^(GET|POST|PATCH|DELETE)$/);
      expect(operation.path.startsWith("/service/")).toBe(true);
    }
  });
});

describe("student detail parsing", () => {
  it("상세 응답에서 모르는 필드는 무시하고 필수 필드만 요구한다", () => {
    const parsed = studentDetailSchema.parse({
      uuid: "u-1", name: "홍길동", groupNames: "월수금", memo: "메모", unknownField: 1,
    });
    expect(parsed).toMatchObject({ uuid: "u-1", name: "홍길동" });
    expect(() => studentDetailSchema.parse({ name: "uuid 없음" })).toThrow();
  });

  it("학생 상세 조회 작업은 uuid 경로 매개변수만 받는다", () => {
    const operation = officialOperation("students.detail");
    expect(operation).toMatchObject({ kind: "READ", snapshotKey: null, method: "GET" });
    expect(() => operation.input.parse({ params: { student_uuid: "u-1" } })).not.toThrow();
    expect(() => operation.input.parse({ params: {} })).toThrow();
    expect(() => operation.input.parse({ params: { student_uuid: "u-1" }, body: { name: "x" } })).toThrow();
  });

  it("연락처 문자열 id:이름:전화번호를 분리한다", () => {
    expect(parseContact("3:어머니:01012345678")).toEqual({ name: "어머니", phone: "01012345678" });
    expect(parseContact("아버지:01011112222")).toEqual({ name: "아버지", phone: "01011112222" });
    expect(parseContact("01012345678")).toEqual({ name: "", phone: "01012345678" });
    expect(parseContact("")).toBeNull();
    expect(parseContact(null)).toBeNull();
  });
});

describe("snapshot row parsing", () => {
  it("모르는 필드가 있어도 학생 행을 통과시키고 깨진 행만 건너뛴다", () => {
    const rows = parseSnapshotRows([
      { uuid: "u-1", name: "홍길동", groupNames: "월수금, 화목", schoolGrade: 3, unknownField: true },
      { name: "uuid 없음" },
      "문자열",
    ], studentRowSchema);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ uuid: "u-1", name: "홍길동" });
  });

  it("그룹 행은 _id와 name을 요구한다", () => {
    const rows = parseSnapshotRows([
      { _id: 7, name: "월수금반", studentCount: 12 },
      { name: "id 없음" },
    ], groupRowSchema);
    expect(rows).toEqual([{ _id: 7, name: "월수금반", studentCount: 12 }]);
  });

  it("배열이 아닌 스냅샷은 빈 목록으로 처리한다", () => {
    expect(parseSnapshotRows({ data: [] }, groupRowSchema)).toEqual([]);
    expect(parseSnapshotRows(null, groupRowSchema)).toEqual([]);
  });
});

describe("contactTail", () => {
  it("전화번호 뒤 4자리만 남긴다", () => {
    expect(contactTail("010-1234-5678")).toBe("5678");
    expect(contactTail("01012345678")).toBe("5678");
    expect(contactTail("123")).toBe("123");
    expect(contactTail("")).toBeNull();
    expect(contactTail(null)).toBeNull();
    expect(contactTail(undefined)).toBeNull();
  });
});

describe("lastAttendanceByStudent", () => {
  it("학생별 가장 최근 출석일을 고르고 결석(SKIP)은 제외한다", () => {
    const data = [
      { studentUuid: "a", date: "20260810", type: "ENTER" },
      { studentUuid: "a", date: "20260818", type: "EXIT" },
      { studentUuid: "a", date: "20260820", type: "SKIP" },
      { studentUuid: "b", date: 20260801, type: "enter" },
      { studentUuid: "c", date: "20260820", type: "SKIP" },
    ];
    expect(lastAttendanceByStudent(data)).toEqual({ a: "2026-08-18", b: "2026-08-01" });
  });

  it("깨진 기록과 이상한 날짜는 걸러낸다", () => {
    const data = [
      { studentUuid: "a", date: "오늘", type: "IN" },
      { date: "20260820" },
      "문자열",
      { studentUuid: "a", date: "20260819", type: "IN" },
    ];
    expect(lastAttendanceByStudent(data)).toEqual({ a: "2026-08-19" });
  });

  it("배열이 아니면 빈 결과를 돌려준다", () => {
    expect(lastAttendanceByStudent(null)).toEqual({});
    expect(lastAttendanceByStudent({})).toEqual({});
  });
});
