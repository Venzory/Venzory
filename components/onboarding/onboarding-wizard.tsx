'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

import { StepPracticeDetails } from './step-practice-details';
import { StepFirstLocation } from './step-first-location';
import { StepInviteTeam } from './step-invite-team';
import { OnboardingProgress } from './onboarding-progress';
import { useOnboardingCompletion } from '@/hooks/use-onboarding-completion';
import { getPathOnCurrentOrigin } from '@/lib/current-origin';

type Step = 'details' | 'location' | 'team';

const STEPS: Step[] = ['details', 'location', 'team'];

interface OnboardingWizardProps {
  initialPracticeName?: string;
  initialEmail?: string;
}

export function OnboardingWizard({ initialPracticeName = '', initialEmail = '' }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { handleComplete, handleSkip, isCompleting } = useOnboardingCompletion();

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
      <div className="space-y-4 text-center">
        <button 
          type="button"
          onClick={handleSkip}
          disabled={isCompleting}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-300"
        >
          {isCompleting ? 'Skipping...' : 'Skip setup for now'}
        </button>

        <div>
          <button
            type="button"
            onClick={() => {
              const callbackUrl = getPathOnCurrentOrigin('/login');
              void signOut({ callbackUrl });
            }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Wrong account? Log out
          </button>
        </div>
      </div>
    </div>
  );
}
