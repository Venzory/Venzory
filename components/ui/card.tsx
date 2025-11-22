import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Card container component
 */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-card-border bg-card p-6 shadow-sm dark:bg-card/60 dark:shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Header section of a card
 */
export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {children}
    </div>
  );
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

/**
 * Title within a card header
 */
export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h2 className={cn('text-xl font-semibold text-slate-900 dark:text-white', className)} {...props}>
      {children}
    </h2>
  );
}

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

/**
 * Description text within a card header
 */
export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Main content area of a card
 */
export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
