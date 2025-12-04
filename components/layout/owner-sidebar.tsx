'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/owner', label: 'Platform Dashboard', icon: LayoutDashboard },
  { href: '/owner/tenants', label: 'Tenants', icon: Building2 },
  { href: '/owner/users', label: 'User Lifecycle', icon: Users },
];

type OwnerSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function OwnerSidebar({ isOpen, onClose }: OwnerSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('owner-sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('owner-sidebar-collapsed', String(newState));
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-amber-200 bg-amber-50 shadow-sm transition-transform duration-300 dark:border-amber-900/50 dark:bg-amber-950/30 dark:shadow-none md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed && mounted ? 'md:w-16' : 'w-60'}`}
        role="navigation"
        aria-label="Owner navigation"
      >
        {/* Logo and Title */}
        <div className="flex h-16 items-center justify-between border-b border-amber-200 px-4 dark:border-amber-900/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex flex-col">
              <Link
                href="/owner"
                className="flex items-center gap-2 text-lg font-semibold text-amber-900 transition hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-300"
                onClick={handleLinkClick}
              >
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Owner Portal
              </Link>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Platform Management
              </span>
            </div>
          )}
          {isCollapsed && mounted && (
            <Link
              href="/owner"
              className="flex items-center justify-center"
              onClick={handleLinkClick}
            >
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </Link>
          )}
          {(!isCollapsed || !mounted) && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-200 md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && mounted && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-200 md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/owner'
                  ? pathname === '/owner'
                  : pathname.startsWith(`${item.href}`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-amber-200/70 font-medium text-amber-900 dark:bg-amber-800/40 dark:text-amber-100'
                      : 'text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200 dark:hover:bg-amber-900/30 dark:hover:text-amber-100'
                  } ${isCollapsed && mounted ? 'justify-center' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  title={isCollapsed && mounted ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-amber-700 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400'
                  }`} />
                  {(!isCollapsed || !mounted) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Quick link to Admin Console */}
          <div className="mt-6 border-t border-amber-200 pt-4 dark:border-amber-900/50">
            {(!isCollapsed || !mounted) && (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                Quick Access
              </div>
            )}
            <Link
              href="/admin"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30 ${
                isCollapsed && mounted ? 'justify-center' : ''
              }`}
              title={isCollapsed && mounted ? 'Admin Console' : undefined}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
              {(!isCollapsed || !mounted) && <span>Admin Console →</span>}
            </Link>
          </div>
        </nav>

        {/* Footer with Venzory branding */}
        <div className="border-t border-amber-200 px-4 py-3 dark:border-amber-900/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex items-center gap-2 text-xs text-amber-500 dark:text-amber-500">
              <span>Powered by</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">Venzory</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

