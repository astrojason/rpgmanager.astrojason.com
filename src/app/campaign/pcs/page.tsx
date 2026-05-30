"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import Image from "next/image";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";

export default function PCsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [raceFilter, setRaceFilter] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [pcsData, setPcsData] = useState<PC[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  usePageTracking();

  useEffect(() => {
    const loadData = async () => {
      try {
        const pcsResponse = await authFetch("/api/data/pcs");
        if (pcsResponse.ok) {
          const pcs = await pcsResponse.json();
          setPcsData(pcs);
        }
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const isActive = (status: string) => status === "Alive" || status === "Active";

  const filteredPCs = pcsData.filter((pc) => {
    const matchesSearch =
      (pc.name && pc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.nickname && pc.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.race && pc.race.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.hometown && pc.hometown.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pc.class && pc.class.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRace = !raceFilter || pc.race === raceFilter;
    const matchesActive = !showActiveOnly || isActive(pc.status);
    return matchesSearch && matchesRace && matchesActive;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Player Characters...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Player Characters</h1>
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search PCs</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, class, or hometown..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Race</label>
                <select
                  value={raceFilter}
                  onChange={(e) => setRaceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Races</option>
                  {Array.from(new Set(pcsData.map((pc: PC) => pc.race))).sort().map((race: string) => (
                    <option key={race} value={race}>{race}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredPCs.length} of {pcsData.length} PCs
              </p>
              <button
                onClick={() => { setSearchTerm(""); setRaceFilter(""); }}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Click on any character in the sidebar to view their detailed information.
          </p>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            PCs ({filteredPCs.length})
          </h2>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-xs ml-2"
            onClick={() => setShowActiveOnly((v) => !v)}
          >
            {showActiveOnly ? "Show All" : "Show Active"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredPCs.map((pc) => (
              <div
                key={pc.id}
                onClick={() => router.push(`/campaign/pcs/${pc.id}`)}
                className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    {safeImageSrc(pc.image) ? (
                      <Image
                        src={safeImageSrc(pc.image)!}
                        alt={pc.name || pc.nickname || ""}
                        fill
                        style={{ objectFit: "cover", objectPosition: "center top" }}
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
                      <h3 className={`font-medium truncate ${pc.status === "Deceased" ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>
                        {pc.name}
                        {pc.nickname && <span className="text-xs opacity-75 ml-2">&ldquo;{pc.nickname}&rdquo;</span>}
                      </h3>
                      {pc.status === "Deceased" && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">[Deceased]</span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${pc.status === "Deceased" ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}>
                      {pc.class} - {pc.race}
                    </p>
                    <p className={`text-xs truncate ${pc.status === "Deceased" ? "text-gray-400 dark:text-gray-600" : "text-gray-500 dark:text-gray-500"}`}>
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
  );
}
