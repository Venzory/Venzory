'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOnboardingCompletion } from '@/hooks/use-onboarding-completion';

interface SetupChecklistProps {
  onboardingStatus: {
    onboardingCompletedAt: Date | null;
    onboardingSkippedAt: Date | null;
  };
  progress: {
    hasLocations: boolean;
    hasSuppliers: boolean;
    hasItems: boolean;
    hasOrders: boolean;
    hasReceivedOrders: boolean;
  };
}

export function SetupChecklist({ onboardingStatus, progress }: SetupChecklistProps) {
  const { handleComplete, handleSkip, isCompleting } = useOnboardingCompletion();
  // Logic:
  // Show if skipped (status.onboardingSkippedAt)
  // OR if completed (status.onboardingCompletedAt) BUT missing key operational data
  // If completed and everything is set up, don't show.
  
  const isSkipped = !!onboardingStatus.onboardingSkippedAt;
  const isCompleted = !!onboardingStatus.onboardingCompletedAt;
  
  // "Done" definition: has suppliers, has items, has received at least one order
  const isFullyOperational = progress.hasSuppliers && progress.hasItems && progress.hasReceivedOrders;
  
  if (isCompleted && isFullyOperational) {
    return null;
  }

  // Checklist items
  const items = [
    {
      id: 'locations',
      label: 'Set up storage locations',
      completed: progress.hasLocations,
      href: '/locations',
      description: 'Define where you store your inventory'
    },
    {
      id: 'suppliers',
      label: 'Add suppliers',
      completed: progress.hasSuppliers,
      href: '/suppliers',
      description: 'Connect with your vendors'
    },
    {
      id: 'items',
      label: 'Create or import items',
      completed: progress.hasItems,
      href: '/my-items',
      description: 'Build your product catalog'
    },
    {
      id: 'order',
      label: 'Place your first order',
      completed: progress.hasOrders,
      href: '/orders/new',
      description: 'Test the ordering flow'
    },
    {
      id: 'receive',
      label: 'Receive an order',
      completed: progress.hasReceivedOrders,
      href: '/receiving',
      description: 'Update stock levels when goods arrive'
    }
  ];
  
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  const showCompleteAction = !isCompleted;
  const showSkipAction = !isSkipped;

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
               {isSkipped ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {isSkipped ? 'Complete your setup' : 'Getting started'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {completedCount} of {totalCount} steps completed ({percent}%)
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="hidden w-32 md:block">
             <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                <div 
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${percent}%` }}
                />
             </div>
          </div>
          {(showCompleteAction || showSkipAction) && (
            <div className="flex flex-wrap items-center gap-2">
              {showCompleteAction && (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? 'Finishing...' : 'Mark setup complete'}
                </Button>
              )}
              {showSkipAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isCompleting}
                >
                  {isCompleting ? 'Skipping...' : 'Skip for now'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <Link 
            key={item.id} 
            href={item.href}
            className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-4">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              )}
              <div>
                <h4 className={cn(
                    "text-sm font-medium",
                    item.completed ? "text-slate-900 line-through opacity-70 dark:text-white" : "text-slate-900 dark:text-white"
                )}>
                    {item.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
            </div>
            
            {!item.completed && (
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
