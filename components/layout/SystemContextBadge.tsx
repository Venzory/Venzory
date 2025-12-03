'use client';

import { usePathname } from 'next/navigation';
import { Shield, Database } from 'lucide-react';

type SystemContext = 'owner' | 'admin' | null;

interface SystemContextBadgeProps {
  className?: string;
}

export function SystemContextBadge({ className = '' }: SystemContextBadgeProps) {
  const pathname = usePathname();

  const getContext = (): SystemContext => {
    if (pathname.startsWith('/owner')) return 'owner';
    if (pathname.startsWith('/admin')) return 'admin';
    return null;
  };

  const context = getContext();

  if (!context) return null;

  const config = {
    owner: {
      label: 'Owner Portal',
      sublabel: 'Platform Management',
      icon: Shield,
      bgClass: 'bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-950/50 dark:to-amber-900/30',
      borderClass: 'border-amber-300 dark:border-amber-700',
      textClass: 'text-amber-800 dark:text-amber-200',
      iconClass: 'text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500',
    },
    admin: {
      label: 'Admin Console',
      sublabel: 'Data Stewardship',
      icon: Database,
      bgClass: 'bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-950/50 dark:to-indigo-900/30',
      borderClass: 'border-indigo-300 dark:border-indigo-700',
      textClass: 'text-indigo-800 dark:text-indigo-200',
      iconClass: 'text-indigo-600 dark:text-indigo-400',
      dotClass: 'bg-indigo-500',
    },
  };

  const { label, sublabel, icon: Icon, bgClass, borderClass, textClass, iconClass, dotClass } = config[context];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bgClass} ${borderClass} ${className}`}
    >
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-semibold leading-tight ${textClass}`}>{label}</span>
        <span className={`text-[10px] leading-tight ${textClass} opacity-70`}>{sublabel}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`} />
    </div>
  );
}

/**
 * Compact version for use in tight spaces like mobile headers
 */
export function SystemContextBadgeCompact({ className = '' }: SystemContextBadgeProps) {
  const pathname = usePathname();

  const getContext = (): SystemContext => {
    if (pathname.startsWith('/owner')) return 'owner';
    if (pathname.startsWith('/admin')) return 'admin';
    return null;
  };

  const context = getContext();

  if (!context) return null;

  const config = {
    owner: {
      label: 'Owner',
      icon: Shield,
      bgClass: 'bg-amber-100 dark:bg-amber-900/50',
      textClass: 'text-amber-800 dark:text-amber-200',
    },
    admin: {
      label: 'Admin',
      icon: Database,
      bgClass: 'bg-indigo-100 dark:bg-indigo-900/50',
      textClass: 'text-indigo-800 dark:text-indigo-200',
    },
  };

  const { label, icon: Icon, bgClass, textClass } = config[context];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${bgClass} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${textClass}`} />
      <span className={`text-xs font-medium ${textClass}`}>{label}</span>
    </div>
  );
}

