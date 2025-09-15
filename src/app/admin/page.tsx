"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    color: "bg-slate-500"
  },
  {
    id: "pcs",
    name: "Player Characters",
    icon: UsersIcon,
    href: "/admin/data/pcs",
    description: "Manage Player Characters",
    color: "bg-emerald-500"
  },
  {
    id: "factions",
    name: "Factions",
    icon: ShieldCheckIcon,
    href: "/admin/data/factions",
    description: "Manage Organizations & Guilds",
    color: "bg-stone-500"
  },
  {
    id: "quests",
    name: "Quests",
    icon: ClipboardDocumentListIcon,
    href: "/admin/data/quests",
    description: "Manage Campaign Quests",
    color: "bg-amber-600"
  },
  {
    id: "locations",
    name: "Locations",
    icon: MapPinIcon,
    href: "/admin/data/locations",
    description: "Manage Locations & Maps",
    color: "bg-teal-600"
  },
  {
    id: "timeline",
    name: "Timeline",
    icon: ClockIcon,
    href: "/admin/data/timeline",
    description: "Manage Timeline Events",
    color: "bg-slate-600"
  },
];

const adminTools = [
  {
    id: "users",
    name: "User Management",
    icon: CogIcon,
    href: "/admin/users",
    description: "Manage user roles and permissions",
    color: "bg-rose-600"
  },
  {
    id: "calendar",
    name: "Calendar Management", 
    icon: CalendarIcon,
    href: "/admin/data/calendar",
    description: "Manage world calendar and events",
    color: "bg-amber-500"
  },
  {
    id: "recaps",
    name: "Session Recaps",
    icon: DocumentTextIcon,
    href: "/admin/data/recaps", 
    description: "Manage session summaries",
    color: "bg-stone-500"
  }
];

export default function AdminPage() {
  const [counts, setCounts] = useState<{ npcs?: number; quests?: number; locations?: number; factions?: number }>({});

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      try {
        const [npcsRes, questsRes, locationsRes, factionsRes] = await Promise.all([
          fetch('/api/data/npcs', { cache: 'no-store' }),
          fetch('/api/data/quests', { cache: 'no-store' }),
          fetch('/api/data/locations', { cache: 'no-store' }),
          fetch('/api/data/factions', { cache: 'no-store' }),
        ]);

        const [npcs, quests, locations, factions] = await Promise.all([
          npcsRes.ok ? npcsRes.json() : Promise.resolve([]),
          questsRes.ok ? questsRes.json() : Promise.resolve([]),
          locationsRes.ok ? locationsRes.json() : Promise.resolve([]),
          factionsRes.ok ? factionsRes.json() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setCounts({
            npcs: Array.isArray(npcs) ? npcs.length : 0,
            quests: Array.isArray(quests) ? quests.length : 0,
            locations: Array.isArray(locations) ? locations.length : 0,
            factions: Array.isArray(factions) ? factions.length : 0,
          });
        }
      } catch {
        if (!cancelled) setCounts((c) => ({ ...c }));
      }
    }
    loadCounts();
    return () => { cancelled = true; };
  }, []);

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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
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
          <div className="p-6 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts.npcs ?? '--'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">NPCs</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">{counts.quests ?? '--'}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Quests</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-stone-50 dark:bg-stone-900/20 rounded-lg border border-stone-200 dark:border-stone-800">
            <div className="flex items-center">
              <MapPinIcon className="w-8 h-8 text-stone-600 dark:text-stone-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{counts.locations ?? '--'}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">Locations</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-amber-900 dark:text-amber-100">{counts.factions ?? '--'}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Factions</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
