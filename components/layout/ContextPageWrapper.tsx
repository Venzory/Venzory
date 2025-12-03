import type { ReactNode } from 'react';
import { Shield, Database } from 'lucide-react';

type PageContext = 'owner' | 'admin' | 'default';

interface ContextPageWrapperProps {
  context: PageContext;
  children: ReactNode;
}

/**
 * Wraps page content with a subtle accent header based on the current system context.
 * Use this for owner portal and admin console pages to provide visual context.
 */
export function ContextPageWrapper({ context, children }: ContextPageWrapperProps) {
  if (context === 'default') {
    return <>{children}</>;
  }

  const config = {
    owner: {
      label: 'Owner Portal',
      sublabel: 'Platform Management',
      icon: Shield,
      barClass: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500',
      bgClass: 'bg-amber-50/30 dark:bg-amber-950/10',
      textClass: 'text-amber-800 dark:text-amber-200',
      iconClass: 'text-amber-600 dark:text-amber-400',
    },
    admin: {
      label: 'Admin Console',
      sublabel: 'Data Stewardship',
      icon: Database,
      barClass: 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500',
      bgClass: 'bg-indigo-50/30 dark:bg-indigo-950/10',
      textClass: 'text-indigo-800 dark:text-indigo-200',
      iconClass: 'text-indigo-600 dark:text-indigo-400',
    },
  };

  const { label, sublabel, icon: Icon, barClass, bgClass, textClass, iconClass } = config[context];

  return (
    <div className="relative">
      {/* Accent bar at the very top */}
      <div className={`h-1 w-full ${barClass}`} />
      
      {/* Context indicator strip */}
      <div className={`border-b border-slate-200 dark:border-slate-800 ${bgClass}`}>
        <div className="flex items-center gap-3 px-6 py-2">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
            <span className={`text-xs ${textClass} opacity-60`}>• {sublabel}</span>
          </div>
        </div>
      </div>
      
      {/* Page content */}
      <div className="min-h-0">
        {children}
      </div>
    </div>
  );
}

