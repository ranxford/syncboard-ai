const COLUMNS = [3, 2, 4, 1];

export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-hidden px-4 pb-4 pt-4 md:px-6">
      {COLUMNS.map((count, i) => (
        <div
          key={i}
          className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/[0.06] bg-ink-900/50"
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="h-3 w-20 animate-pulse rounded bg-white/10" />
            </div>
            <span className="h-4 w-4 animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {Array.from({ length: count }).map((_, j) => (
              <div
                key={j}
                className="animate-pulse rounded-xl border border-white/10 bg-ink-800 p-3"
                style={{ animationDelay: `${(i * 3 + j) * 80}ms` }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="h-4 w-14 rounded-md bg-white/10" />
                  <span className="h-5 w-5 rounded-full bg-white/10" />
                </div>
                <div className="h-3.5 w-[85%] rounded bg-white/10" />
                <div className="mt-1.5 h-3.5 w-1/2 rounded bg-white/[0.07]" />
                <div className="mt-2.5 flex gap-1.5">
                  <span className="h-4 w-12 rounded-full bg-white/[0.07]" />
                  <span className="h-4 w-10 rounded-full bg-white/[0.07]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
