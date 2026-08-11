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

export const localAudit = sqliteTable("local_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  actorAccount: text("actor_account"),
  requestId: text("request_id"),
  evidenceJson: text("evidence_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
