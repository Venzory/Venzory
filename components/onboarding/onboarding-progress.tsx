import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  steps: string[];
  currentStepIndex: number;
}

export function OnboardingProgress({ steps, currentStepIndex }: OnboardingProgressProps) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-200 dark:bg-slate-800" />
      <div 
        className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-500 transition-all duration-500" 
        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
      />
      
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300",
                  isCompleted ? "bg-emerald-500 text-white" : 
                  isCurrent ? "bg-white ring-2 ring-emerald-500 text-emerald-600 dark:bg-slate-900" : 
                  "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium capitalize",
                isCompleted || isCurrent ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

