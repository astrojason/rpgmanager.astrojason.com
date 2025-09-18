"use client";

import { useState, useEffect } from "react";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { SessionRecap } from "@/types/interfaces";

export default function RecapsManagementPage() {
  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedRecap, setSelectedRecap] = useState<SessionRecap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<SessionRecap>>({});

  // Load session recaps data
  useEffect(() => {
    loadRecaps();
  }, []);

  const loadRecaps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data/session-recaps');
      if (!response.ok) throw new Error('Failed to load session recaps');
      const data = await response.json();
      setRecaps(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session recaps');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecaps = recaps.filter(recap => 
    recap.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recap.recap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recap.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedRecap(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: "",
      recap: ""
    });
  };

  const handleEdit = (recap: SessionRecap) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedRecap(recap);
    setFormData({ ...recap });
  };

  const handleView = (recap: SessionRecap) => {
    setSelectedRecap(recap);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.recap || !formData.date) {
        setError("Please fill in all required fields (Date, Title, Recap)");
        return;
      }

      const recapData = formData as SessionRecap;
      
      let updatedRecaps;
      if (isCreating) {
        updatedRecaps = [...recaps, recapData].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSuccess("Session recap created successfully!");
      } else {
        updatedRecaps = recaps.map(recap => 
          recap.date === recapData.date ? recapData : recap
        ).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSuccess("Session recap updated successfully!");
      }

      setRecaps(updatedRecaps);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedRecap(recapData);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session recap");
    }
  };

  const handleDelete = async (recap: SessionRecap) => {
    if (!confirm(`Are you sure you want to delete the recap for "${recap.title}"?`)) return;
    
    try {
      const updatedRecaps = recaps.filter(r => r.date !== recap.date);
      setRecaps(updatedRecaps);
      setSelectedRecap(null);
      setSuccess("Session recap deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session recap");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading session recaps...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Session Recaps Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage campaign session summaries and recaps
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Recap
        </button>
      </header>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recaps List */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search recaps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow max-h-96 overflow-y-auto">
            {filteredRecaps.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No session recaps found
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecaps.map((recap) => (
                  <div key={recap.date} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleView(recap)}>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {recap.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(recap.date)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                          {recap.recap.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(recap);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(recap);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details/Edit Panel */}
        <div className="lg:col-span-2">
          {isCreating || isEditing ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isCreating ? "Create Session Recap" : "Edit Session Recap"}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date || ""}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter session title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Recap *
                  </label>
                  <textarea
                    value={formData.recap || ""}
                    onChange={(e) => setFormData({ ...formData, recap: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter session recap content..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You can use [[Entity Name]] for linked references
                  </p>
                </div>
              </div>
            </div>
          ) : selectedRecap ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Session Recap Details
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(selectedRecap)}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedRecap)}
                    className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Session Date</h3>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedRecap.date)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Session Title</h3>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedRecap.title}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Session Recap</h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                      {selectedRecap.recap}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No recap selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select a session recap from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
