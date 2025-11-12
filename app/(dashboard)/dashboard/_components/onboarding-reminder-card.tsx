'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Store, Package, ShoppingCart, CheckCircle2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resetOnboarding } from '@/app/(dashboard)/_actions/onboarding-actions';
import { toast } from '@/lib/toast';

interface OnboardingReminderCardProps {
  hasSuppliers: boolean;
  hasItems: boolean;
  hasOrders: boolean;
}

export function OnboardingReminderCard({ hasSuppliers, hasItems, hasOrders }: OnboardingReminderCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(true);

  const handleResumeSetup = () => {
    startTransition(async () => {
      const result = await resetOnboarding();
      if (result.success) {
        toast.success('Onboarding resumed. Follow the guide in the side panel.');
        // Reload to trigger onboarding
        window.location.reload();
      } else {
        toast.error('Failed to resume onboarding');
      }
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const completedSteps = [hasSuppliers, hasItems, hasOrders].filter(Boolean).length;
  const totalSteps = 3;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 border-sky-200 dark:border-sky-800">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Complete Your Setup
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {completedSteps === 0 
              ? "Let's get your practice up and running with suppliers, items, and orders."
              : `You're ${completedSteps} of ${totalSteps} steps complete. Finish setting up to unlock the full potential of Remcura.`
            }
          </p>

          {/* Progress indicators */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              {hasSuppliers ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <Store className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasSuppliers ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                Link your first supplier
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasItems ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasItems ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                Add items to your catalog
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasOrders ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasOrders ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                Create your first order
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-600 dark:bg-sky-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleResumeSetup}
              disabled={isPending}
            >
              {completedSteps === 0 ? 'Start Setup' : 'Resume Setup'}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

