import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PAGE_SIZE, listTables, readTablePage } from "./db-viewer";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE sessions (id TEXT PRIMARY KEY, owner_token_ciphertext TEXT NOT NULL);
    CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT, attachment BLOB);
    CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC);
  `);
  db.prepare("INSERT INTO sessions (id, owner_token_ciphertext) VALUES (?, ?)").run("s1", "secret");
});

afterEach(() => {
  db.close();
});

describe("listTables", () => {
  it("hides sessions and internal tables, and reports row counts", () => {
    db.prepare("INSERT INTO notes (body) VALUES (?)").run("hello");
    const tables = listTables(db);
    expect(tables.map((table) => table.name)).toEqual(["notes"]);
    expect(tables[0].rowCount).toBe(1);
  });
});

describe("readTablePage", () => {
  it("refuses hidden and unknown tables", () => {
    expect(readTablePage(db, "sessions", 1)).toBeNull();
    expect(readTablePage(db, "__drizzle_migrations", 1)).toBeNull();
    expect(readTablePage(db, "missing", 1)).toBeNull();
  });

  it("returns columns, formatted cells, and clamps the page", () => {
    db.prepare("INSERT INTO notes (body, attachment) VALUES (?, ?)").run(null, Buffer.from([1, 2, 3]));
    db.prepare("INSERT INTO notes (body) VALUES (?)").run("x".repeat(300));
    const page = readTablePage(db, "notes", 99);
    expect(page).not.toBeNull();
    expect(page!.page).toBe(1);
    expect(page!.pageCount).toBe(1);
    expect(page!.columns.map((column) => column.name)).toEqual(["id", "body", "attachment"]);
    expect(page!.columns[0].primaryKey).toBe(true);
    expect(page!.rows[0][1]).toBeNull();
    expect(page!.rows[0][2]).toBe("<BLOB 3 bytes>");
    expect(page!.rows[1][1]).toHaveLength(201);
    expect(page!.rows[1][1]!.endsWith("…")).toBe(true);
  });

  it("paginates with a fixed page size", () => {
    const insert = db.prepare("INSERT INTO notes (body) VALUES (?)");
    for (let index = 0; index < PAGE_SIZE + 5; index += 1) insert.run(`row-${index}`);
    const first = readTablePage(db, "notes", 1)!;
    const second = readTablePage(db, "notes", 2)!;
    expect(first.rows).toHaveLength(PAGE_SIZE);
    expect(second.rows).toHaveLength(5);
    expect(second.pageCount).toBe(2);
  });
});
