'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-table';

interface ImportHistoryItem {
  id: string;
  supplierName: string;
  filename: string;
  rowCount: number;
  successCount: number;
  failedCount: number;
  reviewCount: number;
  enrichedCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface ImportHistoryProps {
  uploads: ImportHistoryItem[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    case 'PROCESSING':
      return <Badge variant="secondary">Processing</Badge>;
    case 'FAILED':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(date: Date | null | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'PPp');
}

export function ImportHistory({ uploads }: ImportHistoryProps) {
  if (uploads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>No imports yet. Upload a CSV file to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
        <CardDescription>Recent supplier catalog imports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Review</TableHead>
                <TableHead className="text-right">Enriched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="text-sm">
                    {formatDate(upload.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{upload.supplierName}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm" title={upload.filename}>
                    {upload.filename}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(upload.status)}
                    {upload.errorMessage && (
                      <span className="ml-2 text-xs text-red-600" title={upload.errorMessage}>
                        ⚠
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{upload.rowCount}</TableCell>
                  <TableCell className="text-right text-green-600">{upload.successCount}</TableCell>
                  <TableCell className="text-right text-red-600">{upload.failedCount}</TableCell>
                  <TableCell className="text-right text-amber-600">{upload.reviewCount}</TableCell>
                  <TableCell className="text-right text-blue-600">{upload.enrichedCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

