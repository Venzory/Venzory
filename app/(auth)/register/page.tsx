import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Create practice',
};

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/60">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Create your practice workspace</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Register the first administrator, then invite your team once you&apos;re inside the dashboard.
          </p>
        </header>
        <RegisterForm />
        <p className="text-center text-xs text-slate-500">
          Already have access?{' '}
          <Link href="/login" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            Sign in instead
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
