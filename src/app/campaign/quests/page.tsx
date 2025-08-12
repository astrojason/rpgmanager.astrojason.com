"use client";

import { useState } from "react";
import questsData from "@/data/quests.json";

interface Quest {
  id: string;
  name: string;
  notes: string[];
  status: string;
}

export default function QuestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  // By default, only show active quests
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const filteredQuests = (questsData as Quest[]).filter((quest) => {
    const matchesSearch =
      quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.notes.some((note) =>
        note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    // If searching, ignore showActiveOnly and use statusFilter
    if (searchTerm.trim() !== "" || statusFilter !== "") {
      const matchesStatus =
        statusFilter === "" || quest.status === statusFilter;
      return matchesSearch && matchesStatus;
    }
    // Default: only show active quests
    return matchesSearch && (quest.status === "active" || !showActiveOnly);
  });

  const uniqueStatuses = Array.from(
    new Set((questsData as Quest[]).map((q) => q.status))
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Quests
        </h1>
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Quests
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredQuests.length} of{" "}
              {(questsData as Quest[]).length} Quests
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowActiveOnly((v) => !v);
                  setStatusFilter("");
                  setSearchTerm("");
                }}
                className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-md transition-colors duration-200"
              >
                {showActiveOnly ? "Show All Quests" : "Show Only Active"}
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {filteredQuests.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No quests found.</p>
          ) : (
            filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {quest.name}
                  </h2>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quest.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : quest.status === "completed"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}
                  >
                    {quest.status.charAt(0).toUpperCase() +
                      quest.status.slice(1)}
                  </span>
                </div>
                {quest.notes.length > 0 && (
                  <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mt-2 space-y-1">
                    {quest.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
