export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">Overview</p>
        <h1 className="text-3xl font-semibold text-white">Welcome to Remcura</h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Track stock levels, suppliers, and orders for each practice location. When authentication is in
          place you&apos;ll see tenant-specific insights here.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Low Stock Items</h2>
          <p className="mt-2 text-3xl font-semibold text-white">0</p>
          <p className="mt-1 text-xs text-slate-400">Connect your database to surface live counts.</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Pending Orders</h2>
          <p className="mt-2 text-3xl font-semibold text-white">0</p>
          <p className="mt-1 text-xs text-slate-400">Draft, sent, and received orders will display here.</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Active Locations</h2>
          <p className="mt-2 text-3xl font-semibold text-white">0</p>
          <p className="mt-1 text-xs text-slate-400">Add locations to monitor individual stock positions.</p>
        </article>
      </div>
    </section>
  );
}

