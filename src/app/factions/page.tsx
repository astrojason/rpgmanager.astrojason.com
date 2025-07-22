"use client";

import { useState } from "react";

// Faction data
interface Faction {
  id: string;
  name: string;
  pronunciation: string;
  type: string;
  description: string;
  location: string;
  status: string;
  members?: string[];
  goals?: string;
  allies?: string[];
  enemies?: string[];
  background?: string;
}

const factionData: Faction[] = [
  {
    id: "the-silent-star",
    name: "The Silent Star",
    pronunciation: "the SIE-lent STAR",
    type: "Ship Crew",
    description: "A crew aboard the ship The Silent Star",
    location: "The Silent Star (ship)",
    status: "Active",
    members: [
      "Lessa",
      "Ailo",
      "Darrik",
      "Jokwin",
      "Kocha",
      "Mako",
      "Selene Voss",
      "Elmindreda (Mindy)",
    ],
    goals: "Maritime adventures and exploration",
    background:
      "A tight-knit crew that operates in the coastal waters, known for their loyalty to each other and their captain.",
  },
  {
    id: "the-shadow-blades",
    name: "The Shadow Blades",
    pronunciation: "the SHAD-oh BLADES",
    type: "Criminal Organization",
    description: "A secretive organization of assassins and thieves",
    location: "Various",
    status: "Active",
    members: [
      "Despair",
      "Grom Blackthorn (Deceased)",
      "Lyra Moonfire",
      "Silas",
      "The Bloody Thorn",
      "Valdus",
      "Zephyr",
    ],
    goals: "Influence through stealth and elimination",
    enemies: ["The Caliphate"],
    background:
      "Operating from the shadows, this organization specializes in covert operations and has members scattered across different locations.",
  },
  {
    id: "the-caliphate",
    name: "The Caliphate",
    pronunciation: "the CAL-ih-fate",
    type: "Political Organization",
    description: "A governing political entity",
    location: "Sandhaven region",
    status: "Active",
    members: ["Inara al-Sahar"],
    goals: "Political control and governance",
    enemies: ["The Shadow Blades"],
    background:
      "A formal political organization that seeks to maintain order and control in their territory.",
  },
  {
    id: "dira-al-waha",
    name: "Dira' al-Waha",
    pronunciation: "DEE-rah al-WAH-hah",
    type: "City Watch",
    description: "The city watch of Sandhaven - 'Shield of the Oasis'",
    location: "Sandhaven",
    status: "Active",
    members: ["Captain Azar"],
    goals: "Maintain law and order in Sandhaven",
    background:
      "Dira' al-Waha, meaning 'Shield of the Oasis', serves as Sandhaven's city watch. This disciplined organization is responsible for maintaining peace, enforcing laws, and protecting the citizens of Sandhaven.",
  },
];

export default function FactionsPage() {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Filter factions based on search criteria
  const filteredFactions = factionData.filter((faction) => {
    const matchesSearch =
      faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "" || faction.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Get unique types for filter dropdown
  const uniqueTypes = [
    ...new Set(factionData.map((faction) => faction.type)),
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
                <div className="p-8">
                  <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedFaction.name}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
                      ({selectedFaction.pronunciation})
                    </p>
                    <p className="text-lg text-blue-600 dark:text-blue-400">
                      {selectedFaction.type}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          Basic Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Description:
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {selectedFaction.description}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Location:
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {selectedFaction.location}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Status:
                            </span>
                            <span
                              className={`ml-2 px-3 py-1 rounded-full text-sm ${
                                selectedFaction.status === "Active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                            >
                              {selectedFaction.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedFaction.goals && (
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Goals
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {selectedFaction.goals}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      {selectedFaction.members &&
                        selectedFaction.members.length > 0 && (
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                              Members ({selectedFaction.members.length})
                            </h3>
                            <div className="space-y-2">
                              {selectedFaction.members.map((member, index) => (
                                <div
                                  key={index}
                                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                  <span
                                    className={`text-gray-700 dark:text-gray-300 ${
                                      member.includes("Deceased")
                                        ? "line-through opacity-60"
                                        : ""
                                    }`}
                                  >
                                    {member}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {(selectedFaction.allies || selectedFaction.enemies) && (
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Relationships
                          </h3>
                          <div className="space-y-3">
                            {selectedFaction.allies && (
                              <div>
                                <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                                  Allies
                                </h4>
                                <div className="space-y-1">
                                  {selectedFaction.allies.map((ally, index) => (
                                    <div
                                      key={index}
                                      className="text-gray-600 dark:text-gray-400"
                                    >
                                      • {ally}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedFaction.enemies && (
                              <div>
                                <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">
                                  Enemies
                                </h4>
                                <div className="space-y-1">
                                  {selectedFaction.enemies.map(
                                    (enemy, index) => (
                                      <div
                                        key={index}
                                        className="text-gray-600 dark:text-gray-400"
                                      >
                                        • {enemy}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedFaction.background && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        Background
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {selectedFaction.background}
                      </p>
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
                      placeholder="Search by name, type, or description..."
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

              {/* Factions Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {filteredFactions.map((faction) => (
                  <div
                    key={faction.id}
                    onClick={() => setSelectedFaction(faction)}
                    className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
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

                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                      {faction.type}
                    </p>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {faction.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                      <span>📍 {faction.location}</span>
                      {faction.members && (
                        <span>👥 {faction.members.length} members</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredFactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    No factions found matching your search criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("");
                    }}
                    className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                  >
                    Show All Factions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
