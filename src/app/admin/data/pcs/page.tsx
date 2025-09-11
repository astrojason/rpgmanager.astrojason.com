"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { PC } from "@/types/interfaces";

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
}

export default function PCsManagementPage() {
  const [pcs, setPcs] = useState<PC[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<PC>>({});

  // Load PCs data and users
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load PCs
      const pcsResponse = await fetch('/data/pcs.json');
      if (!pcsResponse.ok) throw new Error('Failed to load PCs');
      const pcsData = await pcsResponse.json();
      setPcs(Array.isArray(pcsData) ? pcsData : []);

      // Load Users
      try {
        const functions = getFunctions();
        const listUsers = httpsCallable(functions, 'listUsers');
        const result = await listUsers();
        setUsers(result.data as UserData[]);
      } catch (userError) {
        console.error('Failed to load users:', userError);
        // Continue without users data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPcs = pcs.filter(pc => 
    pc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.race?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.hometown?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserForPc = (pc: PC) => {
    if (!pc.player) return null;
    return users.find(user => user.uid === pc.player);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPc(null);
    setFormData({
      id: `pc-${Date.now()}`,
      name: "",
      race: "",
      hometown: "",
      status: "active",
      class: ""
    });
  };

  const handleEdit = (pc: PC) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedPc(pc);
    setFormData({ ...pc });
  };

  const handleView = (pc: PC) => {
    setSelectedPc(pc);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.race || !formData.hometown || !formData.class) {
        setError("Please fill in all required fields (Name, Race, Hometown, Class)");
        return;
      }

      const pcData = formData as PC;
      
      let response;
      let successMessage;
      
      if (isCreating) {
        response = await fetch('/api/data/pcs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pcData),
        });
        successMessage = "PC created successfully!";
      } else {
        response = await fetch('/api/data/pcs', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pcData),
        });
        successMessage = "PC updated successfully!";
      }

      if (!response.ok) {
        throw new Error('Failed to save PC');
      }

      // Update local state
      let updatedPcs;
      if (isCreating) {
        updatedPcs = [...pcs, pcData];
      } else {
        updatedPcs = pcs.map(pc => pc.id === pcData.id ? pcData : pc);
      }

      setPcs(updatedPcs);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedPc(pcData);
      setSuccess(successMessage);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save PC");
    }
  };

  const handleDelete = async (pc: PC) => {
    if (!confirm(`Are you sure you want to delete ${pc.name}?`)) return;
    
    try {
      const response = await fetch(`/api/data/pcs?id=${pc.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete PC');
      }

      const updatedPcs = pcs.filter(p => p.id !== pc.id);
      setPcs(updatedPcs);
      setSelectedPc(null);
      setSuccess("PC deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete PC");
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
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading PCs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Player Characters Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage player character sheets and information
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create PC
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
        {/* PCs List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Player Characters ({filteredPcs.length})
              </h2>
              <input
                type="text"
                placeholder="Search PCs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredPcs.map((pc) => (
                  <div
                    key={pc.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPc?.id === pc.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(pc)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {pc.name}
                        </div>
                        {pc.nickname && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            &ldquo;{pc.nickname}&rdquo;
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {pc.race} {pc.class}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          From: {pc.hometown}
                        </div>
                        {pc.player && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                            <UserIcon className="w-3 h-3 mr-1" />
                            {getUserForPc(pc)?.displayName || getUserForPc(pc)?.email || 'Unknown Player'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(pc);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pc);
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
                  {isCreating ? "Create New PC" : "Edit PC"}
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
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={formData.nickname || ""}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        Class *
                      </label>
                      <input
                        type="text"
                        value={formData.class || ""}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hometown *
                      </label>
                      <input
                        type="text"
                        value={formData.hometown || ""}
                        onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
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
                        <option value="inactive">Inactive</option>
                        <option value="retired">Retired</option>
                        <option value="deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assigned Player
                    </label>
                    <select
                      value={formData.player || ""}
                      onChange={(e) => setFormData({ ...formData, player: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No Player Assigned</option>
                      {users
                        .filter(user => !pcs.find(pc => pc.player === user.uid && pc.id !== formData.id))
                        .map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.displayName || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Factions (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.factions?.join(", ") || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        factions: e.target.value.split(",").map(f => f.trim()).filter(f => f)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., The Stormseekers, Merchants Guild"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Character Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="https://example.com/character.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Character GIF URL
                    </label>
                    <input
                      type="url"
                      value={formData.gif || ""}
                      onChange={(e) => setFormData({ ...formData, gif: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="https://example.com/character.gif"
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
                      {isCreating ? "Create PC" : "Update PC"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedPc ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedPc.name}
                    {selectedPc.nickname && <span className="text-gray-500 ml-2">&ldquo;{selectedPc.nickname}&rdquo;</span>}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedPc)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedPc)}
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
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Character Info</h3>
                      <div className="mt-2 space-y-2">
                        <p><span className="font-medium">Name:</span> {selectedPc.name}</p>
                        {selectedPc.nickname && <p><span className="font-medium">Nickname:</span> &ldquo;{selectedPc.nickname}&rdquo;</p>}
                        <p><span className="font-medium">Race:</span> {selectedPc.race}</p>
                        <p><span className="font-medium">Class:</span> {selectedPc.class}</p>
                        <p><span className="font-medium">Hometown:</span> {selectedPc.hometown}</p>
                        <p><span className="font-medium">Status:</span> <span className={`capitalize ${selectedPc.status === 'active' ? 'text-green-600' : selectedPc.status === 'deceased' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedPc.status}</span></p>
                        {selectedPc.player && (
                          <p><span className="font-medium">Player:</span> {getUserForPc(selectedPc)?.displayName || getUserForPc(selectedPc)?.email || 'Unknown Player'}</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedPc.factions && selectedPc.factions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Factions</h3>
                        <div className="mt-2">
                          {selectedPc.factions.map((faction, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                              {faction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {selectedPc.image && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Character Image</h3>
                        <Image 
                          src={selectedPc.image} 
                          alt={selectedPc.name || 'PC'}
                          width={128}
                          height={128}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    {selectedPc.gif && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Character GIF</h3>
                        <Image 
                          src={selectedPc.gif} 
                          alt={`${selectedPc.name || 'PC'} GIF`}
                          width={128}
                          height={128}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No PC selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select a player character from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
