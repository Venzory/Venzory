'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { StepPracticeDetails } from './step-practice-details';
import { StepFirstLocation } from './step-first-location';
import { StepInviteTeam } from './step-invite-team';
import { OnboardingProgress } from './onboarding-progress';
import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';

type Step = 'details' | 'location' | 'team';

const STEPS: Step[] = ['details', 'location', 'team'];

interface OnboardingWizardProps {
  initialPracticeName?: string;
  initialEmail?: string;
}

export function OnboardingWizard({ initialPracticeName = '', initialEmail = '' }: OnboardingWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { update: updateSession } = useSession();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentStep = STEPS[currentStepIndex];

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();
      if (result.success) {
        toast({
          title: "You're all set!",
          description: "Welcome to your dashboard.",
        });
        await updateSession(); // Refresh session to reflect onboarding status
        router.push('/dashboard');
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
  };

  const handleSkip = async () => {
    setIsCompleting(true);
    try {
      const result = await skipOnboarding();
      if (result.success) {
        toast({
            title: "Setup skipped",
            description: "You can finish setting up later.",
        });
        await updateSession();
        router.push('/dashboard');
      } else {
        setIsCompleting(false);
      }
    } catch (error) {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <OnboardingProgress 
        steps={STEPS} 
        currentStepIndex={currentStepIndex} 
      />
      
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {currentStep === 'details' && (
          <StepPracticeDetails 
            onNext={nextStep} 
            initialName={initialPracticeName}
            initialEmail={initialEmail}
          />
        )}
        
        {currentStep === 'location' && (
          <StepFirstLocation 
            onNext={nextStep} 
            onBack={prevStep} 
          />
        )}
        
        {currentStep === 'team' && (
          <StepInviteTeam 
            onNext={handleComplete} 
            onBack={prevStep}
            isCompleting={isCompleting}
            onSkip={handleSkip}
          />
        )}
      </div>

      {/* Global Skip Option */}
      <div className="text-center">
        <button 
          type="button"
          onClick={handleSkip}
          disabled={isCompleting}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-300"
        >
          {isCompleting ? 'Skipping...' : 'Skip setup for now'}
        </button>
      </div>
    </div>
  );
}
