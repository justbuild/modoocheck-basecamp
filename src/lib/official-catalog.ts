import { z } from "zod";

/**
 * Basecamp 화면이 사용할 수 있는 공식 모두출첵 작업의 허용 목록.
 * Agent API의 계약(v3.0.0) input_schema를 그대로 좁혀서 반영한다.
 * 여기에 없는 작업은 BFF가 거절한다.
 */
const idLike = z.union([z.string().max(64), z.number().int()]);

export const OFFICIAL_OPERATIONS = {
  "students.list": {
    kind: "READ",
    snapshotKey: "students",
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
    input: z.object({
      query: z.object({}).strict().optional(),
    }).strict(),
  },
  "students.create": {
    kind: "WRITE",
    snapshotKey: null,
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
    input: z.object({
      body: z.object({ name: z.string().min(1).max(100) }).strict(),
    }).strict(),
  },
  "groups.update": {
    kind: "WRITE",
    snapshotKey: null,
    input: z.object({
      params: z.object({ groupId: z.string().min(1).max(32) }).strict(),
      body: z.object({ name: z.string().min(1).max(100) }).strict(),
    }).strict(),
  },
  "groups.delete": {
    kind: "WRITE",
    snapshotKey: null,
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

/**
 * ExecutionStatus.result에서 upstream 응답 데이터(data)를 꺼낸다.
 * Agent API는 성공 시 { category: "success", status, body: { success, data } } 형태로 돌려준다.
 */
export function extractResultData(result: unknown): unknown {
  if (!result || typeof result !== "object") return null;
  const body = (result as { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;
  return (body as { data?: unknown }).data ?? null;
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
}).loose();
export type StudentRow = z.infer<typeof studentRowSchema>;

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
