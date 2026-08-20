import { describe, expect, it } from "vitest";
import {
  extractResultData,
  groupRowSchema,
  isOfficialOperation,
  officialOperation,
  parseSnapshotRows,
  studentRowSchema,
} from "./official-catalog";

describe("official operation allowlist", () => {
  it("허용 목록에 있는 작업만 통과시킨다", () => {
    expect(isOfficialOperation("students.list")).toBe(true);
    expect(isOfficialOperation("groups.delete")).toBe(true);
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

describe("extractResultData", () => {
  it("성공 응답 봉투에서 data를 꺼낸다", () => {
    const result = { category: "success", status: 200, body: { success: true, data: [{ name: "홍길동" }] } };
    expect(extractResultData(result)).toEqual([{ name: "홍길동" }]);
  });

  it("봉투가 없거나 깨진 경우 null을 돌려준다", () => {
    expect(extractResultData(undefined)).toBeNull();
    expect(extractResultData({ category: "unclassified_response" })).toBeNull();
    expect(extractResultData({ body: null })).toBeNull();
    expect(extractResultData({ body: { success: false } })).toBeNull();
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
