"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { useSidebar } from "@/stores/ui";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Home,
  Calendar,
  Users,
  UserCog,
  BarChart3,
  CalendarDays,
  MessageSquare,
  Settings,
  Megaphone,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Building,
  UserCheck,
  Car,
  Layers,
  ClipboardList,
  Trophy,
  PieChart,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredAccessLevel?: number; // 0=SuperAdmin, 1=Admin, 2=Staff
  maxAccessLevel?: number; // For items only visible to certain roles (e.g., staff only)
  badge?: number;
  children?: NavItem[];
}

// Navigation items matching the Blade sidebar structure
const getNavItems = (
  unassignedCount: number = 0,
  pendingRequestsCount: number = 0,
  nemtRequestsCount: number = 0
): NavItem[] => [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    requiredAccessLevel: 1,
    children: [
      { href: "/clients", label: "All Clients", icon: Users },
      { href: "/clients/reports", label: "Reports", icon: FileText },
      { href: "/facilities", label: "Facilities", icon: Building },
      { href: "/case-managers", label: "Case Managers", icon: UserCheck },
      {
        href: "/nemt-requests",
        label: "Ride Requests",
        icon: Car,
        badge: nemtRequestsCount,
      },
    ],
  },
  {
    href: "/services",
    label: "Services",
    icon: Layers,
    requiredAccessLevel: 1,
    children: [
      { href: "/services/specialities", label: "Specialities", icon: Layers },
    ],
  },
  {
    href: "/team",
    label: "Team",
    icon: UserCog,
    requiredAccessLevel: 1,
    children: [
      { href: "/team", label: "All Team", icon: UserCog },
      {
        href: "/team/requests",
        label: "Requests",
        icon: ClipboardList,
        badge: pendingRequestsCount,
      },
      { href: "/team/achievements", label: "Achievements", icon: Trophy },
    ],
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: CalendarDays,
    children: [
      { href: "/appointments", label: "Appointments", icon: Calendar },
      {
        href: "/appointments/unassigned",
        label: "Unassigned",
        icon: AlertCircle,
        badge: unassignedCount,
        requiredAccessLevel: 1,
      },
      {
        href: "/schedule/analytics",
        label: "Analytics",
        icon: PieChart,
        requiredAccessLevel: 1,
      },
    ],
  },
  {
    href: "/reporting",
    label: "Reporting",
    icon: BarChart3,
    requiredAccessLevel: 0, // SuperAdmin only
  },
  {
    href: "/recruitment",
    label: "Recruitment",
    icon: Briefcase,
    requiredAccessLevel: 1,
  },
  {
    href: "/my-reports",
    label: "Client Reports",
    icon: FileText,
    maxAccessLevel: 2, // Staff only (access_level === 2)
  },
];

// Case Manager Portal items
const caseManagerItems: NavItem[] = [
  { href: "/portal/case-manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/case-manager/clients", label: "My Clients", icon: Users },
  { href: "/portal/case-manager/reports", label: "Reports", icon: FileText },
];

// Client Portal items
const clientItems: NavItem[] = [
  { href: "/portal/client", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/portal/client/appointments",
    label: "My Appointments",
    icon: Calendar,
  },
  { href: "/portal/client/team", label: "My Team", icon: UserCog },
];

// Admin settings items
const settingsItems: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    requiredAccessLevel: 0,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasAccessLevel, tenant } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed } =
    useSidebar();

  // Track expanded menu sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Load expanded sections from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded-sections");
    if (saved) {
      try {
        setExpandedSections(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem(
      "sidebar-expanded-sections",
      JSON.stringify(expandedSections)
    );
  }, [expandedSections]);

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  // TODO: Get actual counts from API
  const unassignedCount = 0;
  const pendingRequestsCount = 0;
  const nemtRequestsCount = 0;

  const navItems = getNavItems(
    unassignedCount,
    pendingRequestsCount,
    nemtRequestsCount
  );

  // Check if user is case manager or client
  const isCaseManager = user?.role === "case_manager";
  const isClient = user?.role === "client";

  // Filter nav items based on user access level
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        // Check minimum access level requirement
        if (
          item.requiredAccessLevel !== undefined &&
          !hasAccessLevel(item.requiredAccessLevel)
        ) {
          return false;
        }
        // Check maximum access level (for staff-only items)
        if (
          item.maxAccessLevel !== undefined &&
          (user?.access_level ?? 2) < item.maxAccessLevel
        ) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }));
  };

  const visibleNavItems = filterItems(navItems);
  const visibleSettingsItems = filterItems(settingsItems);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections[item.href] || isParentActive(item);
    const active = isActive(item.href);

    if (hasChildren) {
      return (
        <li key={item.href}>
          <button
            onClick={() => toggleSection(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              "text-gray-700 dark:text-gray-300",
              isParentActive(item)
                ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-medium"
                : "hover:bg-gray-100 dark:hover:bg-gray-700/50",
              sidebarCollapsed && "justify-center"
            )}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0",
                isParentActive(item) && "text-violet-600 dark:text-violet-400"
              )}
            />
            {!sidebarCollapsed && (
              <>
                <span className="truncate flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </>
            )}
          </button>
          {/* Children */}
          {!sidebarCollapsed && isExpanded && item.children && (
            <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
              {item.children.map((child) => renderNavItem(child, true))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            "text-gray-700 dark:text-gray-300",
            active
              ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-medium"
              : "hover:bg-gray-100 dark:hover:bg-gray-700/50",
            sidebarCollapsed && "justify-center",
            isChild && "py-2 text-sm"
          )}
          title={sidebarCollapsed ? item.label : undefined}
        >
          <item.icon
            className={cn(
              "flex-shrink-0",
              isChild ? "w-4 h-4" : "w-5 h-5",
              active && "text-violet-600 dark:text-violet-400"
            )}
          />
          {!sidebarCollapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
          "transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 text-lg">
              <span className="font-semibold text-gray-900 dark:text-white truncate">
                <span className="text-violet-700 dark:text-violet-400 text-lg">
                  empower
                  <span className="text-gray-400 dark:text-gray-500">hub</span>
                </span>
              </span>
            </Link>
          )}

          {sidebarCollapsed && (
            <Link href="/dashboard" className="mx-auto">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                {/* Favicon */}
                <Image
                  src="/favicon.png"
                  alt="Empowerhub"
                  width={40}
                  height={40}
                />
              </div>
            </Link>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Case Manager Portal */}
          {isCaseManager && (
            <>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Case Manager Portal
                </p>
              )}
              <ul className="space-y-1 mb-4">
                {caseManagerItems.map((item) => renderNavItem(item))}
              </ul>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          {/* Client Portal */}
          {isClient && (
            <>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Client Portal
                </p>
              )}
              <ul className="space-y-1 mb-4">
                {clientItems.map((item) => renderNavItem(item))}
              </ul>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          {/* Main Navigation */}
          {!sidebarCollapsed && (isCaseManager || isClient) && (
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Main Menu
            </p>
          )}
          <ul className="space-y-1">
            {visibleNavItems.map((item) => renderNavItem(item))}
          </ul>

          {/* Settings section */}
          {visibleSettingsItems.length > 0 && (
            <>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              )}
              <ul className="space-y-1">
                {visibleSettingsItems.map((item) => renderNavItem(item))}
              </ul>
            </>
          )}
        </nav>

        {/* Collapse button (desktop only) */}
        <div className="hidden lg:block p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
              "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50",
              "transition-colors",
              sidebarCollapsed && "justify-center"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
