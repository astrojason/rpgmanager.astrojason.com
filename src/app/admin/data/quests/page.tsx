"use client";

import { useState, useEffect } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from '@/components/MarkdownEditor';
import UserNotesEditor from '@/components/UserNotesEditor';
import AuthorDisplay from '@/components/AuthorDisplay';
import { Quest, UserNote } from '@/types/interfaces';
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from '@/utils/questUtils';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

export default function QuestsManagementPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Quest>>({});

  // Authentication state
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data/quests');
      if (!response.ok) throw new Error('Failed to load Quests');
      const data = await response.json();
      setQuests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Quests');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuests = quests.filter(quest => {
    const searchLower = searchTerm.toLowerCase();
    const normalizedNotes = normalizeQuestNotes(quest);
    const notesText = normalizedNotes
      .map(note => note.content).join(" ");
    
    return quest.name?.toLowerCase().includes(searchLower) ||
      notesText.toLowerCase().includes(searchLower) ||
      quest.status?.toLowerCase().includes(searchLower);
  });

  // Arrow key navigation similar to NPCs editor
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = el as HTMLElement;
      return !!node.closest('input, textarea, select, [contenteditable="true"]');
    };
    const moveSelection = (delta: number) => {
      if (filteredQuests.length === 0) return;
      let idx = selectedQuest ? filteredQuests.findIndex(n => n.id === selectedQuest.id) : -1;
      if (idx === -1) {
        const nextIdx = delta > 0 ? 0 : filteredQuests.length - 1;
        const next = filteredQuests[nextIdx];
        if (next) {
          setSelectedQuest(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          setTimeout(() => {
            document.querySelector(`[data-quest-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= filteredQuests.length) return;
      const next = filteredQuests[nextIdx];
      if (!next) return;
      setSelectedQuest(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-quest-id=\"${next.id}\"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredQuests, selectedQuest, setSelectedQuest, setIsEditing, setIsCreating]);

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
      
      if (isCreating) {
        // Create new quest
        const response = await fetch('/api/data/quests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(questData),
        });

        if (!response.ok) {
          throw new Error('Failed to create quest');
        }

        const result = await response.json();
        const updatedQuests = [...quests, result.data];
        setQuests(updatedQuests);
        setSelectedQuest(result.data);
        setSuccess("Quest created successfully!");
      } else {
        // Update existing quest
        const response = await fetch('/api/data/quests', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(questData),
        });

        if (!response.ok) {
          throw new Error('Failed to update quest');
        }

        const result = await response.json();
        const updatedQuests = quests.map(quest => quest.id === questData.id ? result.data : quest);
        setQuests(updatedQuests);
        setSelectedQuest(result.data);
        setSuccess("Quest updated successfully!");
      }
      
      setIsCreating(false);
      setIsEditing(false);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Quest");
    }
  };

  const handleDelete = async (quest: Quest) => {
    if (!confirm(`Are you sure you want to delete "${quest.name}"?`)) return;
    
    try {
      const response = await fetch(`/api/data/quests?id=${encodeURIComponent(quest.id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quest');
      }

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
                    data-quest-id={quest.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedQuest?.id === quest.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(quest)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {quest.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 max-h-16 overflow-hidden">
                          {(() => {
                            // Handle quest notes array - each note on its own line with markdown
                            if (quest.notes && quest.notes.length > 0) {
                              // Show first few notes, truncate if needed
                              const normalizedNotes = normalizeQuestNotes(quest);
                              const displayNotes = normalizedNotes.slice(0, 3);
                              return (
                                <>
                                  {displayNotes.map((note, noteIndex) => (
                                    <div key={noteIndex} className="flex items-start">
                                      <span className="text-gray-400 mr-1 mt-0.5 flex-shrink-0">•</span>
                                      <div className="prose dark:prose-invert prose-xs max-w-none overflow-hidden">
                                        <ReactMarkdown
                                          components={{
                                            p: ({ children }) => <span>{children}</span>,
                                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                            em: ({ children }) => <em className="italic">{children}</em>,
                                            code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">{children}</code>,
                                          }}
                                        >
                                          {note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  ))}
                                  {normalizedNotes.length > 3 && (
                                    <div className="text-xs italic pl-4">
                                      +{quest.notes.length - 3} more notes...
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return <div>No notes</div>;
                          })()}
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
                    <UserNotesEditor
                      notes={formData.notes ? 
                        (typeof formData.notes[0] === 'string' ? 
                          (formData.notes as string[]).map((content, index) => ({
                            id: `legacy-${index}`,
                            content,
                            timestamp: '',
                            author: 'Unknown'
                          })) : 
                          formData.notes as UserNote[]
                        ) : []
                      }
                      onChange={(notes) => setFormData({ ...formData, notes })}
                      currentUser={user}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GM Notes</label>
                    <MarkdownEditor
                      value={(formData as any).gm_notes || ""}
                      onChange={(value) => setFormData({ ...formData, gm_notes: value as any })}
                      rows={4}
                      label="GM Notes"
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
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Notes</h3>
                      <div className="space-y-4">
                        {normalizeQuestNotes(selectedQuest).map((note: UserNote, index: number) => (
                          <div key={note.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600 rounded-t-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Note #{index + 1}
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="prose dark:prose-invert max-w-none prose-sm mb-2">
                                <ReactMarkdown>{note.content}</ReactMarkdown>
                              </div>
                              {!isLegacyNote(note) && (
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <span>{formatNoteTimestamp(note)}</span>
                                  <AuthorDisplay uid={note.author} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
