'use client';

import { useEffect } from 'react';

import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingPanel } from '@/components/onboarding/onboarding-panel';

interface OnboardingWrapperProps {
  children: React.ReactNode;
  shouldShowOnboarding: boolean;
  hasLocations: boolean;
  hasSuppliers: boolean;
  hasItems: boolean;
  hasReceivedOrders: boolean;
}

/**
 * Wrapper component that conditionally shows the onboarding panel
 * based on practice state and user progress
 */
export function OnboardingWrapper({
  children,
  shouldShowOnboarding,
  hasLocations,
  hasSuppliers,
  hasItems,
  hasReceivedOrders,
}: OnboardingWrapperProps) {
  const { isOpen, openOnboarding, setStep } = useOnboarding();

  // Automatically open onboarding if conditions are met
  useEffect(() => {
    if (shouldShowOnboarding && !isOpen) {
      // Determine the appropriate step based on what's completed (in priority order)
      if (!hasLocations) {
        setStep('locations');
      } else if (!hasSuppliers) {
        setStep('suppliers');
      } else if (!hasItems) {
        setStep('items');
      } else if (!hasReceivedOrders) {
        setStep('orders');
      }
      
      // Open the panel
      openOnboarding();
    }
  }, [shouldShowOnboarding, isOpen, hasLocations, hasSuppliers, hasItems, hasReceivedOrders, openOnboarding, setStep]);

  return (
    <>
      {children}
      {shouldShowOnboarding && (
        <OnboardingPanel
          hasLocations={hasLocations}
          hasSuppliers={hasSuppliers}
          hasItems={hasItems}
          hasReceivedOrders={hasReceivedOrders}
        />
      )}
    </>
  );
}

