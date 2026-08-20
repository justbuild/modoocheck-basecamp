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

// Basecamp 자신이 조회/변경 요청에 사용할 위임 자격(가족) 정보.
// family secret과 access token은 세션 토큰과 동일하게 AES-256-GCM으로 암호화해 저장한다.
export const delegatedCredentials = sqliteTable("delegated_credentials", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  familySecretCiphertext: text("family_secret_ciphertext").notNull(),
  familySecretIv: text("family_secret_iv").notNull(),
  familySecretTag: text("family_secret_tag").notNull(),
  accessTokenCiphertext: text("access_token_ciphertext"),
  accessTokenIv: text("access_token_iv"),
  accessTokenTag: text("access_token_tag"),
  accessExpiresAt: integer("access_expires_at", { mode: "timestamp_ms" }),
  scopesJson: text("scopes_json").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Basecamp가 Agent API에 올린 공식 데이터 요청(조회/변경)의 로컬 추적 기록.
export const officialRequests = sqliteTable("official_requests", {
  requestId: text("request_id").primaryKey(),
  operation: text("operation").notNull(),
  kind: text("kind").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull(),
  resultJson: text("result_json"),
  nextAction: text("next_action"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// 승인·실행이 끝난 공식 조회 결과의 표시용 스냅샷.
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
