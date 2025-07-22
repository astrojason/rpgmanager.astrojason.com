"use client";

import { useState } from "react";
import Image from "next/image";
import { NPC } from "@/types/interfaces";

// Generate NPC data based on available images
const npcData: NPC[] = [
  {
    id: "lessa",
    name: "Lessa",
    pronunciation: "LESS-ah",
    race: "Human",
    gender: "Female",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Human - Female",
    image: "/images/npcs/Lessa.png",
  },
  {
    id: "ailo",
    name: "Ailo",
    pronunciation: "EYE-low",
    race: "Triton",
    gender: "Male",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Triton - Male",
    image: "/images/npcs/ailo.png",
  },
  {
    id: "azorian",
    name: "Azorian",
    pronunciation: "ah-ZOR-ee-an",
    race: "Elf",
    gender: "Male",
    location: "Azorian's Tower",
    status: "Alive",
    description: "Elf - Male",
    image: "/images/npcs/azorian.png",
  },
  {
    id: "captain-azar",
    name: "Captain Azar",
    pronunciation: "ah-ZAHR",
    race: "Tiefling",
    gender: "Male",
    location: "Sandhaven",
    status: "Alive",
    faction: "Dira' al-Waha",
    description: "Tiefling - Male",
    image: "/images/npcs/captain-azar.png",
  },
  {
    id: "darrik",
    name: "Darrik",
    pronunciation: "DARE-rik",
    race: "Tortle",
    gender: "Male",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Tortle - Male",
    image: "/images/npcs/darrik.png",
  },
  {
    id: "despair",
    name: "Despair",
    pronunciation: "deh-SPAIR",
    race: "Tiefling",
    gender: "Female",
    location: "Sandhaven",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Tiefling - Female",
    image: "/images/npcs/despair.png",
  },
  {
    id: "grom-blackthorn",
    name: "Grom Blackthorn",
    pronunciation: "GROM BLACK-thorn",
    race: "Orc",
    gender: "Male",
    location: "Tidewater",
    status: "Deceased",
    faction: "The Shadow Blades",
    description: "Orc - Male",
    image: "/images/npcs/grom_blackthorn.png",
  },
  {
    id: "inara-alsahar",
    name: "Inara al-Sahar",
    pronunciation: "ih-NAH-rah al-SAH-har",
    race: "Human",
    gender: "Female",
    location: "Sandhaven",
    status: "Alive",
    faction: "The Caliphate",
    description: "Human - Female",
    image: "/images/npcs/inara_alsahar.png",
  },
  {
    id: "jokwin",
    name: "Jokwin",
    pronunciation: "JOCK-win",
    race: "Tortle",
    gender: "Male",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Tortle - Male",
    image: "/images/npcs/jokwin.png",
  },
  {
    id: "kocha",
    name: "Kocha",
    pronunciation: "KO-cha",
    race: "Tortle",
    gender: "Female",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Tortle - Female",
    image: "/images/npcs/kocha.png",
  },
  {
    id: "lyra-moonfire",
    name: "Lyra Moonfire",
    pronunciation: "LIE-rah MOON-fire",
    race: "Human",
    gender: "Female",
    location: "Unknown",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Human - Female",
    image: "/images/npcs/lyra_moonfire.png",
    hidden: true,
  },
  {
    id: "mako",
    name: "Mako",
    pronunciation: "MAY-ko",
    race: "Triton",
    gender: "Male",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Triton - Male",
    image: "/images/npcs/mako.png",
  },
  {
    id: "malacite",
    name: "Malacite",
    pronunciation: "MAL-ah-kite",
    race: "Human",
    gender: "Male",
    location: "Obsidian Spire",
    status: "Alive",
    description: "Human - Male",
    image: "/images/npcs/malacite.png",
  },
  {
    id: "merrin-vask",
    name: "Merrin Vask",
    pronunciation: "MARE-rin VASK",
    race: "Human",
    gender: "Male",
    location: "Obsidian Spire",
    status: "Alive",
    description: "Human - Male",
    image: "/images/npcs/merrin_vask.png",
    hidden: true,
  },
  {
    id: "mindy",
    name: "Elmindreda",
    aka: "Mindy",
    pronunciation: "el-min-DREE-dah",
    race: "Halfling",
    gender: "Female",
    location: "The Silent Star",
    status: "Alive",
    description: "Halfling - Female",
    image: "/images/npcs/mindy.png",
  },
  {
    id: "selene-voss",
    name: "Selene Voss",
    pronunciation: "seh-LEEN VOSS",
    race: "Human",
    gender: "Female",
    location: "The Silent Star",
    status: "Alive",
    faction: "The Silent Star",
    description: "Human - Female",
    image: "/images/npcs/selene_voss.png",
  },
  {
    id: "silas",
    name: "Silas",
    pronunciation: "SIE-las",
    race: "Dwarf",
    gender: "Male",
    location: "Unknown",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Dwarf - Male",
    image: "/images/npcs/silas.png",
    hidden: true,
  },
  {
    id: "the-bloody-thorn",
    name: "The Bloody Thorn",
    pronunciation: "BLUD-ee THORN",
    race: "Elf",
    gender: "Female",
    location: "Unknown",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Elf - Female",
    image: "/images/npcs/the_bloody_thorn.png",
  },
  {
    id: "valdus",
    name: "Valdus",
    pronunciation: "VAL-dus",
    race: "Goliath",
    gender: "Male",
    location: "Unknown",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Goliath - Male",
    image: "/images/npcs/valdus.png",
  },
  {
    id: "zephyr",
    name: "Zephyr",
    pronunciation: "ZEF-fer",
    race: "Air Genasi",
    gender: "Male",
    location: "Unknown",
    status: "Alive",
    faction: "The Shadow Blades",
    description: "Air Genasi - Male",
    image: "/images/npcs/zephyr.png",
    hidden: true,
  },
];

export default function NPCsPage() {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [raceFilter, setRaceFilter] = useState("");

  // Filter NPCs based on search criteria
  const filteredNPCs = npcData.filter((npc) => {
    // Always filter out hidden NPCs from the public list
    if (npc.hidden) return false;

    const matchesSearch =
      npc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npc.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRace = raceFilter === "" || npc.race === raceFilter;

    return matchesSearch && matchesRace;
  });

  // Get unique values for filter dropdowns
  const uniqueRaces = [
    ...new Set(npcData.filter((npc) => !npc.hidden).map((npc) => npc.race)),
  ].sort();
  const visibleNPCCount = npcData.filter((npc) => !npc.hidden).length;

  return (
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
                    alt={selectedNPC.name}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                    className="rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h1 className="text-4xl font-bold mb-1">
                      {selectedNPC.name}
                      {selectedNPC.aka && (
                        <span className="text-2xl font-normal opacity-75 ml-2">
                          &ldquo;{selectedNPC.aka}&rdquo;
                        </span>
                      )}
                    </h1>
                    <p className="text-lg opacity-75 mb-2">
                      ({selectedNPC.pronunciation})
                    </p>
                    <p className="text-lg opacity-90">
                      {selectedNPC.race} - {selectedNPC.gender}
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
                    Showing {filteredNPCs.length} of {visibleNPCCount} NPCs
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
                      alt={npc.name}
                      fill
                      style={{
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                      className={
                        npc.status === "Deceased" ? "grayscale opacity-75" : ""
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
                        {npc.name}
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
                      {npc.description}
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
  );
}
