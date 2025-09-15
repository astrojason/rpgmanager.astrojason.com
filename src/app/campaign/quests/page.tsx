"use client";

import { useState, useEffect } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from '@/components/MarkdownEditor';
import AuthorDisplay from '@/components/AuthorDisplay';
import { Quest, UserNote } from "@/types/interfaces";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from '@/utils/questUtils';

export default function QuestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [questsData, setQuestsData] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  // Authentication state
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Load quests data
  useEffect(() => {
    const loadQuests = async () => {
      try {
        const response = await fetch('/api/data/quests');
        if (!response.ok) throw new Error('Failed to load quests');
        const data = await response.json();
        setQuestsData(data);
      } catch (error) {
        console.error('Error loading quests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuests();
  }, []);

  const filteredQuests = questsData.filter((quest) => {
    const matchesSearch =
      quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizeQuestNotes(quest).some((note) =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    // If searching, ignore showActiveOnly and use statusFilter
    if (searchTerm.trim() !== "" || statusFilter !== "") {
      const matchesStatus =
        statusFilter === "" || quest.status === statusFilter;
      return matchesSearch && matchesStatus;
    }
    // Default: only show active quests
    return matchesSearch && (quest.status === "active" || !showActiveOnly);
  });

    // Get unique status values for the dropdown
  const uniqueStatuses = [...new Set(questsData.map(quest => quest.status))];

  const handleAddNote = async (questId: string) => {
    if (!questId || !newNoteContent.trim() || !user) return;
    
    try {
      const quest = questsData.find(q => q.id === questId);
      if (!quest) throw new Error('Quest not found');

      const newUserNote: UserNote = {
        id: `note-${Date.now()}`,
        content: newNoteContent.trim(),
        timestamp: new Date().toISOString(),
        author: user.uid
      };

      // Normalize existing notes and add the new one
      const normalizedNotes = normalizeQuestNotes(quest);
      const updatedQuest = {
        ...quest,
        notes: [...normalizedNotes, newUserNote] as UserNote[]
      };

      // Save to backend
      const response = await fetch('/api/data/quests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedQuest),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // Update local state
      const updatedQuests = questsData.map(q => 
        q.id === questId ? updatedQuest : q
      );
      setQuestsData(updatedQuests);
      setNewNoteContent("");
      setEditingNote(null);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  };

  const canEditNote = (note: UserNote) => {
    const uid = user?.uid;
    return !!uid && (isAdmin || uid === note.author);
  };

  const handleStartEditNote = (note: UserNote) => {
    if (!canEditNote(note)) return;
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveEditNote = async (questId: string, noteId: string) => {
    if (!user) return;
    try {
      const quest = questsData.find((q) => q.id === questId);
      if (!quest) throw new Error('Quest not found');
      const notes = normalizeQuestNotes(quest).map((n) =>
        n.id === noteId ? { ...n, content: editingNoteContent, timestamp: new Date().toISOString(), author: user.uid } : n
      );
      const updatedQuest = { ...quest, notes };
      const response = await fetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to update note');
      const updatedQuests = questsData.map(q => q.id === questId ? updatedQuest : q);
      setQuestsData(updatedQuests);
      setEditingNoteId(null);
      setEditingNoteContent("");
    } catch (e) {
      console.error('Error updating note:', e);
      alert('Failed to update note');
    }
  };

  const handleDeleteNote = async (questId: string, noteId: string) => {
    try {
      const quest = questsData.find((q) => q.id === questId);
      if (!quest) throw new Error('Quest not found');
      const notes = normalizeQuestNotes(quest).filter((n) => n.id !== noteId);
      const updatedQuest = { ...quest, notes };
      const response = await fetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to delete note');
      const updatedQuests = questsData.map(q => q.id === questId ? updatedQuest : q);
      setQuestsData(updatedQuests);
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Failed to delete note');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Quests...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Quests
        </h1>
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Quests
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredQuests.length} of{" "}
              {(questsData as Quest[]).length} Quests
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowActiveOnly((v) => !v);
                  setStatusFilter("");
                  setSearchTerm("");
                }}
                className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-md transition-colors duration-200"
              >
                {showActiveOnly ? "Show All Quests" : "Show Only Active"}
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {filteredQuests.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No quests found.</p>
          ) : (
            filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {quest.name}
                  </h2>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quest.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : quest.status === "completed"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}
                  >
                    {quest.status.charAt(0).toUpperCase() +
                      quest.status.slice(1)}
                  </span>
                </div>

                {/* Existing Quest Notes */}
                {quest.notes && quest.notes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes:
                    </h3>
                    <div className="space-y-3">
                      {normalizeQuestNotes(quest).map((note) => (
                        <div key={note.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          {editingNoteId === note.id ? (
                            <>
                              <MarkdownEditor value={editingNoteContent} onChange={setEditingNoteContent} />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEditNote(quest.id, note.id)}
                                  className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                  Save
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="prose prose-sm dark:prose-invert max-w-none mb-2">
                                <ReactMarkdown>{note.content}</ReactMarkdown>
                              </div>
                              {!isLegacyNote(note) && (
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <span>{formatNoteTimestamp(note)}</span>
                                  <div className="flex items-center gap-2">
                                    <AuthorDisplay uid={note.author} />
                                    {canEditNote(note) && (
                                      <>
                                        <button onClick={() => handleStartEditNote(note)} className="text-xs text-slate-600 dark:text-slate-300 hover:underline">
                                          Edit
                                        </button>
                                        <button onClick={() => handleDeleteNote(quest.id, note.id)} className="text-xs text-rose-600 dark:text-rose-300 hover:underline">
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isDM && (quest as Quest).gm_notes && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">GM Notes</h3>
                    <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks((quest as Quest).gm_notes || '', true) }} />
                  </div>
                )}

                {/* Add Note Section for Authenticated Users */}
                {user && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => {
                        if (editingNote === quest.id) {
                          setEditingNote(null);
                          setNewNoteContent("");
                        } else {
                          setEditingNote(quest.id);
                          setNewNoteContent("");
                        }
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                    >
                      {editingNote === quest.id ? "Cancel" : "Add Note"}
                    </button>

                    {editingNote === quest.id && (
                      <div className="mt-3">
                        <MarkdownEditor
                          value={newNoteContent}
                          onChange={setNewNoteContent}
                          placeholder="Add Note"
                          label="Notes"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              setEditingNote(null);
                              setNewNoteContent("");
                            }}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddNote(quest.id)}
                            disabled={!newNoteContent.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
