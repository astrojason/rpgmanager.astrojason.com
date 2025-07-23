"use client";

import { useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import { NavigationItem, SideNavigationProps } from "@/types/interfaces";

const navigationItems: NavigationItem[] = [
  {
    id: "locations",
    name: "Locations",
    icon: MapPinIcon,
    href: "/",
    description: "Towns, cities, landmarks",
  },
  {
    id: "npcs",
    name: "NPCs",
    icon: UserGroupIcon,
    href: "/npcs",
    description: "Characters, merchants, quest givers",
  },
  {
    id: "pcs",
    name: "PCs",
    icon: UsersIcon,
    href: "/pcs",
    description: "Player characters",
  },
  {
    id: "factions",
    name: "Factions",
    icon: ShieldCheckIcon,
    href: "/factions",
    description: "Organizations, guilds, political groups",
  },
  {
    id: "quests",
    name: "Quests",
    icon: ClipboardDocumentListIcon,
    href: "/quests",
    description: "Active, completed, available quests",
  },
  {
    id: "items",
    name: "Items",
    icon: CubeIcon,
    href: "/items",
    description: "Weapons, armor, artifacts, consumables",
  },
  {
    id: "lore",
    name: "Lore",
    icon: BookOpenIcon,
    href: "/lore",
    description: "History, stories, world building",
  },
  {
    id: "deities",
    name: "Deities",
    icon: SparklesIcon,
    href: "/deities",
    description: "Gods, pantheons, divine powers",
  },
  {
    id: "recaps",
    name: "Recaps",
    icon: DocumentTextIcon,
    href: "/recaps",
    description: "Session summaries, campaign notes",
  },
  {
    id: "pronunciations",
    name: "Pronunciations",
    icon: AcademicCapIcon,
    href: "/pronunciations",
    description: "Name pronunciation guide",
  },
];

export default function SideNavigation({
  className = "",
}: SideNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check localStorage for admin setting
    const adminSetting = localStorage.getItem("isAdmin");
    setIsAdmin(adminSetting === "true");
  }, []);

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
            const isNPCs = item.id === "npcs";
            const isLocations = item.id === "locations";
            const isFactions = item.id === "factions";
            const isPronunciations = item.id === "pronunciations";
            const isQuests = item.id === "quests";
            // Disabled pages - coming soon or not yet implemented
            const isDisabled = [
              "pcs",
              "items",
              "lore",
              "deities",
              "recaps",
            ].includes(item.id);

            if (
              isNPCs ||
              isLocations ||
              isFactions ||
              isPronunciations ||
              isQuests
            ) {
              // Available pages
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                      isActive
                        ? "bg-blue-600 text-white"
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
              // Disabled pages - not yet implemented
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
              // Other pages are disabled/not yet implemented
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

        {/* Admin Section - Only show if isAdmin is true in localStorage */}
        {isAdmin && (
          <>
            <hr className="my-4 border-gray-700" />
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                    pathname === "/admin"
                      ? "bg-red-600 text-white"
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
        <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">More features coming soon</p>
        </div>
      )}
    </div>
  );
}
