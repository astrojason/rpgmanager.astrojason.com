"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPinIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  DocumentTextIcon,
  UsersIcon,
  CogIcon,
  HomeIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { NavigationItem, SideNavigationProps } from "@/types/interfaces";
import SignOutButton from "@/components/SignOutButton";
import { useIsAdmin } from '@/utils/adminCheck';

export default function SideNavigation(props: SideNavigationProps) {
  const className = props.className || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  const navigationItems: NavigationItem[] = [
    {
      id: "campaign-home",
      name: "Campaign Home",
      icon: HomeIcon,
      href: "/campaign",
      description: "Main campaign dashboard",
    },
    {
      id: "next-session",
      name: "Next Session",
      icon: CalendarDaysIcon,
      href: "/campaign/next-session",
      description: "Upcoming session details",
    },
    {
      id: "locations",
      name: "Locations",
      icon: MapPinIcon,
      href: "/campaign/locations",
      description: "Towns, cities, landmarks",
    },
    {
      id: "calendar",
      name: "Calendar",
      icon: AcademicCapIcon,
      href: "/campaign/calendar",
      description: "World calendar and events",
    },
    {
      id: "timeline",
      name: "Timeline",
      icon: ChevronRightIcon,
      href: "/campaign/timeline",
      description: "Campaign timeline of major events",
    },
    {
      id: "npcs",
      name: "NPCs",
      icon: UserGroupIcon,
      href: "/campaign/npcs",
      description: "Characters, merchants, quest givers",
    },
    {
      id: "pcs",
      name: "PCs",
      icon: UsersIcon,
      href: "/campaign/pcs",
      description: "Player characters",
    },
    {
      id: "factions",
      name: "Factions",
      icon: ShieldCheckIcon,
      href: "/campaign/factions",
      description: "Organizations, guilds, political groups",
    },
    {
      id: "quests",
      name: "Quests",
      icon: ClipboardDocumentListIcon,
      href: "/campaign/quests",
      description: "Active, completed, available quests",
    },
    {
      id: "items",
      name: "Items",
      icon: CubeIcon,
      href: "/campaign/items",
      description: "Weapons, armor, artifacts, consumables",
    },
    {
      id: "lore",
      name: "Lore",
      icon: BookOpenIcon,
      href: "/campaign/lore",
      description: "History, stories, world building",
    },
    {
      id: "deities",
      name: "Deities",
      icon: SparklesIcon,
      href: "/campaign/deities",
      description: "Gods, pantheons, divine powers",
    },
    {
      id: "recaps",
      name: "Recaps",
      icon: DocumentTextIcon,
      href: "/campaign/recaps",
      description: "Session summaries, campaign notes",
    },
    {
      id: "pronunciations",
      name: "Pronunciations",
      icon: AcademicCapIcon,
      href: "/campaign/pronunciations",
      description: "Name pronunciation guide",
    },
  ];

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 ease-in-out border-r border-gray-700 dark:border-gray-800 ${
        isCollapsed ? "w-16" : "w-64"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-100">Navigation</h2>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href;
            const isDisabled = [
              "items",
              "lore",
              "deities",
              "timeline"
            ].includes(item.id);
            const isAvailable = [
              "campaign-home",
              "next-session",
              "npcs",
              "locations",
              "factions",
              "pronunciations",
              "quests",
              "pcs",
              "calendar",
              "recaps"
            ].includes(item.id);
            if (isAvailable) {
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                      isActive
                        ? "bg-slate-600 text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <IconComponent className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            } else if (isDisabled) {
              return (
                <li key={item.id}>
                  <button
                    className="w-full flex items-center px-3 py-3 text-left text-gray-500 cursor-not-allowed opacity-60 rounded-lg group"
                    disabled
                    title={`${item.name} - Coming Soon`}
                  >
                    <IconComponent className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            } else {
              return (
                <li key={item.id}>
                  <button
                    className="w-full flex items-center px-3 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group cursor-not-allowed opacity-75"
                    disabled
                    title={`${item.name} - Coming Soon`}
                  >
                    <IconComponent className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            }
          })}
        </ul>

        {/* Admin Section - Only show if impersonated or real user is admin */}
        {isAdmin && (
          <>
            <hr className="my-4 border-gray-700" />
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                    pathname === "/admin"
                      ? "bg-rose-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <CogIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-sm font-medium">Admin</div>
                      <div className="text-xs text-gray-400 truncate">
                        Administration panel
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-700 flex flex-col gap-2">
          <p className="text-xs text-gray-400 mb-2">More features coming soon</p>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}