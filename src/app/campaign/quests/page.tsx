"use client";

import { useState, useEffect } from "react";
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from '@/components/MarkdownEditor';
import AuthorDisplay from '@/components/AuthorDisplay';
import { Quest, UserNote } from "@/types/interfaces";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from '@/utils/questUtils';
import { authFetch } from "@/utils/authFetch";

const STATUS_TONE: Record<string, { chip: string; word: string; rail: string; glow: boolean }> = {
  active:    { chip: "is-ember",  word: "active",   rail: "var(--grim-ember)",  glow: true },
  rumored:   { chip: "is-arcane", word: "rumored",  rail: "var(--grim-arcane)", glow: true },
  completed: { chip: "",          word: "closed",   rail: "var(--grim-line-2)", glow: false },
  complete:  { chip: "",          word: "closed",   rail: "var(--grim-line-2)", glow: false },
};

function getTone(status: string) {
  return STATUS_TONE[status] ?? { chip: "is-unknown", word: status, rail: "var(--grim-bone)", glow: false };
}

const FILTERS = [
  { id: "all",       label: "All Errands" },
  { id: "active",    label: "Active" },
  { id: "completed", label: "Closed" },
];

export default function QuestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [questsData, setQuestsData] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useEffectiveUserId();
  const [activeFilter, setActiveFilter] = useState("active");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  useEffect(() => {
    const loadQuests = async () => {
      try {
        const response = await authFetch('/api/data/quests');
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
      setQuestsData(questsData.map(q => q.id === questId ? updatedQuest : q));
      setNewNoteContent("");
      setEditingNote(null);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
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
      setQuestsData(questsData.map(q => q.id === questId ? updatedQuest : q));
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
      const response = await authFetch('/api/data/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuest),
      });
      if (!response.ok) throw new Error('Failed to delete note');
      setQuestsData(questsData.map(q => q.id === questId ? updatedQuest : q));
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Failed to delete note');
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the ledger&hellip;
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="grim-page-eyebrow">The Campaign Record</div>
          <h1 className="grim-page-title">The Ledger of Errands</h1>
          <p className="grim-page-sub">Every thread the party has taken up — those in motion and those laid to rest.</p>
        </div>
      </div>

      {/* Search + filter bar */}
      <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek an errand by name or note…"
            style={{
              width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)",
              color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16,
              padding: "12px 16px 12px 42px", outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18, pointerEvents: "none" }}>✦</span>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)" }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearchTerm(""); }}
              className={`grim-btn ${activeFilter === f.id ? "is-ember" : "is-ghost"}`}
              style={{
                padding: "6px 12px",
                border: "1px solid " + (activeFilter === f.id ? "var(--grim-ember)" : "transparent"),
                background: activeFilter === f.id ? undefined : "transparent",
              }}
            >
              {f.label}
              <span className="grim-mono" style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>{countFor(f.id)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginBottom: 14 }}>
        Showing {filteredQuests.length} of {questsData.length} errands
      </div>

      {/* Quest cards */}
      <div className="grim-stack" style={{ gap: 18 }}>
        {filteredQuests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ no errands found ~</div>
            <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>
              Adjust your filters or search
            </div>
          </div>
        ) : (
          filteredQuests.map((quest) => {
            const tone = getTone(quest.status);
            const notes = normalizeQuestNotes(quest);
            const isClosed = quest.status === "completed" || quest.status === "complete";

            return (
              <section
                key={quest.id}
                className="grim-tome"
                style={{ padding: 0, overflow: "hidden", display: "flex" }}
              >
                {/* Left color rail */}
                <div style={{
                  width: 6, flexShrink: 0,
                  background: tone.rail,
                  boxShadow: tone.glow ? `0 0 12px ${tone.rail}` : "none",
                }} />

                <div style={{ flex: 1, padding: "22px 26px" }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div>
                      <h3 style={{
                        fontFamily: "var(--font-display)", fontSize: 30,
                        color: "var(--grim-gold)", margin: 0, lineHeight: 1,
                        textDecoration: isClosed ? "line-through" : "none",
                        opacity: isClosed ? 0.7 : 1,
                      }}>
                        {quest.name}
                      </h3>
                      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 6 }}>
                        ⚑ {notes.length} {notes.length === 1 ? "note" : "notes"}
                      </div>
                    </div>
                    <span className={`grim-chip ${tone.chip}`} style={{ flexShrink: 0 }}>{tone.word}</span>
                  </div>

                  {/* Notes / Marginalia */}
                  {notes.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Marginalia</div>
                      <div className="grim-stack" style={{ gap: 8 }}>
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            style={{
                              padding: "10px 14px",
                              background: "oklch(0.14 0.025 290 / 0.7)",
                              border: "1px solid var(--grim-line)",
                            }}
                          >
                            {editingNoteId === note.id ? (
                              <>
                                <MarkdownEditor value={editingNoteContent} onChange={setEditingNoteContent} />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                                  <button
                                    className="grim-btn is-ghost"
                                    style={{ padding: "4px 10px", fontSize: 11 }}
                                    onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="grim-btn is-ember"
                                    style={{ padding: "4px 10px", fontSize: 11 }}
                                    onClick={() => handleSaveEditNote(quest.id, note.id)}
                                  >
                                    Save
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                <div style={{ fontSize: 14, color: "var(--grim-ink)", lineHeight: 1.5, flex: 1 }}>
                                  {!isLegacyNote(note) && isDM && (
                                    <span className="grim-chip is-arcane" style={{ fontSize: 9, padding: "1px 6px", marginRight: 8, verticalAlign: "middle" }}>DM</span>
                                  )}
                                  <div className="prose prose-sm dark:prose-invert max-w-none" style={{ display: "inline" }}>
                                    <ReactMarkdown>{note.content}</ReactMarkdown>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 10, flexShrink: 0, paddingTop: 2, alignItems: "center" }}>
                                  {!isLegacyNote(note) && (
                                    <>
                                      <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em" }}>
                                        {formatNoteTimestamp(note)}
                                      </span>
                                      <AuthorDisplay uid={note.author} useImpersonation={true} />
                                    </>
                                  )}
                                  {canEditNote(note) && (
                                    <>
                                      <a
                                        className="grim-link"
                                        style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer" }}
                                        onClick={() => handleStartEditNote(note)}
                                      >
                                        edit
                                      </a>
                                      <a
                                        style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer", color: "var(--grim-blood-2)", textDecoration: "none", borderBottom: "1px dotted var(--grim-blood-2)" }}
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
                      <div style={{ marginTop: 18 }}>
                        <div className="grim-label" style={{ marginBottom: 8, color: "var(--grim-arcane)" }}>GM&apos;s Compendium</div>
                        <div
                          className="grim-flavor"
                          style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6, borderColor: "var(--grim-arcane)" }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(gmNotes, true) }}
                        />
                      </div>
                    );
                  })()}

                  {/* Add Note */}
                  {userId && (
                    <div style={{ marginTop: 14 }}>
                      {editingNote === quest.id ? (
                        <div>
                          <MarkdownEditor
                            value={newNoteContent}
                            onChange={setNewNoteContent}
                            placeholder="Add a note to the ledger…"
                            label="New Note"
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                            <button
                              className="grim-btn is-ghost"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              onClick={() => { setEditingNote(null); setNewNoteContent(""); }}
                            >
                              Cancel
                            </button>
                            <button
                              className="grim-btn is-ember"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              onClick={() => handleAddNote(quest.id)}
                              disabled={!newNoteContent.trim()}
                            >
                              Add Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <a
                          className="grim-link"
                          style={{ display: "inline-block", fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}
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
