"use client";

import Link from "next/link";
import {
  UserGroupIcon,
  UsersIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const dataManagementItems = [
  {
    id: "npcs",
    name: "NPCs",
    icon: UserGroupIcon,
    href: "/admin/data/npcs",
    description: "Manage Non-Player Characters",
    color: "bg-blue-500"
  },
  {
    id: "pcs",
    name: "Player Characters",
    icon: UsersIcon,
    href: "/admin/data/pcs",
    description: "Manage Player Characters",
    color: "bg-green-500"
  },
  {
    id: "factions",
    name: "Factions",
    icon: ShieldCheckIcon,
    href: "/admin/data/factions",
    description: "Manage Organizations & Guilds",
    color: "bg-purple-500"
  },
  {
    id: "quests",
    name: "Quests",
    icon: ClipboardDocumentListIcon,
    href: "/admin/data/quests",
    description: "Manage Campaign Quests",
    color: "bg-orange-500"
  },
  {
    id: "locations",
    name: "Locations",
    icon: MapPinIcon,
    href: "/admin/data/locations",
    description: "Manage Locations & Maps",
    color: "bg-teal-500"
  },
  {
    id: "timeline",
    name: "Timeline",
    icon: ClockIcon,
    href: "/admin/data/timeline",
    description: "Manage Timeline Events",
    color: "bg-indigo-500"
  },
];

const adminTools = [
  {
    id: "users",
    name: "User Management",
    icon: CogIcon,
    href: "/admin/users",
    description: "Manage user roles and permissions",
    color: "bg-red-500"
  },
  {
    id: "calendar",
    name: "Calendar Management", 
    icon: CalendarIcon,
    href: "/admin/data/calendar",
    description: "Manage world calendar and events",
    color: "bg-yellow-500"
  },
  {
    id: "recaps",
    name: "Session Recaps",
    icon: DocumentTextIcon,
    href: "/admin/data/recaps", 
    description: "Manage session summaries",
    color: "bg-pink-500"
  }
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage campaign data, users, and system settings
        </p>
      </header>

      {/* Data Management Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Data Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataManagementItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${item.color} text-white group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Admin Tools Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Administration Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${tool.color} text-white group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Stats */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100">--</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">NPCs</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-green-900 dark:text-green-100">--</p>
                <p className="text-sm text-green-600 dark:text-green-400">Quests</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center">
              <MapPinIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-purple-900 dark:text-purple-100">--</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Locations</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-orange-900 dark:text-orange-100">--</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Factions</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
