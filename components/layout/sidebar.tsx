'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PracticeRole } from '@prisma/client';
import {
  LayoutDashboard,
  Package,
  Package2,
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
  Shield,
  Users,
  Database,
  FileSearch,
  CheckCircle2,
  Upload,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: PracticeRole; // Minimum role required to see this item
  accent?: 'owner' | 'admin'; // Special accent color for platform items
};

type NavSection = {
  title?: string;
  items: NavItem[];
  accent?: 'owner' | 'admin'; // Section-level accent
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

// Owner Portal navigation (amber accent)
const ownerNavSection: NavSection = {
  title: 'Owner Portal',
  accent: 'owner',
  items: [
    { href: '/owner', label: 'Platform Dashboard', icon: Shield, accent: 'owner' },
    { href: '/owner/tenants', label: 'Tenants', icon: Building2, accent: 'owner' },
    { href: '/owner/users', label: 'User Lifecycle', icon: Users, accent: 'owner' },
  ],
};

// Admin Console navigation (indigo accent)
const adminNavSection: NavSection = {
  title: 'Admin Console',
  accent: 'admin',
  items: [
    { href: '/admin', label: 'Data Dashboard', icon: Database, accent: 'admin' },
    { href: '/admin/product-master', label: 'Product Master', icon: Package2, accent: 'admin' },
    { href: '/admin/gs1-quality', label: 'GS1 Quality', icon: CheckCircle2, accent: 'admin' },
    { href: '/admin/authority', label: 'Authority Tool', icon: Shield, accent: 'admin' },
    { href: '/admin/suppliers', label: 'Global Suppliers', icon: Building2, accent: 'admin' },
    { href: '/admin/supplier-catalog', label: 'Supplier Catalog', icon: BookOpen, accent: 'admin' },
    { href: '/admin/import', label: 'Bulk Import', icon: Upload, accent: 'admin' },
  ],
};

type SidebarProps = {
  practiceName?: string | null;
  userRole?: PracticeRole | null;
  isOwner?: boolean;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ practiceName, userRole, isOwner = false, isOpen, onClose }: SidebarProps) {
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

  // Add platform sections for owners
  if (isOwner) {
    filteredNavSections.push(ownerNavSection);
    filteredNavSections.push(adminNavSection);
  }

  // Determine current context (owner, admin, or regular)
  const isInOwnerContext = pathname.startsWith('/owner');
  const isInAdminContext = pathname.startsWith('/admin');

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
            const isOwnerSection = section.accent === 'owner';
            const isAdminSection = section.accent === 'admin';
            
            // Section container styling
            const sectionContainerClass = isOwnerSection
              ? 'rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-2'
              : isAdminSection
                ? 'rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 p-2'
                : '';

            return (
              <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
                <div className={sectionContainerClass}>
                  {section.title && (!isCollapsed || !mounted) && (
                    <div className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider ${
                      isOwnerSection
                        ? 'text-amber-700 dark:text-amber-400'
                        : isAdminSection
                          ? 'text-indigo-700 dark:text-indigo-400'
                          : 'text-sidebar-text-muted/80'
                    }`}>
                      {section.title}
                    </div>
                  )}
                  {/* Collapsed state: show accent indicator dot */}
                  {(isOwnerSection || isAdminSection) && isCollapsed && mounted && (
                    <div className="flex justify-center mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isOwnerSection ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} />
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const itemAccent = item.accent;

                      // Determine active and hover styles based on accent
                      const getItemClasses = () => {
                        if (isActive) {
                          if (itemAccent === 'owner') {
                            return 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 font-medium border-l-2 border-amber-500';
                          }
                          if (itemAccent === 'admin') {
                            return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 font-medium border-l-2 border-indigo-500';
                          }
                          return 'bg-sidebar-active-bg text-sidebar-active-text font-medium';
                        }
                        if (itemAccent === 'owner') {
                          return 'text-amber-800 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 font-normal';
                        }
                        if (itemAccent === 'admin') {
                          return 'text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30 font-normal';
                        }
                        return 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text font-normal';
                      };

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${getItemClasses()} ${isCollapsed && mounted ? 'justify-center' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                          title={isCollapsed && mounted ? item.label : undefined}
                        >
                          <Icon className={`h-5 w-5 flex-shrink-0 ${
                            itemAccent === 'owner' && isActive ? 'text-amber-600 dark:text-amber-400' :
                            itemAccent === 'admin' && isActive ? 'text-indigo-600 dark:text-indigo-400' : ''
                          }`} />
                          {(!isCollapsed || !mounted) && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

