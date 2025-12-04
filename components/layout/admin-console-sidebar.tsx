'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database,
  Package2,
  CheckCircle2,
  Shield,
  Building2,
  BookOpen,
  FileEdit,
  Upload,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Data Dashboard', icon: LayoutDashboard },
  { href: '/admin/product-master', label: 'Product Master', icon: Package2 },
  { href: '/admin/gs1-quality', label: 'GS1 Quality', icon: CheckCircle2 },
  { href: '/admin/authority', label: 'Authority Tool', icon: Shield },
  { href: '/admin/match-review', label: 'Match Review', icon: Database },
  { href: '/admin/suppliers', label: 'Global Suppliers', icon: Building2 },
  { href: '/admin/supplier-catalog', label: 'Supplier Catalog', icon: BookOpen },
  { href: '/admin/supplier-corrections', label: 'Supplier Corrections', icon: FileEdit },
  { href: '/admin/import', label: 'Bulk Import', icon: Upload },
];

type AdminConsoleSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminConsoleSidebar({ isOpen, onClose }: AdminConsoleSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('admin-console-sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('admin-console-sidebar-collapsed', String(newState));
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
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-indigo-200/60 bg-indigo-50/90 backdrop-blur-xl shadow-sm transition-transform duration-300 dark:border-indigo-800/50 dark:bg-indigo-950/90 dark:shadow-md md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed && mounted ? 'md:w-16' : 'w-60'}`}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Logo and Title */}
        <div className="flex h-16 items-center justify-between border-b border-indigo-200/60 px-4 dark:border-indigo-800/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex flex-col">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-lg font-semibold text-indigo-900 transition hover:text-indigo-700 dark:text-indigo-100 dark:hover:text-indigo-300"
                onClick={handleLinkClick}
              >
                <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Admin Console
              </Link>
              <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Data Stewardship
              </span>
            </div>
          )}
          {isCollapsed && mounted && (
            <Link
              href="/admin"
              className="flex items-center justify-center"
              onClick={handleLinkClick}
            >
              <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </Link>
          )}
          {(!isCollapsed || !mounted) && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-200 md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && mounted && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-200 md:block"
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
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(`${item.href}`);

              return (
                <SidebarTooltip
                  key={item.href}
                  content={item.label}
                  disabled={!isCollapsed || !mounted}
                >
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'bg-indigo-200/70 font-medium text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-100'
                        : 'text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-100'
                    } ${isCollapsed && mounted ? 'justify-center' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-indigo-600 dark:text-indigo-400'
                    }`} />
                    {(!isCollapsed || !mounted) && <span>{item.label}</span>}
                  </Link>
                </SidebarTooltip>
              );
            })}
          </div>
        </nav>

        {/* Footer with Venzory branding */}
        <div className="border-t border-indigo-200/60 px-4 py-3 dark:border-indigo-800/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex items-center gap-2 text-xs text-indigo-500 dark:text-indigo-500">
              <span>Powered by</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">Venzory</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

