"use client";

import { useState } from "react";
import { Faction } from "@/types/interfaces";
import factionData from "@/data/factions.json";

export default function FactionsPage() {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Filter factions based on search criteria
  const filteredFactions = factionData.filter((faction: Faction) => {
    const matchesSearch =
      faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.goals.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "" || faction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get unique values for filter dropdowns
  const uniqueTypes = [
    ...new Set(factionData.map((faction: Faction) => faction.type)),
  ].sort();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {selectedFaction ? (
          <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-800">
            <button
              onClick={() => setSelectedFaction(null)}
              className="mb-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
            >
              ← Back to Factions
            </button>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Header section - no image for factions, but styled banner */}
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-8 mb-6">
                  <div className="text-white">
                    <h1 className="text-4xl font-bold mb-1">
                      {selectedFaction.name}
                    </h1>
                    <p className="text-lg opacity-75 mb-2">
                      ({selectedFaction.pronunciation})
                    </p>
                    <p className="text-lg opacity-90">
                      {selectedFaction.type} - {selectedFaction.status}
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Basic Information
                        </h3>
                        <div className="space-y-2">
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Type:</span>{" "}
                            {selectedFaction.type}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Location:</span>{" "}
                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200">
                              {selectedFaction.location}
                            </button>
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Status:</span>{" "}
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                selectedFaction.status === "Active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                            >
                              {selectedFaction.status}
                            </span>
                          </p>
                          {selectedFaction.members &&
                            selectedFaction.members.length > 0 && (
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Members:</span>{" "}
                                {selectedFaction.members.length}
                              </p>
                            )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {selectedFaction.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Goals & Objectives
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {selectedFaction.goals}
                        </p>
                      </div>

                      {selectedFaction.background && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Background
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                            {selectedFaction.background}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Members Section */}
                  {selectedFaction.members &&
                    selectedFaction.members.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Known Members ({selectedFaction.members.length})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedFaction.members.map(
                            (member: string, index: number) => (
                              <div
                                key={index}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200 text-sm">
                                  {member}
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Relationships Section */}
                  {selectedFaction.relationships &&
                    selectedFaction.relationships.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Relationships
                        </h3>
                        <div className="space-y-3">
                          {selectedFaction.relationships.map(
                            (
                              relationship: {
                                faction: string;
                                status: string;
                                description?: string;
                              },
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200 font-medium">
                                    {relationship.faction}
                                  </button>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      relationship.status === "Allied"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : relationship.status === "Hostile"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    }`}
                                  >
                                    {relationship.status}
                                  </span>
                                </div>
                                {relationship.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {relationship.description}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Factions & Organizations
              </h1>
              {/* Search and Filters */}
              <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Factions
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, description, goals, or location..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All Types</option>
                      {uniqueTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredFactions.length} of {factionData.length}{" "}
                    factions
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("");
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Click on any faction in the sidebar to view detailed
                information.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Factions List */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Factions ({filteredFactions.length})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredFactions.map((faction) => (
              <div
                key={faction.id}
                onClick={() => setSelectedFaction(faction)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedFaction?.id === faction.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {faction.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        faction.status === "Active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {faction.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {faction.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                    <span>{faction.type}</span>
                    {faction.members && faction.members.length > 0 && (
                      <span>{faction.members.length} members</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
