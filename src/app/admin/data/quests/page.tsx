"use client";

import { useState, useEffect } from "react";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { Quest } from "@/types/interfaces";

export default function QuestsManagementPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Quest>>({});

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/quests.json');
      if (!response.ok) throw new Error('Failed to load Quests');
      const data = await response.json();
      setQuests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Quests');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuests = quests.filter(quest => 
    quest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quest.notes?.some(note => note.toLowerCase().includes(searchTerm.toLowerCase())) ||
    quest.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedQuest(null);
    setFormData({
      id: `quest-${Date.now()}`,
      name: "",
      notes: [],
      status: "active"
    });
  };

  const handleEdit = (quest: Quest) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedQuest(quest);
    setFormData({ ...quest });
  };

  const handleView = (quest: Quest) => {
    setSelectedQuest(quest);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        setError("Please fill in quest name");
        return;
      }

      const questData = formData as Quest;
      
      let updatedQuests;
      if (isCreating) {
        updatedQuests = [...quests, questData];
        setSuccess("Quest created successfully!");
      } else {
        updatedQuests = quests.map(quest => quest.id === questData.id ? questData : quest);
        setSuccess("Quest updated successfully!");
      }

      setQuests(updatedQuests);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedQuest(questData);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Quest");
    }
  };

  const handleDelete = async (quest: Quest) => {
    if (!confirm(`Are you sure you want to delete "${quest.name}"?`)) return;
    
    try {
      const updatedQuests = quests.filter(q => q.id !== quest.id);
      setQuests(updatedQuests);
      setSelectedQuest(null);
      setSuccess("Quest deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Quest");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      onhold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Quests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Quests Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage campaign quests, objectives, and storylines
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Quest
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
        {/* Quests List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Quests ({filteredQuests.length})
              </h2>
              <input
                type="text"
                placeholder="Search Quests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredQuests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedQuest?.id === quest.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(quest)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {quest.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {quest.notes && quest.notes.length > 0 ? quest.notes[0] : "No notes"}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(quest.status || 'active')}`}>
                          {quest.status || 'active'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(quest);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(quest);
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
                  {isCreating ? "Create New Quest" : "Edit Quest"}
                </h2>
              </div>
              <div className="p-6">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
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
                      Notes
                    </label>
                    <textarea
                      value={formData.notes ? formData.notes.join('\n') : ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        notes: e.target.value.split('\n').filter(line => line.trim()) 
                      })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter each note on a new line"
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
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="onhold">On Hold</option>
                    </select>
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
                      {isCreating ? "Create Quest" : "Update Quest"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedQuest ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedQuest.name}
                    </h2>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedQuest.status || 'active')}`}>
                      {selectedQuest.status || 'active'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedQuest)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedQuest)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {selectedQuest.notes && selectedQuest.notes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h3>
                      <ul className="mt-1 space-y-1">
                        {selectedQuest.notes.map((note: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="text-gray-900 dark:text-gray-100">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No quest selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select a quest from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
