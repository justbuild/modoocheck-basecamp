import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listTables, readTablePage } from "@/lib/db-viewer";
import { getReadonlySqlite } from "@/db";

export const metadata = { title: "데이터 조회" };

export default async function DbViewerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requestedTable = typeof params.table === "string" ? params.table : undefined;
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const db = getReadonlySqlite();
  const tables = listTables(db);
  const selectedName = requestedTable ?? tables[0]?.name;
  const tablePage = selectedName ? readTablePage(db, selectedName, requestedPage) : null;

  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold tracking-tight">데이터 조회</h2><p className="mt-1 text-sm text-muted-foreground">베이스캠프에 저장된 데이터를 확인만 할 수 있는 화면입니다. 여기서는 어떤 것도 수정되지 않습니다.</p></div>

      <div className="flex flex-wrap gap-2">
        {tables.map((table) => (
          <Link
            key={table.name}
            href={`/settings/db?table=${encodeURIComponent(table.name)}`}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
              table.name === tablePage?.name
                ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                : "text-muted-foreground hover:bg-zinc-100 hover:text-zinc-950",
            )}
          >
            {table.name}
            <Badge variant={table.name === tablePage?.name ? "secondary" : "outline"}>{table.rowCount}</Badge>
          </Link>
        ))}
        {tables.length === 0 && <p className="text-sm text-muted-foreground">조회할 수 있는 테이블이 없습니다.</p>}
      </div>

      {tablePage && (
        <Card>
          <CardHeader>
            <CardTitle>{tablePage.name}</CardTitle>
            <CardDescription>
              총 {tablePage.rowCount}행 · {tablePage.page}/{tablePage.pageCount} 페이지
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-zinc-50 text-xs uppercase text-muted-foreground">
                  <tr>
                    {tablePage.columns.map((column) => (
                      <th key={column.name} className="whitespace-nowrap px-3 py-2 font-medium">
                        {column.name}
                        <span className="ml-1 font-normal normal-case">
                          {column.type}
                          {column.primaryKey ? " · PK" : ""}
                          {column.notNull ? " · NOT NULL" : ""}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablePage.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="max-w-xs truncate px-3 py-2 font-mono text-xs">
                          {cell === null ? <span className="text-muted-foreground">NULL</span> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {tablePage.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={Math.max(1, tablePage.columns.length)}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {tablePage.pageCount > 1 && (
              <div className="flex items-center justify-end gap-2 text-sm">
                {tablePage.page > 1 && (
                  <Link
                    href={`/settings/db?table=${encodeURIComponent(tablePage.name)}&page=${tablePage.page - 1}`}
                    className="rounded-lg border px-3 py-1.5 font-medium hover:bg-zinc-100"
                  >
                    이전
                  </Link>
                )}
                {tablePage.page < tablePage.pageCount && (
                  <Link
                    href={`/settings/db?table=${encodeURIComponent(tablePage.name)}&page=${tablePage.page + 1}`}
                    className="rounded-lg border px-3 py-1.5 font-medium hover:bg-zinc-100"
                  >
                    다음
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
