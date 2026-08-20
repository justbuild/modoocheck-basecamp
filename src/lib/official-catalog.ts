import { z } from "zod";

/**
 * Basecamp 화면이 사용할 수 있는 공식 모두출첵 작업의 허용 목록.
 * 원장이 화면에서 직접 조작하는 작업이므로 원장 세션 토큰으로 upstream을 바로 부른다.
 * (AI 위임 클라이언트의 작업만 agent-api 승인 계약을 거친다.)
 * 여기에 없는 작업은 BFF가 거절한다.
 */
const idLike = z.union([z.string().max(64), z.number().int()]);

export const OFFICIAL_OPERATIONS = {
  "students.list": {
    kind: "READ",
    snapshotKey: "students",
    method: "GET",
    path: "/service/students/view/plain",
    input: z.object({
      query: z.object({
        sleep: z.enum(["0", "1"]).optional(),
        groupId: z.string().max(200).optional(),
        sort: z.enum(["name", "grade"]).optional(),
      }).strict().optional(),
    }).strict(),
  },
  "groups.list": {
    kind: "READ",
    snapshotKey: "groups",
    method: "GET",
    path: "/service/groups",
    input: z.object({
      query: z.object({}).strict().optional(),
    }).strict(),
  },
  "attendances.list": {
    kind: "READ",
    snapshotKey: "attendances",
    method: "GET",
    path: "/service/attendances/view/plain",
    input: z.object({
      query: z.object({
        startDate: z.string().regex(/^\d{8}$/),
        endDate: z.string().regex(/^\d{8}$/),
      }).strict(),
    }).strict(),
  },
  "students.detail": {
    kind: "READ",
    snapshotKey: null,
    method: "GET",
    path: "/service/students/{student_uuid}",
    input: z.object({
      params: z.object({ student_uuid: z.string().min(1).max(64) }).strict(),
    }).strict(),
  },
  "students.create": {
    kind: "WRITE",
    snapshotKey: null,
    method: "POST",
    path: "/service/students",
    input: z.object({
      body: z.object({
        name: z.string().min(1).max(50),
        contacts: z.array(z.string().min(1)).min(1).max(10),
        groupId: z.number().int().nullable().optional(),
        schoolGrade: idLike.nullable().optional(),
        schoolClass: z.string().nullable().optional(),
        schoolNumber: idLike.nullable().optional(),
      }).strict(),
    }).strict(),
  },
  "students.update": {
    kind: "WRITE",
    snapshotKey: null,
    method: "PATCH",
    path: "/service/students/{student_uuid}",
    input: z.object({
      params: z.object({ student_uuid: z.string().min(1).max(64) }).strict(),
      body: z.object({
        body: z.object({
          name: z.string().min(1).max(50).optional(),
          groupId: idLike.nullable().optional(),
          groupIds: z.array(idLike).max(50).optional(),
          isSleep: z.number().int().min(0).max(1).optional(),
        }).strict(),
      }).strict(),
    }).strict(),
  },
  "groups.create": {
    kind: "WRITE",
    snapshotKey: null,
    method: "POST",
    path: "/service/groups",
    input: z.object({
      body: z.object({ name: z.string().min(1).max(100) }).strict(),
    }).strict(),
  },
  "groups.update": {
    kind: "WRITE",
    snapshotKey: null,
    method: "PATCH",
    path: "/service/groups/{groupId}",
    input: z.object({
      params: z.object({ groupId: z.string().min(1).max(32) }).strict(),
      body: z.object({ name: z.string().min(1).max(100) }).strict(),
    }).strict(),
  },
  "groups.delete": {
    kind: "WRITE",
    snapshotKey: null,
    method: "DELETE",
    path: "/service/groups/{groupId}",
    input: z.object({
      params: z.object({ groupId: z.string().min(1).max(32) }).strict(),
    }).strict(),
  },
} as const;

export type OfficialOperationId = keyof typeof OFFICIAL_OPERATIONS;

export function isOfficialOperation(value: string): value is OfficialOperationId {
  return Object.hasOwn(OFFICIAL_OPERATIONS, value);
}

export function officialOperation(id: OfficialOperationId) {
  return OFFICIAL_OPERATIONS[id];
}

/** path 템플릿의 {param} 자리를 검증된 params 값으로 치환한다. */
export function resolveOperationPath(template: string, params: Record<string, unknown> = {}): string {
  return template.replace(/\{([A-Za-z_]+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null || String(value).length === 0) {
      throw new Error(`경로 매개변수 ${name} 값이 없습니다.`);
    }
    return encodeURIComponent(String(value));
  });
}

/** 학생 목록 스냅샷 항목 — 알 수 없는 필드는 무시하고 표시에 필요한 것만 통과시킨다. */
export const studentRowSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  groupId: z.number().int().nullish(),
  groupNames: z.string().nullish(),
  groupName: z.string().nullish(),
  schoolGrade: z.union([z.number().int(), z.string()]).nullish(),
  schoolClass: z.string().nullish(),
  schoolNumber: z.union([z.number().int(), z.string()]).nullish(),
  primaryContactPhone: z.string().nullish(),
  createdAt: z.string().nullish(),
}).loose();
export type StudentRow = z.infer<typeof studentRowSchema>;

/** 전화번호에서 숫자만 남겨 뒤 4자리를 돌려준다. 숫자가 없으면 null. */
export function contactTail(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits.slice(-4) : null;
}

/** 출결 기록 스냅샷 항목. */
export const attendanceRecordSchema = z.object({
  studentUuid: z.string(),
  date: z.union([z.string(), z.number()]),
  type: z.string().optional(),
}).loose();

/**
 * 출결 스냅샷에서 학생별 최근 출석일(YYYY-MM-DD)을 계산한다.
 * SKIP(결석)은 출석으로 세지 않는다.
 */
export function lastAttendanceByStudent(data: unknown): Record<string, string> {
  const latest = new Map<string, string>();
  if (!Array.isArray(data)) return {};
  for (const item of data) {
    const parsed = attendanceRecordSchema.safeParse(item);
    if (!parsed.success) continue;
    if (parsed.data.type?.toUpperCase() === "SKIP") continue;
    const compact = String(parsed.data.date);
    if (!/^\d{8}$/.test(compact)) continue;
    const ymd = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
    const previous = latest.get(parsed.data.studentUuid);
    if (!previous || ymd > previous) latest.set(parsed.data.studentUuid, ymd);
  }
  return Object.fromEntries(latest);
}

/** 학생 상세 조회 응답 — 표시에 필요한 필드만 좁혀 통과시키고 나머지는 무시한다. */
export const studentDetailSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  profileImageUrl: z.string().nullish(),
  isSleep: z.union([z.number().int(), z.boolean()]).nullish(),
  groupName: z.string().nullish(),
  groupNames: z.string().nullish(),
  schoolGrade: idLike.nullish(),
  schoolClass: z.string().nullish(),
  schoolNumber: idLike.nullish(),
  primaryContact: z.string().nullish(),
  secondContact: z.string().nullish(),
  thirdContact: z.string().nullish(),
  extraPhone: z.string().nullish(),
  extraBirthday: z.string().nullish(),
  extraGender: z.string().nullish(),
  extraSchool: z.string().nullish(),
  extraGrade: idLike.nullish(),
  extraAddress: z.string().nullish(),
  extraInDate: z.string().nullish(),
  extraOutDate: z.string().nullish(),
  memo: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
}).loose();
export type StudentDetail = z.infer<typeof studentDetailSchema>;

/**
 * 연락처 문자열을 파싱한다. upstream은 연락처를 "id:이름:전화번호" 형태의
 * 한 줄로 돌려준다 (student_detail_view의 primary/second/third_contact).
 */
export function parseContact(value: string | null | undefined): { name: string; phone: string } | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length >= 3) return { name: parts[1] || "", phone: parts[2] || "" };
  if (parts.length === 2) return { name: parts[0] || "", phone: parts[1] || "" };
  return { name: "", phone: value };
}

/** 그룹 목록 스냅샷 항목. */
export const groupRowSchema = z.object({
  _id: z.union([z.number().int(), z.string()]),
  name: z.string(),
  studentCount: z.number().int().optional(),
}).loose();
export type GroupRow = z.infer<typeof groupRowSchema>;

export function parseSnapshotRows<T>(data: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(data)) return [];
  const rows: T[] = [];
  for (const item of data) {
    const parsed = schema.safeParse(item);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}
