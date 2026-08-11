export default function WorkspaceLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="화면을 불러오는 중">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="h-8 w-56 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-white" />
    </div>
  );
}
