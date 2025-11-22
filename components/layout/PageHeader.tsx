import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumb?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  meta,
  primaryAction,
  secondaryAction,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumb && <div className="flex items-center gap-2">{breadcrumb}</div>}
      
      {meta && (
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{meta}</p>
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-text">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
        
        {(primaryAction || secondaryAction) && (
          <div className="flex gap-3">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}

