'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SuccessToastProps {
  message: string;
}

export function SuccessToast({ message }: SuccessToastProps) {
  const router = useRouter();

  useEffect(() => {
    // Clear the query param after showing the message
    const timer = setTimeout(() => {
      router.replace('/orders', { scroll: false });
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {message}
        </p>
      </div>
    </div>
  );
}

