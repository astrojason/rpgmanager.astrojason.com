"use client";

import { useState } from "react";
import {
  MapPinIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { NavigationItem, SideNavigationProps } from "@/types/interfaces";

const navigationItems: NavigationItem[] = [
  {
    id: "locations",
    name: "Locations",
    icon: MapPinIcon,
    href: "/locations",
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
];

export default function SideNavigation({
  className = "",
}: SideNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`bg-gray-900 text-white transition-all duration-300 ease-in-out ${
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
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Campaign navigation coming soon
          </p>
        </div>
      )}
    </div>
  );
}
