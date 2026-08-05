"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from '@/components/MarkdownEditor';
import AuthorDisplay from '@/components/AuthorDisplay';
import { Quest, SessionRecap, UserNote } from "@/types/interfaces";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from '@/utils/questUtils';
import { authFetch } from "@/utils/authFetch";
import { getRecapsForQuest } from "@/utils/entityTags";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import Link from "next/link";

const STATUS_TONE: Record<string, { chip: string; word: string; rail: string; railClass: string; glow: boolean }> = {
  active:    { chip: "is-ember",  word: "active",   rail: "var(--grim-ember)",  railClass: "bg-grim-ember",  glow: true },
  rumored:   { chip: "is-arcane", word: "rumored",  rail: "var(--grim-arcane)", railClass: "bg-grim-arcane", glow: true },
  completed: { chip: "",          word: "closed",   rail: "var(--grim-line-2)", railClass: "bg-grim-line-2", glow: false },
  complete:  { chip: "",          word: "closed",   rail: "var(--grim-line-2)", railClass: "bg-grim-line-2", glow: false },
};

function getTone(status: string) {
  return STATUS_TONE[status] ?? { chip: "is-unknown", word: status, rail: "var(--grim-bone)", railClass: "bg-grim-bone", glow: false };
}

const FILTERS = [
  { id: "all",       label: "All Errands" },
  { id: "active",    label: "Active" },
  { id: "completed", label: "Closed" },
];

export default function QuestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const userId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { data: questsData = [], isPending: loading } = useQuery<Quest[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => {
      const res = await authFetch('/api/data/quests');
      if (!res.ok) throw new Error('Failed to load quests');
      return res.json();
    },
  });
  const { data: recapsData = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => {
      const res = await authFetch('/api/data/session-recaps');
      if (!res.ok) throw new Error('Failed to load recaps');
      return res.json();
    },
  });

  const [activeFilter, setActiveFilter] = useState("active");
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const questRefs = useRef<Record<string, HTMLElement | null>>({});
  const searchParams = useSearchParams();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  // Quest creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestName, setNewQuestName] = useState("");
  const [newQuestStatus, setNewQuestStatus] = useState("active");
  const [createError, setCreateError] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    const questId = searchParams.get("quest");
    if (questId && questsData.length > 0) {
      const quest = questsData.find(q => q.id === questId);
      if (quest) {
        // If the quest is not visible under the current filter, switch to "all"
        const visible =
          activeFilter === "all" ||
          quest.status === activeFilter ||
          (activeFilter === "completed" && (quest.status === "completed" || quest.status === "complete"));
        if (!visible) setActiveFilter("all");
      }
      setActiveQuest(questId);
      setTimeout(() => {
        questRefs.current[questId]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questsData, searchParams]);

  const filteredQuests = questsData.filter((quest) => {
    const matchesSearch =
      !searchTerm.trim() ||
      quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizeQuestNotes(quest).some((note) =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesFilter =
      activeFilter === "all" ||
      quest.status === activeFilter ||
      (activeFilter === "completed" && (quest.status === "completed" || quest.status === "complete"));
    return matchesSearch && matchesFilter;
  });

  const countFor = (filterId: string) => {
    if (filterId === "all") return questsData.length;
    if (filterId === "completed") return questsData.filter(q => q.status === "completed" || q.status === "complete").length;
    return questsData.filter(q => q.status === filterId).length;
  };

  const handleCreateQuest = async () => {
    if (!newQuestName.trim()) {
      setCreateError("An errand must have a name.");
      return;
    }
    setCreateError("");
    try {
      const payload = { id: `quest-${Date.now()}`, name: newQuestName.trim(), status: newQuestStatus, notes: [] };
      const response = await authFetch('/api/data/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create quest');
      await response.json();
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
      setIsCreating(false);
      setNewQuestName("");
      setNewQuestStatus("active");
    } catch (error) {
      console.error('Error creating quest:', error);
      setCreateError('Failed to create errand. Please try again.');
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewQuestName("");
    setNewQuestStatus("active");
    setCreateError("");
  };

  const handleAddNote = async (questId: string) => {
    if (!questId || !newNoteContent.trim() || !userId) return;
    try {
      const quest = questsData.find(q => q.id === questId);
      if (!quest) throw new Error('Quest not found');
      const newUserNote: UserNote = {
        id: `note-${Date.now()}`,
        content: newNoteContent.trim(),
        timestamp: new Date().toISOString(),
        author: userId,
      };
      const normalizedNotes = normalizeQuestNotes(quest);
      const updatedQuest = { ...quest, notes: [...normalizedNotes, newUserNote] as UserNote[] };
      const response = await authFetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to save note');
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
      setNewNoteContent("");
      setEditingNote(null);
    } catch (e) {
      setNoteError(toErrorMessage(e));
    }
  };

  const canEditNote = (note: UserNote) => !!userId && (isAdmin || userId === note.author);

  const handleStartEditNote = (note: UserNote) => {
    if (!canEditNote(note)) return;
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveEditNote = async (questId: string, noteId: string) => {
    if (!userId) return;
    try {
      const quest = questsData.find((q) => q.id === questId);
      if (!quest) throw new Error('Quest not found');
      const notes = normalizeQuestNotes(quest).map((n) =>
        n.id === noteId ? { ...n, content: editingNoteContent, timestamp: new Date().toISOString(), author: userId } : n
      );
      const updatedQuest = { ...quest, notes };
      const response = await authFetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to update note');
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
      setEditingNoteId(null);
      setEditingNoteContent("");
    } catch (e) {
      setNoteError(toErrorMessage(e));
    }
  };

  const handleDeleteNote = async (questId: string, noteId: string) => {
    try {
      const quest = questsData.find((q) => q.id === questId);
      if (!quest) throw new Error('Quest not found');
      const notes = normalizeQuestNotes(quest).filter((n) => n.id !== noteId);
      const updatedQuest = { ...quest, notes };
      const response = await authFetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to delete note');
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
    } catch (e) {
      setNoteError(toErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the ledger&hellip;
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full">
      {noteError && <ErrorBlock error={noteError} onDismiss={() => setNoteError(null)} />}

      {/* Page header */}
      <div className="flex justify-between items-end mb-5.5">
        <div>
          <div className="grim-page-eyebrow">The Campaign Record</div>
          <h1 className="grim-page-title">The Ledger of Errands</h1>
          <p className="grim-page-sub">Every thread the party has taken up — those in motion and those laid to rest.</p>
        </div>
        {userId && (
          <button className="grim-btn is-ember" onClick={() => setIsCreating(true)}>+ New Errand</button>
        )}
      </div>

      {/* Search + filter bar */}
      <section className="flex gap-3 items-stretch mb-5.5">
        <div className="relative flex-1 min-w-70">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek an errand by name or note…"
            className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
          />
          <span
            className="absolute left-3.5 text-grim-gold-2 text-2xl pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >✦</span>
        </div>
        <div className="flex gap-1 p-1 bg-grim-bg-3 border border-grim-line">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearchTerm(""); }}
              className={`grim-btn ${activeFilter === f.id ? "is-ember" : "is-ghost"} py-1.5 px-3 border ${activeFilter === f.id ? "border-grim-ember" : "border-transparent"} ${activeFilter === f.id ? "" : "bg-transparent"}`}
            >
              {f.label}
              <span className="grim-mono text-sm opacity-70 ml-0.5">{countFor(f.id)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase mb-3.5">
        Showing {filteredQuests.length} of {questsData.length} errands
      </div>

      {/* Quest cards */}
      <div className="grim-stack gap-4.5">

        {/* Inline creation form */}
        {isCreating && (
          <section className="grim-tome py-5.5 px-6.5">
            <div className="grim-label mb-3.5">New Errand</div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="grim-label mb-1.5">Name</div>
                <input
                  autoFocus
                  value={newQuestName}
                  onChange={(e) => { setNewQuestName(e.target.value); setCreateError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateQuest(); if (e.key === "Escape") handleCancelCreate(); }}
                  placeholder="Enter errand name…"
                  className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.25 px-3.5 outline-none"
                />
              </div>
              <div>
                <div className="grim-label mb-1.5">Status</div>
                <select
                  value={newQuestStatus}
                  onChange={(e) => setNewQuestStatus(e.target.value)}
                  className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.25 px-3.5 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="rumored">Rumored</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {createError && (
                <div className="grim-mono text-sm text-grim-blood-2 tracking-wider-2">{createError}</div>
              )}
              <div className="flex justify-end gap-2 mt-1">
                <button className="grim-btn is-ghost" onClick={handleCancelCreate}>Cancel</button>
                <button className="grim-btn is-ember" onClick={handleCreateQuest} disabled={!newQuestName.trim()}>Save</button>
              </div>
            </div>
          </section>
        )}

        {filteredQuests.length === 0 ? (
          <div className="text-center py-15 px-6 text-grim-ink-4">
            <div className="font-display text-5xl text-grim-ink-3 mb-2">~ no errands found ~</div>
            <div className="grim-mono text-sm tracking-widest-2 uppercase">
              Adjust your filters or search
            </div>
          </div>
        ) : (
          filteredQuests.map((quest) => {
            const tone = getTone(quest.status);
            const notes = normalizeQuestNotes(quest);
            const isClosed = quest.status === "completed" || quest.status === "complete";

            const isActive = activeQuest === quest.id;
            return (
              <section
                key={quest.id}
                ref={(el) => { questRefs.current[quest.id] = el; }}
                className={`grim-tome${isActive ? " is-bordered" : ""} p-0 overflow-hidden flex scroll-mt-6`}
              >
                {/* Left color rail */}
                <div
                  className={`w-1.5 shrink-0 ${tone.railClass}`}
                  style={{ boxShadow: tone.glow ? `0 0 12px ${tone.rail}` : "none" }}
                />

                <div className="flex-1 py-5.5 px-6.5">
                  {/* Title row */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className={`font-display text-4xl text-grim-gold m-0 leading-none ${isClosed ? "line-through opacity-70" : "no-underline opacity-100"}`}>
                        {quest.name}
                      </h3>
                      <div className="grim-mono text-sm tracking-wider-4 text-grim-ink-4 uppercase mt-1.5">
                        ⚑ {notes.length} {notes.length === 1 ? "note" : "notes"}
                      </div>
                    </div>
                    <span className={`grim-chip ${tone.chip} shrink-0`}>{tone.word}</span>
                  </div>

                  {/* Notes / Marginalia */}
                  {notes.length > 0 && (
                    <div className="mt-4.5">
                      <div className="grim-label mb-2">Marginalia</div>
                      <div className="grim-stack gap-2">
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className="py-2.5 px-3.5 bg-grim-bg-overlay/70 border border-grim-line"
                          >
                            {editingNoteId === note.id ? (
                              <>
                                <MarkdownEditor value={editingNoteContent} onChange={setEditingNoteContent} />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    className="grim-btn is-ghost py-1 px-2.5 text-sm"
                                    onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="grim-btn is-ember py-1 px-2.5 text-sm"
                                    onClick={() => handleSaveEditNote(quest.id, note.id)}
                                  >
                                    Save
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between items-start gap-3">
                                <div className="text-lg text-grim-ink leading-normal flex-1">
                                  {!isLegacyNote(note) && isDM && (
                                    <span className="grim-chip is-arcane text-xs py-0.25 px-1.5 mr-2 align-middle">DM</span>
                                  )}
                                  <div className="prose prose-sm dark:prose-invert max-w-none inline">
                                    <ReactMarkdown>{note.content}</ReactMarkdown>
                                  </div>
                                </div>
                                <div className="flex gap-2.5 shrink-0 pt-0.5 items-center">
                                  {!isLegacyNote(note) && (
                                    <>
                                      <span className="grim-mono text-xs text-grim-ink-4 tracking-wider-2">
                                        {formatNoteTimestamp(note)}
                                      </span>
                                      <AuthorDisplay uid={note.author} />
                                    </>
                                  )}
                                  {canEditNote(note) && (
                                    <>
                                      <a
                                        className="grim-link text-sm font-head tracking-widest uppercase cursor-pointer"
                                        onClick={() => handleStartEditNote(note)}
                                      >
                                        edit
                                      </a>
                                      <a
                                        className="text-sm font-head tracking-widest uppercase cursor-pointer text-grim-blood-2 no-underline border-b border-dotted border-grim-blood-2"
                                        onClick={() => handleDeleteNote(quest.id, note.id)}
                                      >
                                        delete
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GM Notes */}
                  {(() => {
                    const gmNotes = quest.gm_notes;
                    if (!isDM || !gmNotes || typeof gmNotes !== "string" || gmNotes.trim() === "" || gmNotes.trim().toLowerCase() === "null") return null;
                    return (
                      <div className="mt-4.5">
                        <div className="grim-label mb-2 text-grim-arcane">GM&apos;s Compendium</div>
                        <div
                          className="grim-flavor text-lg text-grim-ink-2 border-grim-arcane"
                          style={{ lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(gmNotes, true) }}
                        />
                      </div>
                    );
                  })()}

                  {/* Session back-references */}
                  {(() => {
                    const appearances = getRecapsForQuest(recapsData, quest.id);
                    if (appearances.length === 0) return null;
                    return (
                      <div className="mt-4.5">
                        <div className="grim-label mb-2">Appeared in Sessions</div>
                        <div className="grim-stack gap-1">
                          {appearances.map(r => (
                            <Link
                              key={r.id ?? r.date}
                              href={`/campaign/recaps/${r.id ?? r.date}`}
                              className="no-underline flex justify-between items-baseline gap-3 py-1.5 px-2.5 bg-grim-bg-overlay/50 border border-grim-line"
                            >
                              <span className="font-head text-lg text-grim-gold-2 tracking-wide">{r.title}</span>
                              <span className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 shrink-0">{r.date}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add Note */}
                  {userId && (
                    <div className="mt-3.5">
                      {editingNote === quest.id ? (
                        <div>
                          <MarkdownEditor
                            value={newNoteContent}
                            onChange={setNewNoteContent}
                            placeholder="Add a note to the ledger…"
                            label="New Note"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              className="grim-btn is-ghost py-1 px-2.5 text-sm"
                              onClick={() => { setEditingNote(null); setNewNoteContent(""); }}
                            >
                              Cancel
                            </button>
                            <button
                              className="grim-btn is-ember py-1 px-2.5 text-sm"
                              onClick={() => handleAddNote(quest.id)}
                              disabled={!newNoteContent.trim()}
                            >
                              Add Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <a
                          className="grim-link inline-block font-head text-base tracking-wider-3 uppercase cursor-pointer"
                          onClick={() => { setEditingNote(quest.id); setNewNoteContent(""); }}
                        >
                          + Add note
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
