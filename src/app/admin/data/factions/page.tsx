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
import { Faction } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";

export default function FactionsManagementPage() {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Faction>>({});

  // Load Factions data
  useEffect(() => {
    loadFactions();
  }, []);

  const loadFactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/factions.json');
      if (!response.ok) throw new Error('Failed to load Factions');
      const data = await response.json();
      setFactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Factions');
    } finally {
      setLoading(false);
    }
  };

  const filteredFactions = factions.filter(faction => 
    faction.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Arrow key navigation similar to NPCs editor
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = el as HTMLElement;
      return !!node.closest('input, textarea, select, [contenteditable="true"]');
    };
    const moveSelection = (delta: number) => {
      if (filteredFactions.length === 0) return;
      const idx = selectedFaction ? filteredFactions.findIndex(n => n.id === selectedFaction.id) : -1;
      if (idx === -1) {
        const nextIdx = delta > 0 ? 0 : filteredFactions.length - 1;
        const next = filteredFactions[nextIdx];
        if (next) {
          setSelectedFaction(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          setTimeout(() => {
            document.querySelector(`[data-faction-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= filteredFactions.length) return;
      const next = filteredFactions[nextIdx];
      if (!next) return;
      setSelectedFaction(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-faction-id=\"${next.id}\"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredFactions, selectedFaction, setSelectedFaction, setIsEditing, setIsCreating]);

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedFaction(null);
    setFormData({
      id: `faction-${Date.now()}`,
      name: "",
      type: "",
      location: "",
      status: "active",
      description: "",
      goals: "",
      pronunciation: ""
    });
  };

  const handleEdit = (faction: Faction) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedFaction(faction);
    setFormData({ ...faction });
  };

  const handleView = (faction: Faction) => {
    setSelectedFaction(faction);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.type || !formData.location || !formData.description || !formData.goals) {
        setError("Please fill in all required fields");
        return;
      }

      const factionData = formData as Faction;
      
      let updatedFactions;
      if (isCreating) {
        updatedFactions = [...factions, factionData];
        setSuccess("Faction created successfully!");
      } else {
        updatedFactions = factions.map(faction => faction.id === factionData.id ? factionData : faction);
        setSuccess("Faction updated successfully!");
      }

      // TODO: Save to backend/API
      setFactions(updatedFactions);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedFaction(factionData);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Faction");
    }
  };

  const handleDelete = async (faction: Faction) => {
    if (!confirm(`Are you sure you want to delete ${faction.name}?`)) return;
    
    try {
      const updatedFactions = factions.filter(f => f.id !== faction.id);
      // TODO: Save to backend/API
      setFactions(updatedFactions);
      setSelectedFaction(null);
      setSuccess("Faction deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Faction");
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
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Factions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Factions Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage organizations, guilds, and political groups
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Faction
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
        {/* Factions List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Factions ({filteredFactions.length})
              </h2>
              <input
                type="text"
                placeholder="Search Factions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredFactions.map((faction) => (
                  <div
                    key={faction.id}
                    data-faction-id={faction.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFaction?.id === faction.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(faction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {faction.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {faction.type} • {faction.location}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          Status: {faction.status}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(faction);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(faction);
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
                  {isCreating ? "Create New Faction" : "Edit Faction"}
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
                        Pronunciation
                      </label>
                      <input
                        type="text"
                        value={formData.pronunciation || ""}
                        onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="e.g., STORM-seek-ers"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type *
                      </label>
                      <input
                        type="text"
                        value={formData.type || ""}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="e.g., Guild, Organization, Military"
                        required
                      />
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
                        Status
                      </label>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="active">Active</option>
                        <option value="disbanded">Disbanded</option>
                        <option value="dormant">Dormant</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goals *</label>
                    <MarkdownEditor
                      value={formData.goals || ""}
                      onChange={(value) => setFormData({ ...formData, goals: value })}
                      rows={4}
                      label="Goals"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background</label>
                    <MarkdownEditor
                      value={formData.background || ""}
                      onChange={(value) => setFormData({ ...formData, background: value })}
                      rows={4}
                      label="Background"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="https://example.com/faction-logo.jpg"
                    />
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
                      {isCreating ? "Create Faction" : "Update Faction"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedFaction ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedFaction.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedFaction)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedFaction)}
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
                        <p><span className="font-medium">Name:</span> {selectedFaction.name}</p>
                        {selectedFaction.pronunciation && <p><span className="font-medium">Pronunciation:</span> {selectedFaction.pronunciation}</p>}
                        <p><span className="font-medium">Type:</span> {selectedFaction.type}</p>
                        <p><span className="font-medium">Location:</span> {selectedFaction.location}</p>
                        <p><span className="font-medium">Status:</span> <span className={`capitalize ${selectedFaction.status === 'active' ? 'text-green-600' : selectedFaction.status === 'disbanded' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedFaction.status}</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {selectedFaction.image && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Faction Image</h3>
                        <Image 
                          src={selectedFaction.image} 
                          alt={selectedFaction.name}
                          width={128}
                          height={128}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                  <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.description || '', true) }} />
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Goals</h3>
                  <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.goals || '', true) }} />
                </div>
                
                {selectedFaction.background && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Background</h3>
                    <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.background || '', true) }} />
                  </div>
                )}

                {selectedFaction.relationships && selectedFaction.relationships.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Relationships</h3>
                    <div className="space-y-2">
                      {selectedFaction.relationships.map((rel, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{rel.faction}</span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              rel.status === 'allied' ? 'bg-green-100 text-green-800' :
                              rel.status === 'hostile' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {rel.status}
                            </span>
                          </div>
                          {rel.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rel.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No faction selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select a faction from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
