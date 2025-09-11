"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { NPC } from "@/types/interfaces";

export default function NPCsManagementPage() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<NPC>>({});

  // Load NPCs data
  useEffect(() => {
    loadNpcs();
  }, []);

  const loadNpcs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/npcs.json');
      if (!response.ok) throw new Error('Failed to load NPCs');
      const data = await response.json();
      setNpcs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NPCs');
    } finally {
      setLoading(false);
    }
  };

  const filteredNpcs = npcs.filter(npc => 
    npc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    npc.aka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    npc.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    npc.race?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedNpc(null);
    setFormData({
      id: `npc-${Date.now()}`,
      name: "",
      race: "",
      gender: "",
      location: "",
      status: "alive",
      description: "",
      pronunciation: "",
      hidden: false,
      nameHidden: false
    });
  };

  const handleEdit = (npc: NPC) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedNpc(npc);
    setFormData({ ...npc });
  };

  const handleView = (npc: NPC) => {
    setSelectedNpc(npc);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.race || !formData.location) {
        setError("Please fill in all required fields (Name, Race, Location)");
        return;
      }

      const npcData = formData as NPC;
      
      let updatedNpcs;
      if (isCreating) {
        updatedNpcs = [...npcs, npcData];
        setSuccess("NPC created successfully!");
      } else {
        updatedNpcs = npcs.map(npc => npc.id === npcData.id ? npcData : npc);
        setSuccess("NPC updated successfully!");
      }

      // TODO: Save to backend/API
      setNpcs(updatedNpcs);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedNpc(npcData);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save NPC");
    }
  };

  const handleDelete = async (npc: NPC) => {
    if (!confirm(`Are you sure you want to delete ${npc.name}?`)) return;
    
    try {
      const updatedNpcs = npcs.filter(n => n.id !== npc.id);
      // TODO: Save to backend/API
      setNpcs(updatedNpcs);
      setSelectedNpc(null);
      setSuccess("NPC deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete NPC");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading NPCs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            NPCs Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage non-player characters, merchants, and quest givers
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create NPC
        </button>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NPCs List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                NPCs ({filteredNpcs.length})
              </h2>
              <input
                type="text"
                placeholder="Search NPCs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredNpcs.map((npc) => (
                  <div
                    key={npc.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNpc?.id === npc.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(npc)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {npc.nameHidden ? "[Hidden Name]" : npc.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {npc.race} • {npc.location}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Status: {npc.status}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(npc);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(npc);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail/Edit Panel */}
        <div className="lg:col-span-2">
          {(isCreating || isEditing) ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCreating ? "Create New NPC" : "Edit NPC"}
                </h2>
              </div>
              <div className="p-6">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Also Known As
                      </label>
                      <input
                        type="text"
                        value={formData.aka || ""}
                        onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Race *
                      </label>
                      <input
                        type="text"
                        value={formData.race || ""}
                        onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender || ""}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status || "alive"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="alive">Alive</option>
                        <option value="dead">Dead</option>
                        <option value="missing">Missing</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pronunciation
                    </label>
                    <input
                      type="text"
                      value={formData.pronunciation || ""}
                      onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., ah-LAIR-ah"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Background
                    </label>
                    <textarea
                      value={formData.background || ""}
                      onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Personality
                    </label>
                    <textarea
                      value={formData.personality || ""}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.hidden || false}
                        onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hidden from players</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.nameHidden || false}
                        onChange={(e) => setFormData({ ...formData, nameHidden: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Name hidden</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {isCreating ? "Create NPC" : "Update NPC"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedNpc ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedNpc.nameHidden ? "[Hidden Name]" : selectedNpc.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedNpc)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNpc)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Basic Info</h3>
                      <div className="mt-2 space-y-2">
                        <p><span className="font-medium">Name:</span> {selectedNpc.name}</p>
                        {selectedNpc.aka && <p><span className="font-medium">AKA:</span> {selectedNpc.aka}</p>}
                        {selectedNpc.pronunciation && <p><span className="font-medium">Pronunciation:</span> {selectedNpc.pronunciation}</p>}
                        <p><span className="font-medium">Race:</span> {selectedNpc.race}</p>
                        <p><span className="font-medium">Gender:</span> {selectedNpc.gender}</p>
                        <p><span className="font-medium">Location:</span> {selectedNpc.location}</p>
                        <p><span className="font-medium">Status:</span> <span className={`capitalize ${selectedNpc.status === 'alive' ? 'text-green-600' : selectedNpc.status === 'dead' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedNpc.status}</span></p>
                      </div>
                    </div>
                    
                    {selectedNpc.factions && selectedNpc.factions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Factions</h3>
                        <div className="mt-2">
                          {selectedNpc.factions.map((faction, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                              {faction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {selectedNpc.image && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Image</h3>
                        <Image 
                          src={selectedNpc.image} 
                          alt={selectedNpc.name || 'NPC'}
                          width={128}
                          height={128}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedNpc.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedNpc.description}</p>
                  </div>
                )}
                
                {selectedNpc.background && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Background</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedNpc.background}</p>
                  </div>
                )}
                
                {selectedNpc.personality && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Personality</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedNpc.personality}</p>
                  </div>
                )}

                <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {selectedNpc.hidden && <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Hidden from Players</span>}
                  {selectedNpc.nameHidden && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Name Hidden</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No NPC selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select an NPC from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
