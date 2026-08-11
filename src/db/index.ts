import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let singleton: ReturnType<typeof createDatabase> | undefined;

function databasePath() {
  return path.join(process.cwd(), "data", process.env.DATABASE_FILENAME || "basecamp.db");
}

function createDatabase() {
  const filename = databasePath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  return (singleton ??= createDatabase());
}
