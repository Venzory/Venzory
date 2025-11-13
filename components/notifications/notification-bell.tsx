'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import useSWR from 'swr';
import { NotificationItem } from './notification-item';
import { fetcher } from '@/lib/fetcher';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  orderId: string | null;
  itemId: string | null;
  locationId: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// SWR fetcher function
const swrFetcher = (url: string) => fetcher.get<NotificationsResponse>(url);

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use SWR for automatic polling, deduplication, and focus revalidation
  const { data, error, mutate } = useSWR(
    '/api/notifications',
    swrFetcher,
    {
      refreshInterval: 30000,        // Poll every 30 seconds
      revalidateOnFocus: true,       // Refresh when tab regains focus
      dedupingInterval: 5000,        // Dedupe requests within 5 seconds
    }
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Log errors silently (don't disrupt user experience)
  if (error) {
    console.error('Failed to fetch notifications:', error);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetcher.patch(`/api/notifications/${id}`);
      
      // Revalidate SWR cache to refresh notifications
      mutate();
    } catch (error) {
      // Silent failure - don't disrupt user experience
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await fetcher.post('/api/notifications/mark-all-read');
      
      // Revalidate SWR cache to refresh notifications
      mutate();
    } catch (error) {
      // Silent failure - don't disrupt user experience
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-50 dark:text-blue-500 dark:hover:text-blue-400"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

