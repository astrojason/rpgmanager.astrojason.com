"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReferrerInfo, usePageTracking, getDefaultBackInfo } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import Image from "next/image";
import { NPC, Faction } from "@/types/interfaces";

export default function NPCsPage() {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [raceFilter, setRaceFilter] = useState("");
  const [npcData, setNpcData] = useState<NPC[]>([]);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerInfo = useReferrerInfo();
  const isAdmin = useIsAdmin();
  
  // Track this page visit
  usePageTracking();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [npcResponse, factionResponse] = await Promise.all([
          fetch('/api/data/npcs'),
          fetch('/api/data/factions')
        ]);

        if (!npcResponse.ok || !factionResponse.ok) {
          throw new Error('Failed to load data');
        }

        const npcs = await npcResponse.json();
        const factions = await factionResponse.json();

        setNpcData(npcs);
        setFactionData(factions);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter only visible NPCs (not hidden)
  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden);

  // Get back button info - use referrer if available, otherwise default to NPCs
  const backInfo = selectedNPC ? (
    referrerInfo.label !== 'NPCs' ? referrerInfo : getDefaultBackInfo('npcs')
  ) : getDefaultBackInfo('npcs');

  // Auto-select NPC if query param or fragment exists
  useEffect(() => {
    const selected = searchParams.get("selected");
    const fragment = window.location.hash.slice(1); // Remove the '#'
    
    if (selectedNPC === null) {
      let npc: NPC | undefined;
      
      // First try to find by query param (ID)
      if (selected) {
        npc = visibleNPCs.find((n: NPC) => n.id === selected);
      }
      
      // If no query param match, try to find by fragment (name-based)
      if (!npc && fragment) {
        // Convert fragment back to original name format
        const searchName = fragment.replace(/-/g, ' ').toLowerCase();
        npc = visibleNPCs.find((n: NPC) => {
          const nameMatch = n.name && n.name.toLowerCase() === searchName;
          const akaMatch = n.aka && n.aka.toLowerCase() === searchName;
          return nameMatch || akaMatch;
        });
      }
      
      if (npc) {
        setSelectedNPC(npc);
        // Update URL to use query param format for consistency
        const url = new URL(window.location.href);
        url.searchParams.set('selected', npc.id);
        url.hash = ''; // Clear fragment
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, visibleNPCs, selectedNPC]);

  const [showFullImage, setShowFullImage] = useState(false);
  // Filter NPCs based on search criteria
  const filteredNPCs = visibleNPCs.filter((npc) => {
    const matchesSearch =
      !npc.nameHidden &&
      ((npc.name &&
        npc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (npc.aka && npc.aka.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (npc.race &&
          npc.race.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (npc.location &&
          npc.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (npc.description &&
          npc.description.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesRace = !raceFilter || npc.race === raceFilter;
    return matchesSearch && matchesRace;
  });

  // Helper to get faction name from UUID
  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  // CRUD functions for admin functionality
  const handleSaveNPC = async (npcData: Partial<NPC>) => {
    try {
      let response;
      if (npcData.id && isEditing) {
        // Update existing NPC
        response = await fetch('/api/data/npcs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData),
        });
      } else {
        // Create new NPC
        const newNPC = {
          ...npcData,
          id: `npc_${Date.now()}`, // Generate a simple ID
        };
        response = await fetch('/api/data/npcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNPC),
        });
      }

      if (response.ok) {
        // Reload data
        const npcsResponse = await fetch('/api/data/npcs');
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        setIsEditing(false);
        setShowAddForm(false);
        setEditingNPC({});
      }
    } catch (error) {
      console.error('Error saving NPC:', error);
    }
  };

  const handleDeleteNPC = async (npcId: string) => {
    if (!confirm('Are you sure you want to delete this NPC?')) return;
    
    try {
      const response = await fetch(`/api/data/npcs?id=${npcId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload data
        const npcsResponse = await fetch('/api/data/npcs');
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        if (selectedNPC?.id === npcId) {
          setSelectedNPC(null);
        }
      }
    } catch (error) {
      console.error('Error deleting NPC:', error);
    }
  };

  const startEditing = (npc: NPC) => {
    setEditingNPC(npc);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const startAdding = () => {
    setEditingNPC({
      name: '',
      aka: '',
      pronunciation: '',
      race: '',
      gender: '',
      description: '',
      location: '',
      status: 'Alive',
      background: '',
      personality: '',
      image: '',
      factions: [],
      hidden: false,
      nameHidden: false,
    });
    setIsEditing(false);
    setShowAddForm(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading NPCs...</span>
      </div>
    );
  }

  return (
    <>
      {/* Add/Edit NPC Modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isEditing ? 'Edit NPC' : 'Add New NPC'}
              </h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveNPC(editingNPC);
              }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingNPC.name || ''}
                      onChange={(e) => setEditingNPC({...editingNPC, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      AKA
                    </label>
                    <input
                      type="text"
                      value={editingNPC.aka || ''}
                      onChange={(e) => setEditingNPC({...editingNPC, aka: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Race
                    </label>
                    <input
                      type="text"
                      value={editingNPC.race || ''}
                      onChange={(e) => setEditingNPC({...editingNPC, race: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={editingNPC.gender || ''}
                      onChange={(e) => setEditingNPC({...editingNPC, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editingNPC.location || ''}
                      onChange={(e) => setEditingNPC({...editingNPC, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={editingNPC.status || 'Alive'}
                      onChange={(e) => setEditingNPC({...editingNPC, status: e.target.value as 'Alive' | 'Deceased' | 'Unknown'})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Alive">Alive</option>
                      <option value="Deceased">Deceased</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingNPC.description || ''}
                    onChange={(e) => setEditingNPC({...editingNPC, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={editingNPC.image || ''}
                    onChange={(e) => setEditingNPC({...editingNPC, image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingNPC.hidden || false}
                      onChange={(e) => setEditingNPC({...editingNPC, hidden: e.target.checked})}
                      className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hidden from players</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingNPC.nameHidden || false}
                      onChange={(e) => setEditingNPC({...editingNPC, nameHidden: e.target.checked})}
                      className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Name hidden</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setIsEditing(false);
                      setEditingNPC({});
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
                  >
                    {isEditing ? 'Save Changes' : 'Add NPC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
              {selectedNPC && selectedNPC.image ? (
                <Image
                  src={selectedNPC.image as string}
                  alt={selectedNPC.name || selectedNPC.aka || ""}
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
              {selectedNPC && !selectedNPC.image ? (
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
      <div className="flex bg-gray-100 dark:bg-gray-900">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedNPC ? (
            <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    // Navigate back to referrer or clear selection
                    if (referrerInfo.label !== 'NPCs') {
                      router.push(backInfo.url);
                    } else {
                      // Remove 'selected' query param from URL and clear selectedNPC synchronously
                      const url = new URL(window.location.href);
                      url.searchParams.delete("selected");
                      window.history.replaceState(
                        {},
                        "",
                        url.pathname + url.search
                      );
                      // Clear selectedNPC immediately after updating URL
                      setTimeout(() => setSelectedNPC(null), 0);
                    }
                  }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
                >
                  ← Back to {backInfo.label}
                </button>

                {/* Admin Actions */}
                {isAdmin && selectedNPC && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditing(selectedNPC)}
                      className="px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white text-sm rounded-lg transition-colors duration-200"
                    >
                      Edit NPC
                    </button>
                    <button
                      onClick={() => handleDeleteNPC(selectedNPC.id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-lg transition-colors duration-200"
                    >
                      Delete NPC
                    </button>
                  </div>
                )}
              </div>
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="relative h-96 mb-6">
                    {selectedNPC.image ? (
                      <div className="w-full h-full rounded-lg overflow-hidden relative">
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
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-400 dark:from-blue-900 dark:to-blue-700 rounded-lg flex items-end">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg" />
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
                    )}
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
                              <button className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer transition-colors duration-200">
                                {selectedNPC.location}
                              </button>
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Status:</span>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  selectedNPC.status === "Alive"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                                    : selectedNPC.status === "Deceased"
                                    ? "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                                }`}
                              >
                                {selectedNPC.status}
                              </span>
                            </p>
                            {selectedNPC.factions && (
                              <div className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Factions:</span>{" "}
                                <div className="flex flex-row flex-nowrap gap-x-2 gap-y-1 overflow-x-auto whitespace-nowrap mt-1">
                                  {selectedNPC.factions.map((factionId) => (
                                    <button
                                      key={factionId}
                                      className="inline-block bg-slate-100 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-200 whitespace-nowrap border border-slate-200 dark:border-slate-700 mr-1"
                                      onClick={() => {
                                        if (factionId) {
                                          router.push(
                                            `/factions?selected=${encodeURIComponent(
                                              factionId
                                            )}`
                                          );
                                        }
                                      }}
                                      title={getFactionName(factionId)}
                                    >
                                      {getFactionName(factionId)}
                                    </button>
                                  ))}
                                </div>
                              </div>
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

                {/* Admin Controls */}
                {isAdmin && (
                  <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Admin Mode - You can add, edit, and delete NPCs
                        </span>
                      </div>
                      <button
                        onClick={startAdding}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                      >
                        + Add New NPC
                      </button>
                    </div>
                  </div>
                )}
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Race
                      </label>
                      <select
                        value={raceFilter}
                        onChange={(e) => setRaceFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">All Races</option>
                        {Array.from(
                          new Set(visibleNPCs.map((npc: NPC) => npc.race))
                        )
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
                  onClick={() => {
                    // Remove 'selected' query param from URL first
                    const url = new URL(window.location.href);
                    url.searchParams.delete("selected");
                    window.history.replaceState(
                      {},
                      "",
                      url.pathname + url.search
                    );
                    setSelectedNPC(npc);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedNPC?.id === npc.id
                      ? "border-slate-500 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-400"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
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
                            npc.status === "Deceased"
                              ? "grayscale opacity-75"
                              : ""
                          }
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <span className="text-lg">?</span>
                        </div>
                      )}
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
