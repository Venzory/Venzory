'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    orderId: string | null;
    itemId: string | null;
    locationId: string | null;
  };
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const router = useRouter();

  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate to relevant page
    let targetUrl = null;
    if (notification.orderId) {
      targetUrl = `/orders/${notification.orderId}`;
    } else if (notification.itemId) {
      targetUrl = `/inventory?item=${notification.itemId}`;
    }

    if (targetUrl) {
      onClose();
      router.push(targetUrl);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
        !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              !notification.read
                ? 'font-semibold text-slate-900 dark:text-white'
                : 'font-medium text-slate-700 dark:text-slate-300'
            }`}
          >
            {notification.title}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {timeAgo}
          </p>
        </div>
        {!notification.read && (
          <div className="flex-shrink-0 mt-1">
            <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
          </div>
        )}
      </div>
    </button>
  );
}

