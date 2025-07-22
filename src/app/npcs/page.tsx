"use client";

import { useState } from "react";
import Image from "next/image";
import { NPC } from "@/types/interfaces";
import npcData from "@/data/npcs.json";

export default function NPCsPage() {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [raceFilter, setRaceFilter] = useState("");

  // Filter only visible NPCs (not hidden)
  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden);

  const [showFullImage, setShowFullImage] = useState(false);
  // Filter NPCs based on search criteria
  const filteredNPCs = visibleNPCs.filter((npc) => {
    const matchesSearch =
      npc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npc.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRace = raceFilter === "" || npc.race === raceFilter;
    return matchesSearch && matchesRace;
  });

  // Get unique values for filter dropdowns
  const uniqueRaces = [...new Set(visibleNPCs.map((npc) => npc.race))].sort();

  return (
    <>
      {/* Full Image Modal (top-level, outside main layout) */}
      {selectedNPC && (
        <>
          {/* Animated Modal Overlay */}
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity duration-300 ${
              showFullImage
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setShowFullImage(false)}
          >
            <div
              className={`relative max-w-3xl w-full transform transition-transform duration-300 ${
                showFullImage ? "scale-100" : "scale-90"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedNPC.image}
                alt={selectedNPC.name || selectedNPC.aka || ""}
                width={900}
                height={600}
                style={{ objectFit: "contain" }}
                className={`rounded-lg shadow-2xl transition-all duration-300 ${
                  showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              />
              <button
                className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded hover:bg-opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(false);
                }}
                aria-label="Close full image"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedNPC ? (
            <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-800">
              <button
                onClick={() => setSelectedNPC(null)}
                className="mb-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Back to NPCs
              </button>
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="relative h-96 mb-6">
                    <Image
                      src={selectedNPC.image}
                      alt={selectedNPC.name || selectedNPC.aka || ""}
                      fill
                      style={{
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                      className="rounded-lg transition duration-200"
                    />
                    {/* Eye Icon Button */}
                    <button
                      type="button"
                      className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 flex items-center justify-center focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullImage(true);
                      }}
                      aria-label="View full image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 text-white pointer-events-none">
                      <h1 className="text-4xl font-bold mb-1">
                        {!selectedNPC.name || selectedNPC.nameHidden ? (
                          <>Unknown</>
                        ) : (
                          <>{selectedNPC.name}</>
                        )}
                        {selectedNPC.aka && (
                          <span
                            className={`text-2xl font-normal opacity-75${
                              selectedNPC.name ? " ml-2" : ""
                            }`}
                          >
                            &ldquo;{selectedNPC.aka}&rdquo;
                          </span>
                        )}
                      </h1>
                      {!selectedNPC.nameHidden && (
                        <p className="text-lg opacity-75 mb-2">
                          ({selectedNPC.pronunciation})
                        </p>
                      )}
                      <p className="text-lg opacity-90">
                        {selectedNPC.race} - {selectedNPC.gender}
                      </p>
                    </div>
                  </div>
                  {/* Full Image Modal handled at top-level */}
                  <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Basic Information
                          </h3>
                          <div className="space-y-2">
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Description:</span>{" "}
                              {selectedNPC.description}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Location:</span>{" "}
                              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200">
                                {selectedNPC.location}
                              </button>
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Status:</span>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  selectedNPC.status === "Alive"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : selectedNPC.status === "Deceased"
                                    ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                {selectedNPC.status}
                              </span>
                            </p>
                            {selectedNPC.faction && (
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Faction:</span>{" "}
                                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200">
                                  {selectedNPC.faction}
                                </button>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {selectedNPC.background && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Background
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                              {selectedNPC.background}
                            </p>
                          </div>
                        )}
                        {selectedNPC.personality && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Personality
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                              {selectedNPC.personality}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                  Non-Player Characters
                </h1>
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
                        placeholder="Search by name, description, or location..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Race
                      </label>
                      <select
                        value={raceFilter}
                        onChange={(e) => setRaceFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">All Races</option>
                        {uniqueRaces.map((race) => (
                          <option key={race} value={race}>
                            {race}
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
                        setRaceFilter("");
                      }}
                      className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Click on any character in the sidebar to view their detailed
                  information.
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Right Sidebar - NPCs List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              NPCs ({filteredNPCs.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {filteredNPCs.map((npc) => (
                <div
                  key={npc.id}
                  onClick={() => setSelectedNPC(npc)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedNPC?.id === npc.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={npc.image}
                        alt={npc.name || npc.aka || ""}
                        fill
                        style={{
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                        className={
                          npc.status === "Deceased"
                            ? "grayscale opacity-75"
                            : ""
                        }
                      />
                      {npc.status === "Deceased" && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <span className="text-white text-lg">💀</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-medium truncate ${
                            npc.status === "Deceased"
                              ? "text-gray-500 dark:text-gray-400 line-through"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {!npc.name || npc.nameHidden ? (
                            npc.aka ? (
                              <>&ldquo;{npc.aka}&rdquo;</>
                            ) : (
                              <>Unknown</>
                            )
                          ) : (
                            <>{npc.name}</>
                          )}
                        </h3>
                        {npc.status === "Deceased" && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            [Deceased]
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm truncate ${
                          npc.status === "Deceased"
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {npc.description} - {npc.gender}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          npc.status === "Deceased"
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-500 dark:text-gray-500"
                        }`}
                      >
                        {npc.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
