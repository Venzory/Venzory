'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingSessionRefresh } from '@/hooks/use-onboarding-session-refresh';

export function useOnboardingCompletion() {
  const router = useRouter();
  const { toast } = useToast();
  const refreshSessionStatus = useOnboardingSessionRefresh();
  const [isCompleting, setIsCompleting] = useState(false);

  const redirectToDashboard = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
      window.location.assign('/dashboard');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();
      if (result.success) {
        localStorage.removeItem('venzory-onboarding-state');
        toast({
          title: "You're all set!",
          description: 'Welcome to your dashboard.',
        });
        await refreshSessionStatus('complete');
        redirectToDashboard();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete onboarding',
          variant: 'destructive',
        });
        setIsCompleting(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
      setIsCompleting(false);
    }
  }, [refreshSessionStatus, redirectToDashboard, toast]);

  const handleSkip = useCallback(async () => {
    setIsCompleting(true);
    try {
      const result = await skipOnboarding();
      if (result.success) {
        localStorage.removeItem('venzory-onboarding-state');
        toast({
          title: 'Setup skipped',
          description: 'You can finish setting up later.',
        });
        await refreshSessionStatus('skip');
        redirectToDashboard();
      } else {
        setIsCompleting(false);
      }
    } catch (error) {
      setIsCompleting(false);
    }
  }, [refreshSessionStatus, redirectToDashboard, toast]);

  return {
    handleComplete,
    handleSkip,
    isCompleting,
  };
}


