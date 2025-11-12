'use client';

import { useEffect } from 'react';

import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingPanel } from '@/components/onboarding/onboarding-panel';

interface OnboardingWrapperProps {
  children: React.ReactNode;
  shouldShowOnboarding: boolean;
  hasSuppliers: boolean;
  hasItems: boolean;
  hasOrders: boolean;
}

/**
 * Wrapper component that conditionally shows the onboarding panel
 * based on practice state and user progress
 */
export function OnboardingWrapper({
  children,
  shouldShowOnboarding,
  hasSuppliers,
  hasItems,
  hasOrders,
}: OnboardingWrapperProps) {
  const { isOpen, openOnboarding, setStep } = useOnboarding();

  // Automatically open onboarding if conditions are met
  useEffect(() => {
    if (shouldShowOnboarding && !isOpen) {
      // Determine the appropriate step based on what's completed
      if (!hasSuppliers) {
        setStep('suppliers');
      } else if (!hasItems) {
        setStep('items');
      } else if (!hasOrders) {
        setStep('orders');
      }
      
      // Open the panel
      openOnboarding();
    }
  }, [shouldShowOnboarding, isOpen, hasSuppliers, hasItems, hasOrders, openOnboarding, setStep]);

  return (
    <>
      {children}
      {shouldShowOnboarding && (
        <OnboardingPanel
          hasSuppliers={hasSuppliers}
          hasItems={hasItems}
          hasOrders={hasOrders}
        />
      )}
    </>
  );
}

