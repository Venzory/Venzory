import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed p-12 text-center">
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <p className="text-base font-semibold text-slate-900 dark:text-slate-200">{title}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

