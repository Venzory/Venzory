'use client';

import { useState, useTransition, useEffect } from 'react';
import { Sparkles, Store, Package, ShoppingCart, CheckCircle2, MapPin, X } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resetOnboarding, skipOnboarding } from '@/app/(dashboard)/_actions/onboarding-actions';
import { toast } from '@/lib/toast';

interface OnboardingReminderCardProps {
  hasLocations: boolean;
  hasSuppliers: boolean;
  hasItems: boolean;
  hasReceivedOrders: boolean;
}

const COLLAPSED_STATE_KEY = 'remcura-onboarding-banner-collapsed';

export function OnboardingReminderCard({ hasLocations, hasSuppliers, hasItems, hasReceivedOrders }: OnboardingReminderCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_STATE_KEY);
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const handleResumeSetup = () => {
    startTransition(async () => {
      const result = await resetOnboarding();
      if (result.success) {
        // Collapse the banner after clicking
        localStorage.setItem(COLLAPSED_STATE_KEY, 'true');
        setIsCollapsed(true);
        toast.success('Onboarding resumed. Follow the guide in the side panel.');
        // Reload to trigger onboarding
        window.location.reload();
      } else {
        toast.error('Failed to resume onboarding');
      }
    });
  };

  const handleDontShowAgain = () => {
    startTransition(async () => {
      const result = await skipOnboarding();
      if (result.success) {
        localStorage.removeItem(COLLAPSED_STATE_KEY);
        setIsVisible(false);
        toast.success('Onboarding dismissed. You can resume from settings anytime.');
      } else {
        toast.error('Failed to dismiss onboarding');
      }
    });
  };

  const handleExpand = () => {
    localStorage.removeItem(COLLAPSED_STATE_KEY);
    setIsCollapsed(false);
  };

  if (!isVisible) {
    return null;
  }

  const completedSteps = [hasLocations, hasSuppliers, hasItems, hasReceivedOrders].filter(Boolean).length;
  const totalSteps = 4;
  const progress = (completedSteps / totalSteps) * 100;

  // Collapsed state - slim banner
  if (isCollapsed) {
    return (
      <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 border-sky-200 dark:border-sky-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Setup in progress
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {completedSteps} of {totalSteps} steps complete
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExpand}
            disabled={isPending}
          >
            Open Guide
          </Button>
        </div>
      </Card>
    );
  }

  // Expanded state - full banner
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
              ? "Let's get your practice up and running with locations, suppliers, items, and orders."
              : `You're ${completedSteps} of ${totalSteps} steps complete. Finish setting up to unlock the full potential of Remcura.`
            }
          </p>

          {/* Progress indicators */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              {hasLocations ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasLocations ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                Set up your first storage location
              </span>
            </div>
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
              {hasReceivedOrders ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasReceivedOrders ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                Create and receive your first order
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
              onClick={handleDontShowAgain}
              disabled={isPending}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

