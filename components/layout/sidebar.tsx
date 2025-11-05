'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Building2,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type SidebarProps = {
  practiceName?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ practiceName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Mobile: Close sidebar when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Mobile: Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && window.innerWidth < 768) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed && mounted ? 'md:w-16' : 'w-60'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo and Practice Name */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          {(!isCollapsed || !mounted) && (
            <div className="flex flex-col">
              <Link
                href="/dashboard"
                className="text-lg font-semibold text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400"
                onClick={handleLinkClick}
              >
                Remcura
              </Link>
              {practiceName && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{practiceName}</span>
              )}
            </div>
          )}
          {(!isCollapsed || !mounted) && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && mounted && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'border-l-2 border-sky-600 bg-slate-100 text-slate-900 dark:border-sky-500 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'
                } ${isCollapsed && mounted ? 'justify-center' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={isCollapsed && mounted ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {(!isCollapsed || !mounted) && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

