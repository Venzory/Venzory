import type { ReactNode } from 'react';

interface StyleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function StyleSection({ title, description, children }: StyleSectionProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2 border-b border-border pb-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

