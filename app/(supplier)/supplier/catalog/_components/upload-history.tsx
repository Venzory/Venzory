'use client';

import { formatDistanceToNow } from 'date-fns';
import { FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { SupplierCatalogUpload } from '@prisma/client';

interface UploadHistoryProps {
  uploads: SupplierCatalogUpload[];
}

export function UploadHistory({ uploads }: UploadHistoryProps) {
  if (uploads.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No uploads yet. Upload your first catalog to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              File
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rows
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Results
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {uploads.map((upload) => (
            <tr key={upload.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {upload.filename}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={upload.status} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {upload.rowCount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {upload.successCount} success
                  </span>
                  {upload.failedCount > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      {upload.failedCount} failed
                    </span>
                  )}
                  {upload.reviewCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {upload.reviewCount} review
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          Processing
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Unknown
        </span>
      );
  }
}

