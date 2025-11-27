'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDown, Building2, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type OrgLocationSwitcherProps = {
  onLocationChange?: (locationId: string) => void;
};

export function OrgLocationSwitcher({ onLocationChange }: OrgLocationSwitcherProps) {
  const { data: session, update: updateSession } = useSession();
  const [isPending, startTransition] = useTransition();

  if (!session?.user) {
    return null;
  }

  const memberships = session.user.memberships ?? [];
  const activePracticeId = session.user.activePracticeId;
  const activeLocationId = session.user.activeLocationId;

  const activeMembership = memberships.find((m) => m.practiceId === activePracticeId);
  const locations = activeMembership?.locations ?? [];
  const allowedLocationIds = activeMembership?.allowedLocationIds ?? [];

  // Filter to only allowed locations
  const accessibleLocations = locations.filter((loc) =>
    allowedLocationIds.includes(loc.id)
  );

  const activeLocation = accessibleLocations.find((l) => l.id === activeLocationId);
  const practiceName = activeMembership?.practice?.name ?? 'Organization';

  const handleLocationSelect = (locationId: string) => {
    startTransition(async () => {
      try {
        // Call server action to switch location
        const response = await fetch('/api/auth/switch-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
        });

        if (response.ok) {
          // Update session to reflect new location
          await updateSession();
          onLocationChange?.(locationId);
        }
      } catch (error) {
        console.error('Failed to switch location:', error);
      }
    });
  };

  // Don't show switcher if there's only one location
  if (accessibleLocations.length <= 1 && memberships.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{practiceName}</span>
        {activeLocation && (
          <>
            <span className="text-muted-foreground">/</span>
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{activeLocation.name}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          'hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isPending && 'opacity-50 cursor-wait'
        )}
        disabled={isPending}
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium max-w-[120px] truncate">{practiceName}</span>
        {activeLocation && (
          <>
            <span className="text-muted-foreground">/</span>
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground max-w-[100px] truncate">
              {activeLocation.name}
            </span>
          </>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="left" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {practiceName}
        </DropdownMenuLabel>

        {accessibleLocations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Select Location
            </DropdownMenuLabel>

            {accessibleLocations.map((location) => (
              <DropdownMenuItem
                key={location.id}
                onClick={() => handleLocationSelect(location.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {location.name}
                </span>
                {location.id === activeLocationId && (
                  <Check className="h-4 w-4 text-brand" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Show "All Locations" option for OWNER/ADMIN */}
        {(activeMembership?.role === 'OWNER' || activeMembership?.role === 'ADMIN') &&
          accessibleLocations.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleLocationSelect('all')}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  All Locations
                </span>
                {!activeLocationId && <Check className="h-4 w-4 text-brand" />}
              </DropdownMenuItem>
            </>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

