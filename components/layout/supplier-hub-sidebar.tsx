'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SupplierRole } from '@prisma/client';
import {
  LayoutDashboard,
  Upload,
  DollarSign,
  Truck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Building2,
  Package,
} from 'lucide-react';
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: '/supplier', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/items', label: 'My Items', icon: Package },
  { href: '/supplier/catalog', label: 'Catalog Upload', icon: Upload },
  { href: '/supplier/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/supplier/delivery', label: 'Delivery Settings', icon: Truck },
  { href: '/supplier/validation-log', label: 'Validation Log', icon: ClipboardList },
];

type SupplierHubSidebarProps = {
  supplierName?: string | null;
  userRole?: SupplierRole | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SupplierHubSidebar({ supplierName, userRole, isOpen, onClose }: SupplierHubSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true;
    return userRole === 'ADMIN';
  });

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('supplier-hub-sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('supplier-hub-sidebar-collapsed', String(newState));
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
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-teal-200/60 bg-white/90 backdrop-blur-xl shadow-sm transition-transform duration-300 dark:border-teal-800/50 dark:bg-slate-900/90 dark:shadow-md md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed && mounted ? 'md:w-16' : 'w-60'}`}
        role="navigation"
        aria-label="Supplier navigation"
      >
        {/* Logo and Supplier Name */}
        <div className="flex h-16 items-center justify-between border-b border-teal-200/60 px-4 dark:border-teal-800/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex flex-col">
              <Link
                href="/supplier"
                className="flex items-center gap-2 text-lg font-semibold text-slate-900 transition hover:text-teal-600 dark:text-white dark:hover:text-teal-400"
                onClick={handleLinkClick}
              >
                <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                Supplier Hub
              </Link>
              {supplierName && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{supplierName}</span>
              )}
            </div>
          )}
          {(!isCollapsed || !mounted) && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && mounted && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                        ? 'bg-teal-50 font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    } ${isCollapsed && mounted ? 'justify-center' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-teal-600 dark:text-teal-400' : ''
                    }`} />
                    {(!isCollapsed || !mounted) && <span>{item.label}</span>}
                  </Link>
                </SidebarTooltip>
              );
            })}
          </div>
        </nav>

        {/* Footer with Venzory branding */}
        <div className="border-t border-teal-200/60 px-4 py-3 dark:border-teal-800/50">
          {(!isCollapsed || !mounted) && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span>Powered by</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Venzory</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

