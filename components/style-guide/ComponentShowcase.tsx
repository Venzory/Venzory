import type { ReactNode } from 'react';

interface ComponentShowcaseProps {
  title: string;
  description?: string;
  children: ReactNode;
  code?: string;
  usage?: string;
}

export function ComponentShowcase({ title, description, children, code, usage }: ComponentShowcaseProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        )}
      </div>
      
      <div className="rounded-lg border border-border bg-slate-50 p-6 dark:bg-slate-900/50">
        {children}
      </div>

      {code && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Code Example
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100 dark:bg-slate-950">
            <code>{code}</code>
          </pre>
        </div>
      )}

      {usage && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold">Usage: </span>
            {usage}
          </p>
        </div>
      )}
    </div>
  );
}

