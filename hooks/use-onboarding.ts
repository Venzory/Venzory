'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type OnboardingStep = 'suppliers' | 'items' | 'orders' | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  isOpen: boolean;
}

const STORAGE_KEY = 'remcura-onboarding-state';

/**
 * Hook to manage onboarding state with localStorage persistence
 */
export function useOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'suppliers',
    isOpen: false,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OnboardingState;
        setState(parsed);
      } catch (error) {
        console.error('Failed to parse onboarding state from localStorage', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const openOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const stepOrder: OnboardingStep[] = ['suppliers', 'items', 'orders', 'complete'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      const nextIndex = Math.min(currentIndex + 1, stepOrder.length - 1);
      return { ...prev, currentStep: stepOrder[nextIndex] };
    });
  }, []);

  const goToStepPage = useCallback((step: OnboardingStep) => {
    setStep(step);
    
    // Navigate to the appropriate page for the step
    const pageMap: Record<OnboardingStep, string> = {
      suppliers: '/suppliers',
      items: '/my-items',
      orders: '/orders/new',
      complete: '/dashboard',
    };
    
    router.push(pageMap[step]);
  }, [router, setStep]);

  const clearOnboardingState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ currentStep: 'suppliers', isOpen: false });
  }, []);

  // Check if we're on the page for the current step
  const isOnStepPage = useCallback(() => {
    const stepPaths: Record<OnboardingStep, string[]> = {
      suppliers: ['/suppliers'],
      items: ['/my-items', '/supplier-catalog'],
      orders: ['/orders/new', '/orders'],
      complete: ['/dashboard'],
    };

    return stepPaths[state.currentStep]?.some(path => pathname.startsWith(path)) ?? false;
  }, [pathname, state.currentStep]);

  return {
    currentStep: state.currentStep,
    isOpen: state.isOpen,
    openOnboarding,
    closeOnboarding,
    setStep,
    nextStep,
    goToStepPage,
    clearOnboardingState,
    isOnStepPage,
  };
}

