"use client";

import { useState } from "react";
import Image from "next/image";
import { NPC } from "@/types/interfaces";
import npcData from "@/data/npcs.json";

export default function NPCsPage() {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("all");

  // Filter only visible NPCs (not hidden)
  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden);

  // Get unique factions for filter dropdown
  const allFactions = [
    "all",
    ...new Set(visibleNPCs.map((npc) => npc.faction).filter(Boolean)),
  ];

  // Filter NPCs based on search and faction
  const filteredNPCs = visibleNPCs.filter((npc) => {
    const matchesSearch =
      npc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npc.race.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (npc.faction &&
        npc.faction.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFaction =
      selectedFaction === "all" || npc.faction === selectedFaction;

    return matchesSearch && matchesFaction;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Non-Player Characters
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Meet the inhabitants of the world
        </p>

        {/* Search and Filters */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search NPCs
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, race, or faction..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Faction
              </label>
              <select
                value={selectedFaction}
                onChange={(e) => setSelectedFaction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {allFactions.map((faction) => (
                  <option key={faction} value={faction}>
                    {faction === "all" ? "All Factions" : faction}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredNPCs.length} of {visibleNPCs.length} NPCs
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedFaction("all");
              }}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* NPC List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Character List
            </h2>
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {filteredNPCs.map((npc) => (
                <div
                  key={npc.id}
                  onClick={() => setSelectedNPC(npc)}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                    selectedNPC?.id === npc.id
                      ? "border-blue-500 dark:border-blue-400"
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {npc.name}
                        {npc.aka && (
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                            &ldquo;{npc.aka}&rdquo;
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {npc.race} - {npc.gender}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {npc.pronunciation}
                      </p>
                    </div>
                    <div className="text-right">
                      {npc.status === "Deceased" && (
                        <span className="text-red-500 dark:text-red-400 text-sm">
                          💀 Deceased
                        </span>
                      )}
                      {npc.faction && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {npc.faction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NPC Details */}
          <div className="sticky top-8">
            {selectedNPC ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-start gap-4 mb-6">
                  {selectedNPC.image && (
                    <div className="flex-shrink-0">
                      <Image
                        src={selectedNPC.image}
                        alt={selectedNPC.name}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedNPC.name}
                      {selectedNPC.aka && (
                        <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                          &ldquo;{selectedNPC.aka}&rdquo;
                        </span>
                      )}
                    </h2>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Race:</span>{" "}
                        {selectedNPC.race}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Gender:</span>{" "}
                        {selectedNPC.gender}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Pronunciation:</span>{" "}
                        <span className="font-mono">
                          {selectedNPC.pronunciation}
                        </span>
                      </p>
                      {selectedNPC.faction && (
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Faction:</span>{" "}
                          {selectedNPC.faction}
                        </p>
                      )}
                      {selectedNPC.status === "Deceased" && (
                        <p className="text-red-500 dark:text-red-400 font-medium">
                          💀 Deceased
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedNPC.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Description
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedNPC.description}
                      </p>
                    </div>
                  </div>
                )}

                {selectedNPC.background && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Background
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedNPC.background}
                      </p>
                    </div>
                  </div>
                )}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Select an NPC to view their details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
