"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PC } from "@/types/interfaces";
import pcsData from "@/data/pcs.json";
import factionData from "@/data/factions.json";

export default function PCsPage() {
  const [selectedPC, setSelectedPC] = useState<PC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [raceFilter, setRaceFilter] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // All PCs (no hidden field in PC data)
  const allPCs: PC[] = pcsData;

  // Auto-select PC if query param exists
  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected && selectedPC === null) {
      const pc = allPCs.find((p: PC) => p.id === selected);
      if (pc) setSelectedPC(pc);
    }
  }, [searchParams, allPCs, selectedPC]);

  const [showFullImage, setShowFullImage] = useState(false);
  // Sidebar filter: show only active PCs or all PCs
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Helper to determine if a PC is active
  const isActive = (status: string) =>
    status === "Alive" || status === "Active";

  // Filter PCs based on search criteria and sidebar filter
  const filteredPCs = allPCs.filter((pc) => {
    const matchesSearch =
      (pc.name && pc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.nickname &&
        pc.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.race && pc.race.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.hometown &&
        pc.hometown.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.class && pc.class.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRace = !raceFilter || pc.race === raceFilter;
    const matchesActive = !showActiveOnly || isActive(pc.status);
    return matchesSearch && matchesRace && matchesActive;
  });

  // Helper to get faction name from UUID
  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  return (
    <>
      {/* Full Image Modal (top-level, outside main layout) */}
      {selectedPC && (
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
              {selectedPC && selectedPC.image ? (
                <Image
                  src={selectedPC.image as string}
                  alt={selectedPC.name || selectedPC.nickname || ""}
                  width={900}
                  height={600}
                  style={{ objectFit: "contain" }}
                  className={`rounded-lg shadow-2xl transition-all duration-300 ${
                    showFullImage
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90"
                  }`}
                />
              ) : null}
              {selectedPC && !selectedPC.image ? (
                <div
                  className={`w-full h-[600px] bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 text-5xl transition-all duration-300 ${
                    showFullImage
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90"
                  }`}
                >
                  ?
                </div>
              ) : null}
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
          {selectedPC ? (
            <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-800">
              <button
                onClick={() => {
                  // Remove 'selected' query param from URL and clear selectedPC synchronously
                  const url = new URL(window.location.href);
                  url.searchParams.delete("selected");
                  window.history.replaceState(
                    {},
                    "",
                    url.pathname + url.search
                  );
                  // Clear selectedPC immediately after updating URL
                  setTimeout(() => setSelectedPC(null), 0);
                }}
                className="mb-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Back to PCs
              </button>
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="relative h-96 mb-6">
                    {selectedPC.image ? (
                      <div className="w-full h-full rounded-lg overflow-hidden relative">
                        <Image
                          src={selectedPC.image}
                          alt={selectedPC.name || selectedPC.nickname || ""}
                          fill
                          style={{
                            objectFit: "cover",
                            objectPosition: "center top",
                          }}
                          className="rounded-lg transition duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg" />
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
                        <div className="absolute bottom-4 left-4 text-white pointer-events-none">
                          <h1 className="text-4xl font-bold mb-1">
                            {selectedPC.name}
                            {selectedPC.nickname && (
                              <span
                                className={`text-2xl font-normal opacity-75${
                                  selectedPC.name ? " ml-2" : ""
                                }`}
                              >
                                &ldquo;{selectedPC.nickname}&rdquo;
                              </span>
                            )}
                          </h1>
                          <p className="text-lg opacity-90">
                            {selectedPC.race} - {selectedPC.class}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-400 dark:from-blue-900 dark:to-blue-700 rounded-lg flex items-end">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg" />
                        <div className="absolute bottom-4 left-4 text-white pointer-events-none">
                          <h1 className="text-4xl font-bold mb-1">
                            {selectedPC.name}
                            {selectedPC.nickname && (
                              <span
                                className={`text-2xl font-normal opacity-75${
                                  selectedPC.name ? " ml-2" : ""
                                }`}
                              >
                                &ldquo;{selectedPC.nickname}&rdquo;
                              </span>
                            )}
                          </h1>
                          <p className="text-lg opacity-90">
                            {selectedPC.race} - {selectedPC.class}
                          </p>
                        </div>
                      </div>
                    )}
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
                              <span className="font-medium">Hometown:</span>{" "}
                              {selectedPC.hometown}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Status:</span>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  selectedPC.status === "Alive"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : selectedPC.status === "Deceased"
                                    ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                {selectedPC.status}
                              </span>
                            </p>
                            {selectedPC.factions &&
                              selectedPC.factions.length > 0 && (
                                <p className="text-gray-700 dark:text-gray-300">
                                  <span className="font-medium">Factions:</span>{" "}
                                  {selectedPC.factions.map(
                                    (factionId: string) => (
                                      <span key={factionId}>
                                        <button
                                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200"
                                          onClick={() => {
                                            if (factionId) {
                                              router.push(
                                                `/factions?selected=${encodeURIComponent(
                                                  factionId
                                                )}`
                                              );
                                            }
                                          }}
                                        >
                                          {getFactionName(factionId)}
                                        </button>
                                      </span>
                                    )
                                  )}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {/* Add more PC-specific info here if available */}
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
                  Player Characters
                </h1>
                {/* Search and Filters */}
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Search PCs
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, class, or hometown..."
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
                        {Array.from(new Set(allPCs.map((pc: PC) => pc.race)))
                          .sort()
                          .map((race: string) => (
                            <option key={race} value={race}>
                              {race}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {filteredPCs.length} of {allPCs.length} PCs
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
        {/* Right Sidebar - PCs List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              PCs ({filteredPCs.length})
            </h2>
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-xs ml-2"
              onClick={() => setShowActiveOnly((v) => !v)}
              title={showActiveOnly ? "Show All PCs" : "Show Only Active PCs"}
            >
              {showActiveOnly ? "Show All" : "Show Active"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {filteredPCs.map((pc) => (
                <div
                  key={pc.id}
                  onClick={() => {
                    // Remove 'selected' query param from URL first
                    const url = new URL(window.location.href);
                    url.searchParams.delete("selected");
                    window.history.replaceState(
                      {},
                      "",
                      url.pathname + url.search
                    );
                    setSelectedPC(pc);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedPC?.id === pc.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
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
                      {pc.status === "Deceased" && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <span className="text-white text-lg">💀</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-medium truncate ${
                            pc.status === "Deceased"
                              ? "text-gray-500 dark:text-gray-400 line-through"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {pc.name}
                          {pc.nickname && (
                            <span className="text-xs opacity-75 ml-2">
                              &ldquo;{pc.nickname}&rdquo;
                            </span>
                          )}
                        </h3>
                        {pc.status === "Deceased" && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            [Deceased]
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm truncate ${
                          pc.status === "Deceased"
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {pc.class} - {pc.race}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          pc.status === "Deceased"
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-500 dark:text-gray-500"
                        }`}
                      >
                        {pc.hometown}
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
