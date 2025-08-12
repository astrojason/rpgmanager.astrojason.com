"use client";

import { useState } from "react";
import { NPC, Location } from "@/types/interfaces";
import npcData from "@/data/npcs.json";
import locationData from "@/data/locations.json";
import factionData from "@/data/factions.json";
import calendarData from "@/data/calendar.json";
import { CalendarWeekday, CalendarMonth } from "@/types/interfaces";

export default function PronunciationsPage() {
  // Calendar days and months
  const calendarWeekdays: CalendarWeekday[] = calendarData.static.weekdays;
  const calendarMonths: CalendarMonth[] = calendarData.static.months;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filter only visible NPCs (not hidden)
  const visibleNPCs = npcData.filter(
    (npc: NPC) => !npc.hidden && !npc.nameHidden
  );

  // Helper to flatten all locations and sublocations
  const flattenLocations = (
    data: Location[]
  ): Array<{ name: string; pronunciation?: string }> => {
    let result: Array<{ name: string; pronunciation?: string }> = [];
    for (const loc of data) {
      result.push({ name: loc.name, pronunciation: loc.pronunciation });
      if (Array.isArray(loc.locations)) {
        result = result.concat(flattenLocations(loc.locations));
      }
    }
    return result;
  };

  const allLocations = flattenLocations(locationData);

  // Filter data based on search and category, now including months and days
  const filterPronunciationItems = (
    items: Array<{ name: string; pronunciation?: string }>
  ) =>
    items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.pronunciation &&
          item.pronunciation.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Map NPCs to { name, pronunciation } for filtering and display
  const mappedNPCs = visibleNPCs.map((npc) => ({
    name: npc.name || npc.aka || "",
    pronunciation: npc.pronunciation || "",
  }));
  const filteredNPCs =
    selectedCategory === "npcs" || selectedCategory === "all"
      ? filterPronunciationItems(mappedNPCs)
      : [];
  const filteredLocations =
    selectedCategory === "locations" || selectedCategory === "all"
      ? filterPronunciationItems(allLocations)
      : [];
  const filteredFactions =
    selectedCategory === "factions" || selectedCategory === "all"
      ? filterPronunciationItems(factionData)
      : [];
  const filteredMonths =
    selectedCategory === "months" || selectedCategory === "all"
      ? filterPronunciationItems(calendarMonths)
      : [];
  const filteredWeekdays =
    selectedCategory === "days" || selectedCategory === "all"
      ? filterPronunciationItems(calendarWeekdays)
      : [];

  const totalResults =
    filteredNPCs.length +
    filteredLocations.length +
    filteredFactions.length +
    filteredMonths.length +
    filteredWeekdays.length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pronunciation Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          A comprehensive guide to pronouncing names, places, and factions in
          the campaign
        </p>

        {/* Search and Filters */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Pronunciations
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or pronunciation..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="npcs">NPCs</option>
                <option value="locations">Locations</option>
                <option value="factions">Factions</option>
                <option value="months">Months of the Year</option>
                <option value="days">Days of the Week</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {totalResults} pronunciation
              {totalResults !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-8">
          {/* NPCs Section */}
          {(selectedCategory === "all" || selectedCategory === "npcs") &&
            filteredNPCs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">
                    👥
                  </span>
                  NPCs ({filteredNPCs.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNPCs.map((npc, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {npc.name}
                        </h3>
                      </div>
                      <p className="text-lg font-mono text-blue-600 dark:text-blue-400 mb-1">
                        {npc.pronunciation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Locations Section */}
          {(selectedCategory === "all" || selectedCategory === "locations") &&
            filteredLocations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    📍
                  </span>
                  Locations ({filteredLocations.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLocations.map((location, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {location.name}
                      </h3>
                      <p className="text-lg font-mono text-green-600 dark:text-green-400">
                        {location.pronunciation || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Factions Section */}
          {(selectedCategory === "all" || selectedCategory === "factions") &&
            filteredFactions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    ⚔️
                  </span>
                  Factions ({filteredFactions.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFactions.map((faction, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-300 dark:hover:border-purple-500 transition-colors duration-200"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {faction.name}
                      </h3>
                      <p className="text-lg font-mono text-purple-600 dark:text-purple-400">
                        {faction.pronunciation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* No Results */}
          {totalResults === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No pronunciations found matching your search criteria.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                Show All Pronunciations
              </button>
            </div>
          )}
        </div>

        {/* Months of the Year Section */}
        {filteredMonths.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                📅
              </span>
              Months of the Year
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMonths.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="font-medium text-gray-900 dark:text-white text-lg">
                    {m.name}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-mono text-base">
                    {m.pronunciation || (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Days of the Week Section */}
        {filteredWeekdays.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                📆
              </span>
              Days of the Week
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredWeekdays.map((wd, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="font-medium text-gray-900 dark:text-white text-lg">
                    {wd.name}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-mono text-base">
                    {wd.pronunciation || (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📚 Quick Reference Tips
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Stressed syllables are shown in ALL CAPS</li>
            <li>• Hyphenated pronunciations break down syllables</li>
            <li>• Use the search to quickly find specific names</li>
            <li>• Deceased characters are marked with 💀</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
