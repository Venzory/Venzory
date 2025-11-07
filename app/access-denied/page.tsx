import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const attemptedPath = params.from || 'this page';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-rose-900/20 p-6">
            <ShieldAlert className="h-12 w-12 text-rose-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400">
            You don&apos;t have permission to access{' '}
            <span className="font-medium text-slate-300">{attemptedPath}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-left">
          <h2 className="mb-3 text-sm font-semibold text-white">Why am I seeing this?</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 text-slate-600">•</span>
              <span>This page requires a higher permission level than your current role.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 text-slate-600">•</span>
              <span>Contact your practice administrator to request access.</span>
            </li>
          </ul>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

