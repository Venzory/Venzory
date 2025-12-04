'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  X,
  Check,
  Building2,
  Loader2,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  MessageSquare,
  Package,
  ShoppingCart,
  User,
  Calendar,
} from 'lucide-react';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import type { ReceivingMismatchWithRelations } from '@/src/services/receiving';
import {
  resolveMismatchAction,
  flagMismatchForSupplierAction,
  appendMismatchNoteAction,
} from '../../actions';

interface MismatchDetailDrawerProps {
  mismatch: ReceivingMismatchWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function getMismatchTypeIcon(type: string) {
  switch (type) {
    case 'SHORT':
      return <ArrowDown className="h-5 w-5" />;
    case 'OVER':
      return <ArrowUp className="h-5 w-5" />;
    case 'DAMAGE':
      return <AlertTriangle className="h-5 w-5" />;
    case 'SUBSTITUTION':
      return <RefreshCw className="h-5 w-5" />;
    default:
      return null;
  }
}

function getMismatchTypeBadgeVariant(type: string) {
  switch (type) {
    case 'SHORT':
      return 'warning';
    case 'OVER':
      return 'info';
    case 'DAMAGE':
      return 'destructive';
    case 'SUBSTITUTION':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getMismatchTypeLabel(type: string, variance: number) {
  switch (type) {
    case 'SHORT':
      return `Short (${Math.abs(variance)} missing)`;
    case 'OVER':
      return `Over (+${variance} extra)`;
    case 'DAMAGE':
      return 'Damaged goods';
    case 'SUBSTITUTION':
      return 'Substitution';
    default:
      return type;
  }
}

function getMismatchStatusBadge(status: string) {
  switch (status) {
    case 'OPEN':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Open
        </Badge>
      );
    case 'RESOLVED':
      return (
        <Badge variant="success" className="gap-1">
          <Check className="h-3 w-3" />
          Resolved
        </Badge>
      );
    case 'NEEDS_SUPPLIER_CORRECTION':
      return (
        <Badge variant="destructive" className="gap-1">
          <Building2 className="h-3 w-3" />
          Needs Supplier
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function MismatchDetailDrawer({
  mismatch,
  isOpen,
  onClose,
  onUpdated,
}: MismatchDetailDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const handleResolve = useCallback(async () => {
    if (!mismatch) return;

    setIsSubmitting(true);
    try {
      const result = await resolveMismatchAction(mismatch.id, resolutionNote || undefined);

      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Mismatch marked as resolved');
        setResolutionNote('');
        onUpdated();
      }
    } catch (error) {
      toast.error('Failed to resolve mismatch');
    } finally {
      setIsSubmitting(false);
    }
  }, [mismatch, resolutionNote, onUpdated]);

  const handleFlagForSupplier = useCallback(async () => {
    if (!mismatch) return;

    setIsSubmitting(true);
    try {
      const result = await flagMismatchForSupplierAction(mismatch.id, resolutionNote || undefined);

      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Mismatch flagged for supplier correction');
        setResolutionNote('');
        onUpdated();
      }
    } catch (error) {
      toast.error('Failed to flag mismatch');
    } finally {
      setIsSubmitting(false);
    }
  }, [mismatch, resolutionNote, onUpdated]);

  const handleAddNote = useCallback(async () => {
    if (!mismatch || !newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await appendMismatchNoteAction(mismatch.id, newNote.trim());

      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Note added');
        setNewNote('');
        setShowNoteForm(false);
        onUpdated();
      }
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  }, [mismatch, newNote, onUpdated]);

  if (!mismatch) return null;

  const isResolved = mismatch.status === 'RESOLVED';
  const supplierName =
    mismatch.practiceSupplier?.customLabel ||
    mismatch.practiceSupplier?.globalSupplier?.name ||
    'Unknown Supplier';

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Mismatch Details"
      description={mismatch.item.name}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          {!isResolved && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleFlagForSupplier}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Building2 className="mr-2 h-4 w-4" />
                )}
                Flag for Supplier
              </Button>
              <Button variant="primary" onClick={handleResolve} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Mark Resolved
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Type and Status Header */}
        <div className="flex items-center justify-between">
          <Badge
            variant={getMismatchTypeBadgeVariant(mismatch.type) as any}
            className="gap-2 text-sm px-3 py-1.5"
          >
            {getMismatchTypeIcon(mismatch.type)}
            {getMismatchTypeLabel(mismatch.type, mismatch.varianceQuantity)}
          </Badge>
          {getMismatchStatusBadge(mismatch.status)}
        </div>

        {/* Quantity Details */}
        <div className="rounded-lg border border-card-border bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ordered</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {mismatch.orderedQuantity}
              </p>
              <p className="text-xs text-slate-500">{mismatch.item.unit || 'units'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Received</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {mismatch.receivedQuantity}
              </p>
              <p className="text-xs text-slate-500">{mismatch.item.unit || 'units'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Variance</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  mismatch.varianceQuantity > 0
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {mismatch.varianceQuantity > 0 ? '+' : ''}
                {mismatch.varianceQuantity}
              </p>
              <p className="text-xs text-slate-500">{mismatch.item.unit || 'units'}</p>
            </div>
          </div>
        </div>

        {/* Context Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Context</h4>

          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {/* Item */}
            <div className="flex items-center gap-3 p-3">
              <Package className="h-4 w-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Item</p>
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {mismatch.item.name}
                </p>
                {mismatch.item.sku && (
                  <p className="text-xs text-slate-500">{mismatch.item.sku}</p>
                )}
              </div>
            </div>

            {/* Order */}
            {mismatch.order && (
              <div className="flex items-center gap-3 p-3">
                <ShoppingCart className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Order</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {mismatch.order.reference || `#${mismatch.orderId?.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            )}

            {/* Supplier */}
            {mismatch.practiceSupplier && (
              <div className="flex items-center gap-3 p-3">
                <Building2 className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Supplier</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{supplierName}</p>
                </div>
              </div>
            )}

            {/* Receipt */}
            <div className="flex items-center gap-3 p-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Received</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {mismatch.goodsReceipt?.receivedAt
                    ? format(new Date(mismatch.goodsReceipt.receivedAt), 'MMM d, yyyy HH:mm')
                    : format(new Date(mismatch.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
                {mismatch.goodsReceipt?.location && (
                  <p className="text-xs text-slate-500">{mismatch.goodsReceipt.location.name}</p>
                )}
              </div>
            </div>

            {/* Created By */}
            {mismatch.createdBy && (
              <div className="flex items-center gap-3 p-3">
                <User className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Logged By</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {mismatch.createdBy.name || mismatch.createdBy.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</h4>
            {!isResolved && !showNoteForm && (
              <Button variant="ghost" size="sm" onClick={() => setShowNoteForm(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            )}
          </div>

          {/* Original Note */}
          {mismatch.note && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Initial Note
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{mismatch.note}</p>
            </div>
          )}

          {/* Resolution Notes */}
          {mismatch.resolutionNote && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Resolution Notes
              </p>
              <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                {mismatch.resolutionNote}
              </pre>
            </div>
          )}

          {/* Add Note Form */}
          {showNoteForm && (
            <div className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNoteForm(false);
                    setNewNote('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Note'}
                </Button>
              </div>
            </div>
          )}

          {/* No notes placeholder */}
          {!mismatch.note && !mismatch.resolutionNote && !showNoteForm && (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No notes added</p>
          )}
        </div>

        {/* Resolution Note Input (for resolve/flag actions) */}
        {!isResolved && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Resolution Note (optional)
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Add a note when resolving or flagging..."
              rows={2}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        )}

        {/* Resolution Info */}
        {isResolved && mismatch.resolvedAt && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Resolved</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {format(new Date(mismatch.resolvedAt), 'MMM d, yyyy HH:mm')}
                  {mismatch.resolvedBy && (
                    <> by {mismatch.resolvedBy.name || mismatch.resolvedBy.email}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TODO: Integration point for Admin Console queue and Supplier Hub */}
      </div>
    </SlideOver>
  );
}

