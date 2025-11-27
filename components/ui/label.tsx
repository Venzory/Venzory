import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Optional description text */
  description?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, description, children, ...props }, ref) => (
    <div className="space-y-1">
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-200',
          className
        )}
        {...props}
      >
        {children}
      </label>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
  )
);
Label.displayName = 'Label';

export { Label };

