interface IntegrationTypeBadgeProps {
  type: string | null | undefined;
}

export function IntegrationTypeBadge({ type }: IntegrationTypeBadgeProps) {
  const typeConfig: Record<string, { label: string; className: string }> = {
    MANUAL: {
      label: 'Manual',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    CSV_IMPORT: {
      label: 'CSV Import',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    EDI: {
      label: 'EDI',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    PUNCHOUT: {
      label: 'Punchout',
      className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    },
    API: {
      label: 'API',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
  };

  const config = type ? typeConfig[type] : typeConfig.MANUAL;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config?.className ?? typeConfig.MANUAL.className}`}>
      {config?.label ?? type ?? 'Manual'}
    </span>
  );
}

