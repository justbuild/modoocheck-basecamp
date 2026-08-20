import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  account: text("account").notNull(),
  ownerTokenCiphertext: text("owner_token_ciphertext").notNull(),
  ownerTokenIv: text("owner_token_iv").notNull(),
  ownerTokenTag: text("owner_token_tag").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// 원장이 직접 실행한 공식 조회 결과의 표시용 스냅샷.
// request_id 컬럼에는 실행 추적용 UUID(executionId)가 들어간다.
// 진실의 원천은 항상 모두출첵 Core이며, 이 테이블은 마지막 동기화 화면 캐시일 뿐이다.
export const officialSnapshots = sqliteTable("official_snapshots", {
  key: text("key").primaryKey(),
  requestId: text("request_id").notNull(),
  dataJson: text("data_json").notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});

export const localAudit = sqliteTable("local_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  actorAccount: text("actor_account"),
  requestId: text("request_id"),
  evidenceJson: text("evidence_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
