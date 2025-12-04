export default function InventoryLoading() {
  return (
    <div className="space-y-8">
      <section className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-96 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Search Filters skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="transition">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </section>

      {/* Forms section skeleton */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] mt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

