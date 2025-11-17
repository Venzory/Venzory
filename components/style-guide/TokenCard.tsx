import type { ReactNode } from 'react';

interface TokenCardProps {
  name: string;
  preview: ReactNode;
  cssVariable?: string;
  tailwindClass?: string;
  value?: string;
}

export function TokenCard({ name, preview, cssVariable, tailwindClass, value }: TokenCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex-shrink-0">{preview}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
        {cssVariable && (
          <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{cssVariable}</p>
        )}
        {tailwindClass && (
          <p className="font-mono text-xs text-sky-600 dark:text-sky-400">{tailwindClass}</p>
        )}
        {value && (
          <p className="text-xs text-slate-500 dark:text-slate-500">{value}</p>
        )}
      </div>
    </div>
  );
}

