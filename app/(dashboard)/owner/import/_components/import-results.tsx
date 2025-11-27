'use client';

import { type ImportResult, type ImportItemResult } from '../actions';
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

interface ImportResultsProps {
  result: ImportResult;
}

function getMethodBadgeVariant(method: string | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (method) {
    case 'EXACT_GTIN':
      return 'default';
    case 'FUZZY_NAME':
      return 'secondary';
    case 'SUPPLIER_MAPPED':
      return 'outline';
    case 'MANUAL':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getConfidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-slate-400';
  if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function formatConfidence(confidence: number | null): string {
  if (confidence === null) return '-';
  return `${Math.round(confidence * 100)}%`;
}

function ResultRow({ item }: { item: ImportItemResult }) {
  return (
    <TableRow className={item.needsReview ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
      <TableCell className="font-mono text-sm">{item.rowIndex + 1}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{item.originalName || '-'}</span>
          {item.originalSku && (
            <span className="text-xs text-muted-foreground">SKU: {item.originalSku}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{item.originalGtin || '-'}</TableCell>
      <TableCell>
        {item.success ? (
          <Badge variant="default" className="bg-green-600">Success</Badge>
        ) : (
          <Badge variant="destructive">Failed</Badge>
        )}
      </TableCell>
      <TableCell>
        {item.matchMethod && (
          <Badge variant={getMethodBadgeVariant(item.matchMethod)}>
            {item.matchMethod.replace('_', ' ')}
          </Badge>
        )}
      </TableCell>
      <TableCell className={getConfidenceColor(item.matchConfidence)}>
        {formatConfidence(item.matchConfidence)}
      </TableCell>
      <TableCell>
        {item.needsReview ? (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            Needs Review
          </Badge>
        ) : (
          <span className="text-green-600">✓</span>
        )}
      </TableCell>
      <TableCell>
        {item.enriched ? (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            Enriched
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {item.errors.length > 0 && (
          <div className="text-sm text-red-600">
            {item.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
        {item.warnings.length > 0 && (
          <div className="text-sm text-yellow-600">
            {item.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ImportResults({ result }: ImportResultsProps) {
  if (!result.items || result.items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Results</CardTitle>
        <CardDescription>
          Import ID: {result.importId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{result.totalRows}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {result.successCount}
            </div>
            <div className="text-sm text-green-600 dark:text-green-500">Succeeded</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {result.failedCount}
            </div>
            <div className="text-sm text-red-600 dark:text-red-500">Failed</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {result.reviewCount}
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-500">Need Review</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {result.enrichedCount}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-500">Enriched</div>
          </div>
        </div>

        {/* Results Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Row</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>GTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Match Method</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Enriched</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item) => (
                <ResultRow key={item.rowIndex} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

