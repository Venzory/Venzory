export default function DashboardLoading() {
  return (
    <section className="space-y-8">
      {/* Header skeleton */}
      <header className="space-y-1">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-96 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </header>

      {/* KPI Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-10 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-1 h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Recent Orders Table skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Items skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-900/10"
            >
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
                <div className="h-4 w-32 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
                <div className="h-4 w-full animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

