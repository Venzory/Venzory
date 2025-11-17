'use client';

import { useState, useTransition } from 'react';
import { X, Store, Package, ShoppingCart, CheckCircle2, ArrowRight, MapPin } from 'lucide-react';

import { useOnboarding, type OnboardingStep } from '@/hooks/use-onboarding';
import { markOnboardingComplete, skipOnboarding } from '@/app/(dashboard)/_actions/onboarding-actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface OnboardingPanelProps {
  hasLocations: boolean;
  hasSuppliers: boolean;
  hasItems: boolean;
  hasReceivedOrders: boolean;
}

interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: typeof Store;
  actionLabel: string;
  completed: boolean;
}

export function OnboardingPanel({ hasLocations, hasSuppliers, hasItems, hasReceivedOrders }: OnboardingPanelProps) {
  const { currentStep, isOpen, closeOnboarding, nextStep, goToStepPage, clearOnboardingState } = useOnboarding();
  const [isPending, startTransition] = useTransition();

  const steps: StepConfig[] = [
    {
      id: 'locations',
      title: 'Set Up Your First Storage Location',
      description: 'Create storage locations to track where inventory is kept. This could be a room, cabinet, or any organizational unit.',
      icon: MapPin,
      actionLabel: hasLocations ? 'Location created ✓' : 'Create Location',
      completed: hasLocations,
    },
    {
      id: 'suppliers',
      title: 'Link Your First Supplier',
      description: 'Connect to suppliers to start ordering products. You can manage account numbers and preferences for each supplier.',
      icon: Store,
      actionLabel: hasSuppliers ? 'Supplier linked ✓' : 'Go to Suppliers',
      completed: hasSuppliers,
    },
    {
      id: 'items',
      title: 'Add Items to Your Catalog',
      description: 'Build your practice catalog by adding items from supplier catalogs or creating custom items.',
      icon: Package,
      actionLabel: hasItems ? 'Items added ✓' : 'Browse Catalog',
      completed: hasItems,
    },
    {
      id: 'orders',
      title: 'Create and Receive Your First Order',
      description: 'Place your first order to your linked supplier, then receive it into your inventory to complete the setup.',
      icon: ShoppingCart,
      actionLabel: hasReceivedOrders ? 'Order received ✓' : 'Create Order',
      completed: hasReceivedOrders,
    },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const currentStepConfig = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleSkip = () => {
    startTransition(async () => {
      const result = await skipOnboarding();
      if (result.success) {
        clearOnboardingState();
        closeOnboarding();
        toast.success('Onboarding skipped. You can resume from the dashboard anytime.');
      } else {
        toast.error('Failed to skip onboarding');
      }
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      const result = await markOnboardingComplete();
      if (result.success) {
        clearOnboardingState();
        closeOnboarding();
        toast.success('🎉 Setup complete! Welcome to Remcura.');
      } else {
        toast.error('Failed to complete onboarding');
      }
    });
  };

  const handleNextStep = () => {
    if (currentStepConfig.completed) {
      // Move to next step
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < steps.length) {
        const nextStepConfig = steps[nextStepIndex];
        goToStepPage(nextStepConfig.id);
      } else {
        // All steps completed
        handleComplete();
      }
    } else {
      // Navigate to the page for this step
      goToStepPage(currentStepConfig.id);
    }
  };

  // Check if all steps are completed
  const allCompleted = hasLocations && hasSuppliers && hasItems && hasReceivedOrders;

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop - semi-transparent, allows interaction with page */}
      <div 
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] animate-fade-in"
        onClick={closeOnboarding}
      />
      
      {/* Side Panel */}
      <div 
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Getting Started
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Let&apos;s set up your practice
              </p>
            </div>
            <button
              onClick={closeOnboarding}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              aria-label="Close onboarding"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-600 dark:bg-sky-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Step */}
          {currentStepConfig && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  currentStepConfig.completed 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                }`}>
                  {currentStepConfig.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <currentStepConfig.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {currentStepConfig.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {currentStepConfig.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                onClick={handleNextStep}
                disabled={isPending}
                className="w-full"
              >
                {currentStepConfig.completed ? (
                  allCompleted ? (
                    'Complete Setup'
                  ) : (
                    <>
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )
                ) : (
                  currentStepConfig.actionLabel
                )}
              </Button>
            </div>
          )}

          {/* All Steps Overview */}
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Setup Progress
            </h4>
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  step.id === currentStep
                    ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  step.completed
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : step.id === currentStep
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    step.id === currentStep
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {step.completed && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Skip Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSkip}
              disabled={isPending}
              className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors py-2"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

