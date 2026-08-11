import type BetterSqlite3 from "better-sqlite3";

type SqliteDb = BetterSqlite3.Database;

/** 원장 토큰 암호문을 담는 테이블은 뷰어에서 완전히 숨긴다. */
const HIDDEN_TABLES = new Set(["sessions"]);

/** drizzle 마이그레이션 기록처럼 `__`로 시작하는 내부 테이블은 숨긴다. */
function isHiddenTable(name: string) {
  return HIDDEN_TABLES.has(name) || name.startsWith("__");
}

export const PAGE_SIZE = 50;
const MAX_CELL_LENGTH = 200;

export type TableSummary = { name: string; rowCount: number };

export type TableColumn = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
};

export type TablePage = {
  name: string;
  columns: TableColumn[];
  rows: (string | null)[][];
  rowCount: number;
  page: number;
  pageCount: number;
};

function quoteIdentifier(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function listTables(db: SqliteDb): TableSummary[] {
  const names = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  return names
    .filter(({ name }) => !isHiddenTable(name))
    .map(({ name }) => ({
      name,
      rowCount: (db.prepare(`SELECT count(*) AS count FROM ${quoteIdentifier(name)}`).get() as { count: number })
        .count,
    }));
}

function formatCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return `<BLOB ${value.length} bytes>`;
  const text = String(value);
  return text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}…` : text;
}

export function readTablePage(db: SqliteDb, name: string, page: number): TablePage | null {
  const table = listTables(db).find((candidate) => candidate.name === name);
  if (!table) return null;

  const columns = (
    db.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).all() as {
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }[]
  ).map((column) => ({
    name: column.name,
    type: column.type || "ANY",
    notNull: column.notnull !== 0,
    primaryKey: column.pk !== 0,
  }));

  const pageCount = Math.max(1, Math.ceil(table.rowCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const rows = (
    db
      .prepare(`SELECT * FROM ${quoteIdentifier(name)} LIMIT ? OFFSET ?`)
      .raw()
      .all(PAGE_SIZE, (currentPage - 1) * PAGE_SIZE) as unknown[][]
  ).map((row) => row.map(formatCell));

  return {
    name,
    columns,
    rows,
    rowCount: table.rowCount,
    page: currentPage,
    pageCount,
  };
}
