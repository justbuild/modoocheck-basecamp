import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const filename = path.join(process.cwd(), "data", process.env.DATABASE_FILENAME || "basecamp.db");
fs.mkdirSync(path.dirname(filename), { recursive: true });

const sqlite = new Database(filename);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

try {
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve("./drizzle") });
  console.log(`Basecamp database migrated: ${filename}`);
} finally {
  sqlite.close();
}
