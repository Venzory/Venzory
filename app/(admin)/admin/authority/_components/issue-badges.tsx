'use client';

import { 
  AlertTriangle, 
  HelpCircle, 
  GitMerge, 
  FileQuestion,
  Zap,
  ScanBarcode
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type IssueType = 
  | 'low-confidence' 
  | 'no-gtin' 
  | 'fuzzy-match' 
  | 'missing-data' 
  | 'duplicate-suspect'
  | 'needs-review';

interface IssueBadgeConfig {
  label: string;
  icon: typeof AlertTriangle;
  className: string;
}

const ISSUE_CONFIGS: Record<IssueType, IssueBadgeConfig> = {
  'low-confidence': {
    label: 'Low Confidence',
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  'no-gtin': {
    label: 'No GTIN',
    icon: ScanBarcode,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  'fuzzy-match': {
    label: 'Fuzzy Match',
    icon: Zap,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  'missing-data': {
    label: 'Missing Data',
    icon: FileQuestion,
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
  'duplicate-suspect': {
    label: 'Duplicate?',
    icon: GitMerge,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  'needs-review': {
    label: 'Review',
    icon: HelpCircle,
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  },
};

interface IssueBadgeProps {
  type: IssueType;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function IssueBadge({ type, showLabel = true, size = 'sm', className }: IssueBadgeProps) {
  const config = ISSUE_CONFIGS[type];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };
  
  return (
    <span 
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        sizeClasses[size],
        config.className,
        className
      )}
      title={config.label}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface IssueBadgesProps {
  issues: IssueType[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function IssueBadges({ issues, maxVisible = 3, size = 'sm', className }: IssueBadgesProps) {
  if (issues.length === 0) return null;
  
  const visibleIssues = issues.slice(0, maxVisible);
  const hiddenCount = issues.length - maxVisible;
  
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleIssues.map((issue) => (
        <IssueBadge key={issue} type={issue} size={size} />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

/**
 * Derive issue types from supplier item data
 */
export function deriveIssues(item: {
  matchConfidence: number | null;
  matchMethod: string;
  needsReview: boolean;
  productGtin: string | null;
  missingFields?: string[];
  duplicateCount?: number;
}): IssueType[] {
  const issues: IssueType[] = [];
  
  // Explicit review flag
  if (item.needsReview) {
    issues.push('needs-review');
  }
  
  // Low confidence match
  if (item.matchConfidence !== null && item.matchConfidence < 0.9) {
    issues.push('low-confidence');
  }
  
  // Fuzzy match method
  if (item.matchMethod === 'FUZZY_NAME') {
    issues.push('fuzzy-match');
  }
  
  // No GTIN on linked product
  if (!item.productGtin) {
    issues.push('no-gtin');
  }
  
  // Missing required fields
  if (item.missingFields && item.missingFields.length > 0) {
    issues.push('missing-data');
  }
  
  // Potential duplicate
  if (item.duplicateCount && item.duplicateCount > 1) {
    issues.push('duplicate-suspect');
  }
  
  return issues;
}

/**
 * Get confidence color class
 */
export function getConfidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-slate-500';
  if (confidence >= 0.9) return 'text-emerald-600 dark:text-emerald-400';
  if (confidence >= 0.7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number | null): string {
  if (confidence === null) return '–';
  return `${Math.round(confidence * 100)}%`;
}

