'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PracticeRole } from '@prisma/client';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Building2,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  ClipboardCheck,
  BookOpen,
  FolderOpen,
  ListPlus,
  AlertTriangle,
} from 'lucide-react';
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: PracticeRole; // Minimum role required to see this item
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/needs-attention', label: 'Needs Attention', icon: AlertTriangle },
    ],
  },
  {
    title: 'Inventory Management',
    items: [
      { href: '/my-items', label: 'My Items', icon: FolderOpen },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/receiving', label: 'Receiving', icon: PackageCheck, minRole: 'STAFF' },
      { href: '/stock-count', label: 'Stock Count', icon: ClipboardCheck, minRole: 'STAFF' },
      { href: '/locations', label: 'Locations', icon: MapPin },
    ],
  },
  {
    title: 'Ordering',
    items: [
      { href: '/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/reorder-suggestions', label: 'Reorder Suggestions', icon: ListPlus, minRole: 'STAFF' },
    ],
  },
  {
    title: 'Suppliers',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/supplier-catalog', label: 'Supplier Catalog', icon: BookOpen },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings, minRole: 'STAFF' },
    ],
  },
];

type SidebarProps = {
  practiceName?: string | null;
  userRole?: PracticeRole | null;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ practiceName, userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Role priority for filtering
  const rolePriority: Record<PracticeRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MANAGER: 2,
    STAFF: 1,
  };

  // Filter navigation items based on user role
  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.minRole || !userRole) return true;
        return rolePriority[userRole] >= rolePriority[item.minRole];
      }),
    }))
    .filter((section) => section.items.length > 0);

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-sm transition-transform duration-300 dark:shadow-none md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed && mounted ? 'md:w-16' : 'w-60'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo and Practice Name */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {(!isCollapsed || !mounted) && (
            <div className="flex flex-col">
              <Link
                href="/dashboard"
                className="text-lg font-semibold text-sidebar-text transition hover:text-brand"
                onClick={handleLinkClick}
              >
                Venzory
              </Link>
              {practiceName && (
                <span className="text-xs text-sidebar-text-muted">{practiceName}</span>
              )}
            </div>
          )}
          {(!isCollapsed || !mounted) && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-sidebar-text-muted transition hover:bg-sidebar-hover hover:text-sidebar-text md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && mounted && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-sidebar-text-muted transition hover:bg-sidebar-hover hover:text-sidebar-text md:block"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          {filteredNavSections.map((section, sectionIndex) => {
            return (
              <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {section.title && (!isCollapsed || !mounted) && (
                  <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-text-muted/80">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
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
                              ? 'bg-sidebar-active-bg text-sidebar-active-text font-medium'
                              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text font-normal'
                          } ${isCollapsed && mounted ? 'justify-center' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {(!isCollapsed || !mounted) && <span>{item.label}</span>}
                        </Link>
                      </SidebarTooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
