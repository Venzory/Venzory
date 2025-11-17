'use client';

import { TokenCard } from './TokenCard';

interface ColorToken {
  name: string;
  cssVariable: string;
  lightValue: string;
  darkValue: string;
  tailwindClass?: string;
}

const colorTokens: ColorToken[] = [
  // Brand colors
  { name: 'Brand Primary', cssVariable: '--color-brand-primary', lightValue: 'rgb(2, 132, 199)', darkValue: 'rgb(2, 132, 199)', tailwindClass: 'bg-brand' },
  { name: 'Brand Hover', cssVariable: '--color-brand-primary-hover', lightValue: 'rgb(3, 105, 161)', darkValue: 'rgb(3, 105, 161)', tailwindClass: 'bg-brand-hover' },
  { name: 'Brand Light', cssVariable: '--color-brand-light', lightValue: 'rgb(7, 89, 133)', darkValue: 'rgb(56, 189, 248)', tailwindClass: 'bg-brand-light' },
  
  // Background & Surface colors
  { name: 'Background', cssVariable: '--color-bg', lightValue: 'rgb(255, 255, 255)', darkValue: 'rgb(2, 6, 23)', tailwindClass: 'bg-white dark:bg-slate-950' },
  { name: 'Background Secondary', cssVariable: '--color-bg-secondary', lightValue: 'rgb(248, 250, 252)', darkValue: 'rgb(15, 23, 42)', tailwindClass: 'bg-slate-50 dark:bg-slate-900' },
  { name: 'Surface', cssVariable: '--color-surface', lightValue: 'rgb(255, 255, 255)', darkValue: 'rgb(15, 23, 42)', tailwindClass: 'bg-surface' },
  { name: 'Surface Secondary', cssVariable: '--color-surface-secondary', lightValue: 'rgb(248, 250, 252)', darkValue: 'rgb(30, 41, 59)', tailwindClass: 'bg-surface-secondary' },
  
  // Card colors
  { name: 'Card Background', cssVariable: '--color-card-bg', lightValue: 'rgb(255, 255, 255)', darkValue: 'rgb(15, 23, 42)', tailwindClass: 'bg-card' },
  { name: 'Card Border', cssVariable: '--color-card-border', lightValue: 'rgb(226, 232, 240)', darkValue: 'rgb(30, 41, 59)', tailwindClass: 'border-card-border' },
  
  // Text colors
  { name: 'Text Primary', cssVariable: '--color-text-primary', lightValue: 'rgb(15, 23, 42)', darkValue: 'rgb(248, 250, 252)', tailwindClass: 'text-text' },
  { name: 'Text Secondary', cssVariable: '--color-text-secondary', lightValue: 'rgb(71, 85, 105)', darkValue: 'rgb(203, 213, 225)', tailwindClass: 'text-text-secondary' },
  { name: 'Text Muted', cssVariable: '--color-text-muted', lightValue: 'rgb(148, 163, 184)', darkValue: 'rgb(148, 163, 184)', tailwindClass: 'text-text-muted' },
  
  // Border colors
  { name: 'Border', cssVariable: '--color-border', lightValue: 'rgb(226, 232, 240)', darkValue: 'rgb(30, 41, 59)', tailwindClass: 'border-border' },
  { name: 'Border Light', cssVariable: '--color-border-light', lightValue: 'rgb(241, 245, 249)', darkValue: 'rgb(51, 65, 85)', tailwindClass: 'border-border-light' },
  
  // Semantic colors
  { name: 'Success', cssVariable: '--color-success', lightValue: 'rgb(22, 163, 74)', darkValue: 'rgb(34, 197, 94)', tailwindClass: 'text-green-600 dark:text-green-500' },
  { name: 'Success Light', cssVariable: '--color-success-light', lightValue: 'rgb(220, 252, 231)', darkValue: 'rgb(20, 83, 45)', tailwindClass: 'bg-green-100 dark:bg-green-900' },
  { name: 'Warning', cssVariable: '--color-warning', lightValue: 'rgb(245, 158, 11)', darkValue: 'rgb(251, 191, 36)', tailwindClass: 'text-amber-500 dark:text-amber-400' },
  { name: 'Warning Light', cssVariable: '--color-warning-light', lightValue: 'rgb(254, 243, 199)', darkValue: 'rgb(120, 53, 15)', tailwindClass: 'bg-amber-100 dark:bg-amber-900' },
  { name: 'Danger', cssVariable: '--color-danger', lightValue: 'rgb(225, 29, 72)', darkValue: 'rgb(244, 63, 94)', tailwindClass: 'text-rose-600 dark:text-rose-500' },
  { name: 'Danger Light', cssVariable: '--color-danger-light', lightValue: 'rgb(255, 228, 230)', darkValue: 'rgb(136, 19, 55)', tailwindClass: 'bg-rose-100 dark:bg-rose-900' },
  
  // Sidebar colors
  { name: 'Sidebar Background', cssVariable: '--color-sidebar-bg', lightValue: 'rgb(249, 250, 251)', darkValue: 'rgb(15, 23, 42)', tailwindClass: 'bg-sidebar' },
  { name: 'Sidebar Border', cssVariable: '--color-sidebar-border', lightValue: 'rgb(226, 232, 240)', darkValue: 'rgb(30, 41, 59)', tailwindClass: 'border-sidebar-border' },
  { name: 'Sidebar Text', cssVariable: '--color-sidebar-text', lightValue: 'rgb(15, 23, 42)', darkValue: 'rgb(248, 250, 252)', tailwindClass: 'text-sidebar-text' },
  { name: 'Sidebar Active Background', cssVariable: '--color-sidebar-active-bg', lightValue: 'rgb(240, 249, 255)', darkValue: 'rgb(30, 41, 59)', tailwindClass: 'bg-sidebar-active-bg' },
];

export function ColorGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {colorTokens.map((token) => (
        <TokenCard
          key={token.cssVariable}
          name={token.name}
          preview={
            <div className="flex gap-2">
              <div
                className="h-12 w-12 rounded-lg border border-slate-300 dark:border-slate-700"
                style={{ backgroundColor: token.lightValue }}
                title="Light mode"
              />
              <div
                className="h-12 w-12 rounded-lg border border-slate-300 dark:border-slate-700"
                style={{ backgroundColor: token.darkValue }}
                title="Dark mode"
              />
            </div>
          }
          cssVariable={token.cssVariable}
          tailwindClass={token.tailwindClass}
          value={`Light: ${token.lightValue} / Dark: ${token.darkValue}`}
        />
      ))}
    </div>
  );
}

