'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export interface Column<T = any> {
  accessorKey: string;
  header: ReactNode | ((props: { column: Column<T> }) => ReactNode);
  cell?: (row: T) => ReactNode; // Optional custom render
  enableSorting?: boolean;
  className?: string;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  emptyState?: ReactNode;
  className?: string;
  
  // Sorting
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';

  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  rowIdKey?: string; // default to 'id'

  // Expansion
  expandable?: boolean;
  renderSubComponent?: (row: T) => ReactNode;
  
  // Styling
  getRowClassName?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyState,
  className,
  onSort,
  sortColumn,
  sortOrder,
  selectable,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  rowIdKey = 'id',
  expandable,
  renderSubComponent,
  getRowClassName
}: DataTableProps<T>) {
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const selectedRows = controlledSelectedRows ?? internalSelectedRows;
  
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    if (sortColumn === columnKey) {
      onSort(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

  const toggleSelectAll = () => {
    const newSelected = new Set<string>();
    if (selectedRows.size < data.length) {
      data.forEach(row => newSelected.add(String(row[rowIdKey])));
    }
    
    if (!controlledSelectedRows) {
      setInternalSelectedRows(newSelected);
    }
    onSelectionChange?.(newSelected);
  };

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    
    if (!controlledSelectedRows) {
      setInternalSelectedRows(newSelected);
    }
    onSelectionChange?.(newSelected);
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (data.length === 0 && emptyState) {
    return <div className="py-8 text-center">{emptyState}</div>;
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full border-collapse text-sm">
        <TableHeader>
          <TableRow>
            {expandable && <TableHead className="w-[40px] px-2" />}
            {selectable && (
              <TableHead className="w-[40px] px-4">
                <Checkbox 
                  checked={data.length > 0 && selectedRows.size === data.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead 
                key={column.accessorKey} 
                className={cn(
                  column.enableSorting && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                  column.className
                )}
                onClick={() => column.enableSorting && handleSort(column.accessorKey)}
              >
                <div className="flex items-center gap-1">
                  {typeof column.header === 'function' 
                    ? column.header({ column }) 
                    : column.header}
                  
                  {column.enableSorting && sortColumn === column.accessorKey && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => {
            const rowId = String(row[rowIdKey] || rowIndex);
            const isExpanded = expandedRows.has(rowId);
            const isSelected = selectedRows.has(rowId);

            return (
              <div key={rowId} className="contents group">
                <TableRow className={cn(
                    isExpanded && "bg-slate-50 dark:bg-slate-800/50", 
                    isSelected && "bg-sky-50 dark:bg-sky-900/20",
                    getRowClassName?.(row)
                  )}>
                  {expandable && (
                    <TableCell className="p-2 px-4">
                      <button
                        onClick={() => toggleRowExpansion(rowId)}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                  )}
                  {selectable && (
                    <TableCell className="px-4">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(rowId)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey} className={column.className}>
                      {column.cell ? column.cell(row) : row[column.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
                {expandable && isExpanded && renderSubComponent && (
                  <TableRow className="bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0) + 1} className="p-0">
                      {renderSubComponent(row)}
                    </TableCell>
                  </TableRow>
                )}
              </div>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}

// ============================================================================
// Primitive table components for custom layouts (forwardRef-based)
// ============================================================================

import * as React from 'react';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 [&_tr]:border-b', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-slate-200 dark:divide-slate-800 [&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-slate-100/50 font-medium dark:bg-slate-800/50 [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-slate-200 transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50 dark:data-[state=selected]:bg-slate-800',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-slate-500 dark:text-slate-400', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
