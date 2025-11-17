'use client';

import { useEffect, useRef, useState } from 'react';

interface TypographySampleProps {
  label: string;
  className: string;
  text: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'code';
}

export function TypographySample({ label, className, text, tag = 'p' }: TypographySampleProps) {
  const ref = useRef<HTMLElement>(null);
  const [computedStyles, setComputedStyles] = useState<{
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    fontWeight: string;
  } | null>(null);

  useEffect(() => {
    if (ref.current) {
      const styles = window.getComputedStyle(ref.current);
      setComputedStyles({
        fontFamily: styles.fontFamily.split(',')[0].replace(/['"]/g, ''),
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        fontWeight: styles.fontWeight,
      });
    }
  }, []);

  const Tag = tag;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {className}
        </code>
      </div>
      <Tag ref={ref as any} className={className}>
        {text}
      </Tag>
      {computedStyles && (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Font:</span> {computedStyles.fontFamily}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Size:</span> {computedStyles.fontSize} / 
            <span className="font-medium"> Line Height:</span> {computedStyles.lineHeight} / 
            <span className="font-medium"> Weight:</span> {computedStyles.fontWeight}
          </p>
        </div>
      )}
    </div>
  );
}

