'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { SessionPractice } from '@/types/next-auth';

// LocalStorage keys
const STORAGE_KEY_PRACTICE = 'venzory-active-practice';
const STORAGE_KEY_LOCATION = 'venzory-active-location';

interface PracticeContextValue {
  // Current active state
  activePracticeId: string | null;
  activeLocationId: string | null;
  activeMembership: SessionPractice | null;
  
  // All memberships from session
  memberships: SessionPractice[];
  
  // Actions
  switchPractice: (practiceId: string) => Promise<void>;
  switchLocation: (locationId: string | null) => Promise<void>;
  
  // Loading state
  isLoading: boolean;
  isSwitching: boolean;
}

const PracticeContext = createContext<PracticeContextValue | undefined>(undefined);

export function usePracticeContext() {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error('usePracticeContext must be used within a PracticeContextProvider');
  }
  return context;
}

// Safe localStorage helpers
function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
}

interface PracticeContextProviderProps {
  children: ReactNode;
}

export function PracticeContextProvider({ children }: PracticeContextProviderProps) {
  const { data: session, update: updateSession, status } = useSession();
  const router = useRouter();
  
  const [isSwitching, setIsSwitching] = useState(false);
  const [localPracticeId, setLocalPracticeId] = useState<string | null>(null);
  const [localLocationId, setLocalLocationId] = useState<string | null>(null);
  
  const isLoading = status === 'loading';
  const memberships = session?.user?.memberships ?? [];
  
  // Initialize from localStorage on mount
  useEffect(() => {
    const storedPractice = getStorageItem(STORAGE_KEY_PRACTICE);
    const storedLocation = getStorageItem(STORAGE_KEY_LOCATION);
    
    if (storedPractice) setLocalPracticeId(storedPractice);
    if (storedLocation) setLocalLocationId(storedLocation);
  }, []);
  
  // Determine active practice ID
  // Priority: localStorage (for instant UI) > session > first membership
  const activePracticeId = localPracticeId 
    ?? session?.user?.activePracticeId 
    ?? memberships[0]?.practiceId 
    ?? null;
  
  // Determine active location ID
  const activeLocationId = localLocationId 
    ?? session?.user?.activeLocationId 
    ?? null;
  
  // Find the active membership
  const activeMembership = memberships.find(
    (m) => m.practiceId === activePracticeId
  ) ?? memberships[0] ?? null;
  
  // Switch to a different practice
  const switchPractice = useCallback(async (practiceId: string) => {
    if (practiceId === activePracticeId) return;
    
    // Verify user has access to this practice
    const targetMembership = memberships.find((m) => m.practiceId === practiceId);
    if (!targetMembership) {
      console.error('User does not have access to practice:', practiceId);
      return;
    }
    
    setIsSwitching(true);
    
    try {
      // Optimistic update via localStorage
      setStorageItem(STORAGE_KEY_PRACTICE, practiceId);
      setLocalPracticeId(practiceId);
      
      // Get first allowed location in new practice
      const firstLocationId = targetMembership.allowedLocationIds[0] ?? null;
      setStorageItem(STORAGE_KEY_LOCATION, firstLocationId);
      setLocalLocationId(firstLocationId);
      
      // Call API to persist server-side
      const response = await fetch('/api/auth/switch-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch practice');
      }
      
      // Refresh session with new values
      await updateSession({
        activePracticeId: practiceId,
        activeLocationId: firstLocationId,
      });
      
      // Refresh the page to ensure all data is reloaded for new practice
      router.refresh();
    } catch (error) {
      console.error('Error switching practice:', error);
      // Revert optimistic update on error
      setStorageItem(STORAGE_KEY_PRACTICE, activePracticeId);
      setLocalPracticeId(activePracticeId);
    } finally {
      setIsSwitching(false);
    }
  }, [activePracticeId, memberships, updateSession, router]);
  
  // Switch to a different location within the current practice
  const switchLocation = useCallback(async (locationId: string | null) => {
    if (locationId === activeLocationId) return;
    if (!activeMembership) return;
    
    // Validate location access (unless "all" for OWNER/ADMIN)
    if (locationId !== null && locationId !== 'all') {
      const hasAccess = activeMembership.allowedLocationIds.includes(locationId);
      if (!hasAccess) {
        console.error('User does not have access to location:', locationId);
        return;
      }
    }
    
    // Only OWNER/ADMIN can select "all"
    if (locationId === 'all' && 
        activeMembership.role !== 'OWNER' && 
        activeMembership.role !== 'ADMIN') {
      console.error('Only owners and admins can view all locations');
      return;
    }
    
    setIsSwitching(true);
    
    try {
      // Optimistic update
      const storageValue = locationId === 'all' ? null : locationId;
      setStorageItem(STORAGE_KEY_LOCATION, storageValue);
      setLocalLocationId(storageValue);
      
      // Call existing API
      const response = await fetch('/api/auth/switch-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locationId ?? 'all' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch location');
      }
      
      // Refresh session with new location
      await updateSession({
        activeLocationId: locationId === 'all' ? null : locationId,
      });
      
      // Refresh to reload location-specific data
      router.refresh();
    } catch (error) {
      console.error('Error switching location:', error);
      // Revert on error
      setStorageItem(STORAGE_KEY_LOCATION, activeLocationId);
      setLocalLocationId(activeLocationId);
    } finally {
      setIsSwitching(false);
    }
  }, [activeLocationId, activeMembership, updateSession, router]);
  
  // Sync localStorage when session changes
  useEffect(() => {
    if (session?.user?.activePracticeId) {
      const sessionPractice = session.user.activePracticeId;
      const sessionLocation = session.user.activeLocationId;
      
      // Only sync if we don't have a local override or if they match
      if (!localPracticeId || localPracticeId === sessionPractice) {
        setStorageItem(STORAGE_KEY_PRACTICE, sessionPractice);
      }
      if (sessionLocation && (!localLocationId || localLocationId === sessionLocation)) {
        setStorageItem(STORAGE_KEY_LOCATION, sessionLocation);
      }
    }
  }, [session?.user?.activePracticeId, session?.user?.activeLocationId, localPracticeId, localLocationId]);
  
  const value: PracticeContextValue = {
    activePracticeId,
    activeLocationId,
    activeMembership,
    memberships,
    switchPractice,
    switchLocation,
    isLoading,
    isSwitching,
  };
  
  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

