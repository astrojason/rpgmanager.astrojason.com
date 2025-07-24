"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import npcData from "@/data/npcs.json";
import pcsData from "@/data/pcs.json";
import Image from "next/image";
import { Faction, NPC, PC } from "@/types/interfaces";
import factionData from "@/data/factions.json";

export default function FactionsPage() {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [factionMembers, setFactionMembers] = useState<NPC[] | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Auto-select faction if query param exists
  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      const faction = factionData.find((f: Faction) => f.id === selected);
      if (faction) setSelectedFaction(faction);
    }
  }, [searchParams]);

  const [factionPCs, setFactionPCs] = useState<PC[] | null>(null);
  useEffect(() => {
    if (!selectedFaction) return;
    setFactionMembers(
      npcData.filter((npc: NPC) => npc.factions?.includes(selectedFaction.id))
    );
    setFactionPCs(
      pcsData.filter((pc: PC) => pc.factions?.includes(selectedFaction.id))
    );
  }, [selectedFaction]);

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
                {/* Header section - show image if available, else fallback to gradient */}
                <div className="relative mb-6">
                  {selectedFaction.image ? (
                    <div className="relative h-56 md:h-72 w-full group">
                      <Image
                        src={selectedFaction.image}
                        alt={selectedFaction.name}
                        fill
                        style={{
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                        className="w-full h-full object-cover object-top"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      {/* Eye Icon Button */}
                      <button
                        type="button"
                        className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 flex items-center justify-center focus:outline-none opacity-80 group-hover:opacity-100 transition"
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
                      <div className="absolute bottom-0 left-0 p-8 text-white">
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
                  ) : (
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-8 flex items-center justify-center">
                      <span className="text-5xl text-white/60 absolute left-8 top-8">
                        ?
                      </span>
                      <div className="text-white w-full">
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
                  )}
                </div>

                {/* Full Image Modal */}
                {selectedFaction.image && (
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
                        src={selectedFaction.image}
                        alt={selectedFaction.name}
                        width={900}
                        height={600}
                        style={{ objectFit: "contain" }}
                        className={`rounded-lg shadow-2xl transition-all duration-300 ${
                          showFullImage
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-90"
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
                )}
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
                          {factionMembers && factionMembers.length > 0 && (
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Members:</span>{" "}
                              {factionMembers.length}
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
                  {factionMembers && factionMembers.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Known NPC Members ({factionMembers.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {factionMembers.map((npc: NPC, index: number) => {
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500`}
                              onClick={() =>
                                router.push(`/npcs?selected=${npc.id}`)
                              }
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                  {npc.image ? (
                                    <Image
                                      src={npc.image}
                                      alt={npc.name || npc.aka || ""}
                                      fill
                                      style={{
                                        objectFit: "cover",
                                        objectPosition: "center top",
                                      }}
                                      className={
                                        npc && npc.status === "Deceased"
                                          ? "grayscale opacity-75"
                                          : ""
                                      }
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                      <span className="text-lg">?</span>
                                    </div>
                                  )}
                                  {npc && npc.status === "Deceased" && (
                                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                      <span className="text-white text-lg">
                                        💀
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3
                                      className={`font-medium truncate ${
                                        npc && npc.status === "Deceased"
                                          ? "text-gray-500 dark:text-gray-400 line-through"
                                          : "text-gray-900 dark:text-white"
                                      }`}
                                    >
                                      {!npc.name || npc.nameHidden
                                        ? npc.aka
                                          ? `“${npc.aka}”`
                                          : "Unknown"
                                        : npc.name}
                                    </h3>
                                    {npc && npc.status === "Deceased" && (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                        [Deceased]
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={`text-sm truncate ${
                                      npc && npc.status === "Deceased"
                                        ? "text-gray-400 dark:text-gray-500"
                                        : "text-gray-600 dark:text-gray-400"
                                    }`}
                                  >
                                    {npc
                                      ? `${npc.description} - ${npc.gender}`
                                      : "NPC not found"}
                                  </p>
                                  <p
                                    className={`text-xs truncate ${
                                      npc && npc.status === "Deceased"
                                        ? "text-gray-400 dark:text-gray-600"
                                        : "text-gray-500 dark:text-gray-500"
                                    }`}
                                  >
                                    {npc ? npc.location : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* PCs Section */}
                  {factionPCs && factionPCs.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Player Characters ({factionPCs.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {factionPCs.map((pc: PC, index: number) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            onClick={() =>
                              (window.location.href = `/pcs?selected=${pc.id}`)
                            }
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                {pc.image ? (
                                  <Image
                                    src={pc.image}
                                    alt={pc.name || pc.nickname || ""}
                                    fill
                                    style={{
                                      objectFit: "cover",
                                      objectPosition: "center top",
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    <span className="text-lg">?</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium truncate text-gray-900 dark:text-white">
                                    {pc.name}
                                    {pc.nickname ? ` "${pc.nickname}"` : ""}
                                  </h3>
                                </div>
                                <p className="text-sm truncate text-gray-600 dark:text-gray-400">
                                  {pc.race} - {pc.class}
                                </p>
                                <p className="text-xs truncate text-gray-500 dark:text-gray-500">
                                  {pc.hometown}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
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
                    {factionMembers && factionMembers.length > 0 && (
                      <span>{factionMembers.length} members</span>
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
