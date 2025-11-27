import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Label text for the checkbox */
  label?: string;
  /** Description text below the label */
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, label, description, id, name, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    }

    const checkboxId = id || name;

    const checkbox = (
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        disabled={disabled}
        className={cn(
          "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );

    // Without label, return just the checkbox
    if (!label) {
      return checkbox;
    }

    // With label, return labeled version
    return (
      <label
        className={cn(
          "flex items-start gap-2 cursor-pointer",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {checkbox}
        <div className="flex-1">
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {label}
          </span>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </label>
    );
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
