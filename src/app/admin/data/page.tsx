"use client";

import Link from "next/link";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const dataTypes = [
  { name: "NPCs", href: "/admin/data/npcs", description: "Non-player characters, merchants, quest givers" },
  { name: "Factions", href: "/admin/data/factions", description: "Organizations, guilds, political groups" },
  { name: "Locations", href: "/admin/data/locations", description: "Towns, cities, landmarks, points of interest" },
  { name: "Player Characters", href: "/admin/data/pcs", description: "Player character information and stats" },
  { name: "Quests", href: "/admin/data/quests", description: "Active, completed, and available quests" },
  { name: "Calendar", href: "/admin/data/calendar", description: "World calendar and important dates" },
  { name: "Timeline", href: "/admin/data/timeline", description: "Campaign timeline of major events" },
  { name: "Session Recaps", href: "/admin/data/recaps", description: "Session summaries and campaign notes" },
];

export default function DataManagementPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Data Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage campaign data stored in the database.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataTypes.map((type) => (
          <Link
            key={type.href}
            href={type.href}
            className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <DocumentTextIcon className="w-6 h-6 mt-0.5 mr-3 flex-shrink-0 text-blue-500" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{type.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{type.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
