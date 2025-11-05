'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

type RegisterFormState = {
  practiceName: string;
  name: string;
  email: string;
  password: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [state, setState] = useState<RegisterFormState>({
    practiceName: '',
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.error ?? 'Registration failed.');
          return;
        }

        setSuccess('Practice created! Signing you in…');

        await signIn('credentials', {
          email: state.email,
          password: state.password,
          redirect: false,
        });

        router.push('/dashboard');
      } catch (err) {
        console.error(err);
        setError('Something went wrong. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="practiceName" className="text-sm font-medium text-slate-200">
          Practice name
        </label>
        <input
          id="practiceName"
          name="practiceName"
          type="text"
          required
          value={state.practiceName}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-200">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={state.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={state.email}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={state.password}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Creating practice…' : 'Create practice'}
      </button>
    </form>
  );
}

