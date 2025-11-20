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
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

// Export primitive table components for custom layouts
export function Table({ children, className }: { children: ReactNode, className?: string }) {
    return <table className={cn("w-full border-collapse", className)}>{children}</table>
}

export function TableHeader({ children, className }: { children: ReactNode, className?: string }) {
    return <thead className={cn("bg-slate-50 dark:bg-slate-900/50", className)}>{children}</thead>
}

export function TableRow({ children, className }: { children: ReactNode, className?: string }) {
    return <tr className={cn("border-b border-slate-200 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50", className)}>{children}</tr>
}

export function TableHead({ children, className }: { children: ReactNode, className?: string }) {
    return <th className={cn("h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", className)}>{children}</th>
}

export function TableBody({ children, className }: { children: ReactNode, className?: string }) {
    return <tbody className={cn("divide-y divide-slate-200 dark:divide-slate-800", className)}>{children}</tbody>
}

export function TableCell({ children, className }: { children: ReactNode, className?: string }) {
    return <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>{children}</td>
}
