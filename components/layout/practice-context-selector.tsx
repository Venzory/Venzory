'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Check,
  Settings,
  Users,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeContext } from './practice-context-provider';
import type { SessionPractice } from '@/types/next-auth';

// Role badge colors
const roleBadgeStyles: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ADMIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  MANAGER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  STAFF: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        roleBadgeStyles[role] ?? roleBadgeStyles.STAFF
      )}
    >
      {role}
    </span>
  );
}

interface PracticeItemProps {
  membership: SessionPractice;
  isActive: boolean;
  isExpanded: boolean;
  activeLocationId: string | null;
  onToggleExpand: () => void;
  onSelectPractice: () => void;
  onSelectLocation: (locationId: string | null) => void;
}

function PracticeItem({
  membership,
  isActive,
  isExpanded,
  activeLocationId,
  onToggleExpand,
  onSelectPractice,
  onSelectLocation,
}: PracticeItemProps) {
  const accessibleLocations = membership.locations.filter((loc) =>
    membership.allowedLocationIds.includes(loc.id)
  );
  const hasLocations = accessibleLocations.length > 0;
  const canViewAllLocations = membership.role === 'OWNER' || membership.role === 'ADMIN';

  return (
    <div className="mb-1">
      {/* Practice Header */}
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer',
          isActive
            ? 'bg-sky-50 dark:bg-sky-900/20 border-l-2 border-sky-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-2 border-transparent'
        )}
        onClick={() => {
          if (!isActive) {
            onSelectPractice();
          } else if (hasLocations) {
            onToggleExpand();
          }
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasLocations ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Practice Icon */}
        <Building2
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'
          )}
        />

        {/* Practice Name */}
        <span
          className={cn(
            'flex-1 text-sm font-medium truncate',
            isActive
              ? 'text-sky-900 dark:text-sky-100'
              : 'text-slate-700 dark:text-slate-200'
          )}
        >
          {membership.practice.name}
        </span>

        {/* Role Badge */}
        <RoleBadge role={membership.role} />

        {/* Active Check */}
        {isActive && (
          <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
        )}
      </div>

      {/* Locations List (when expanded) */}
      {isExpanded && hasLocations && (
        <div className="ml-6 mt-1 space-y-0.5 animate-fade-in">
          {accessibleLocations.map((location) => {
            const isLocationActive = isActive && activeLocationId === location.id;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onSelectLocation(location.id)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  isLocationActive
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{location.name}</span>
                {isLocationActive && <Check className="h-3.5 w-3.5 ml-auto" />}
              </button>
            );
          })}

          {/* "All Locations" option for OWNER/ADMIN */}
          {canViewAllLocations && accessibleLocations.length > 1 && (
            <button
              type="button"
              onClick={() => onSelectLocation(null)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive && activeLocationId === null
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">All Locations</span>
              {isActive && activeLocationId === null && (
                <Check className="h-3.5 w-3.5 ml-auto" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for mobile - just shows practice name
export function PracticeContextSelectorCompact() {
  const { activeMembership, isLoading } = usePracticeContext();

  if (isLoading || !activeMembership) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
      <Building2 className="h-3.5 w-3.5 text-slate-500" />
      <span className="font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
        {activeMembership.practice.name}
      </span>
    </div>
  );
}

export function PracticeContextSelector() {
  const {
    activePracticeId,
    activeLocationId,
    activeMembership,
    memberships,
    switchPractice,
    switchLocation,
    isLoading,
    isSwitching,
  } = usePracticeContext();

  const [isOpen, setIsOpen] = useState(false);
  const [expandedPractices, setExpandedPractices] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-expand active practice
  useEffect(() => {
    if (activePracticeId) {
      setExpandedPractices((prev) => new Set(prev).add(activePracticeId));
    }
  }, [activePracticeId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Loading state
  if (isLoading || !activeMembership) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-slate-500">Loading...</span>
      </div>
    );
  }

  // Get active location name
  const activeLocation = activeMembership.locations.find((l) => l.id === activeLocationId);
  const displayLocationName = activeLocation?.name ?? 'All Locations';

  // Determine if dropdown should be disabled (single practice, single location)
  const hasMultiplePractices = memberships.length > 1;
  const hasMultipleLocations =
    activeMembership.locations.filter((loc) =>
      activeMembership.allowedLocationIds.includes(loc.id)
    ).length > 1;
  const canSwitch = hasMultiplePractices || hasMultipleLocations;

  // Handle toggle expand
  const toggleExpand = (practiceId: string) => {
    setExpandedPractices((prev) => {
      const next = new Set(prev);
      if (next.has(practiceId)) {
        next.delete(practiceId);
      } else {
        next.add(practiceId);
      }
      return next;
    });
  };

  // Handle practice selection
  const handleSelectPractice = async (practiceId: string) => {
    if (practiceId === activePracticeId) return;
    await switchPractice(practiceId);
    setIsOpen(false);
  };

  // Handle location selection
  const handleSelectLocation = async (practiceId: string, locationId: string | null) => {
    // If different practice, switch practice first
    if (practiceId !== activePracticeId) {
      await switchPractice(practiceId);
      // Location will be set as part of practice switch
    } else {
      // Same practice, just switch location
      await switchLocation(locationId);
    }
    setIsOpen(false);
  };

  // Static display for single practice/location
  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-slate-500" />
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {activeMembership.practice.name}
        </span>
        {activeLocation && (
          <>
            <span className="text-slate-400">/</span>
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">{activeLocation.name}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-slate-900',
          isSwitching && 'opacity-60 cursor-wait'
        )}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : (
          <Building2 className="h-4 w-4 text-slate-500" />
        )}
        <span className="font-medium text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
          {activeMembership.practice.name}
        </span>
        <span className="text-slate-400">/</span>
        <MapPin className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-500 dark:text-slate-400 max-w-[100px] truncate">
          {displayLocationName}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg',
            'dark:border-slate-700 dark:bg-slate-900',
            'animate-scale-in origin-top-left'
          )}
        >
          {/* Practices List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {memberships.map((membership) => (
              <PracticeItem
                key={membership.practiceId}
                membership={membership}
                isActive={membership.practiceId === activePracticeId}
                isExpanded={expandedPractices.has(membership.practiceId)}
                activeLocationId={
                  membership.practiceId === activePracticeId ? activeLocationId : null
                }
                onToggleExpand={() => toggleExpand(membership.practiceId)}
                onSelectPractice={() => handleSelectPractice(membership.practiceId)}
                onSelectLocation={(locId) =>
                  handleSelectLocation(membership.practiceId, locId)
                }
              />
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* CTA Links */}
          <div className="p-2 space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Manage Practice
            </Link>
            <Link
              href="/settings#team"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <Users className="h-4 w-4" />
              Invite Team
            </Link>
            <button
              type="button"
              onClick={() => {
                // TODO: Implement add/request access flow
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add / Request Access
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

