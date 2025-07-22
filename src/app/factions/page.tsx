"use client";

import { useState } from "react";
import { Faction } from "@/types/interfaces";
import factionData from "@/data/factions.json";

export default function FactionsPage() {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter factions based on search
  const filteredFactions = factionData.filter(
    (faction: Faction) =>
      faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.goals.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Factions & Organizations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The groups, guilds, and organizations that shape the world
        </p>

        {/* Search */}
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
                placeholder="Search by name, description, or goals..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredFactions.length} of {factionData.length} factions
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
            >
              Clear Search
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Faction List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Organizations
            </h2>
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {filteredFactions.map((faction) => (
                <div
                  key={faction.id}
                  onClick={() => setSelectedFaction(faction)}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                    selectedFaction?.id === faction.id
                      ? "border-blue-500 dark:border-blue-400"
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {faction.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {faction.description}
                    </p>
                    {faction.members && faction.members.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {faction.members.length} member
                        {faction.members.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Faction Details */}
          <div className="sticky top-8">
            {selectedFaction ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {selectedFaction.name}
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Description
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedFaction.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Goals & Objectives
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedFaction.goals}
                    </p>
                  </div>

                  {selectedFaction.background && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Background
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedFaction.background}
                      </p>
                    </div>
                  )}

                  {selectedFaction.members &&
                    selectedFaction.members.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Known Members ({selectedFaction.members.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedFaction.members.map(
                            (member: string, index: number) => (
                              <div
                                key={index}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                              >
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {member}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {selectedFaction.relationships &&
                    selectedFaction.relationships.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Relationships
                        </h3>
                        <div className="space-y-2">
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
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {relationship.faction}
                                  </span>
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
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a faction to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
