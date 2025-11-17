import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T = any> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="py-8 text-center">{emptyState}</div>;
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full border-collapse">
        <thead className="bg-[rgb(var(--color-table-header))]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="transition hover:bg-[rgb(var(--color-table-hover))]"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

