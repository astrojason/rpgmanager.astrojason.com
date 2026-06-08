"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import ReactMarkdown from "react-markdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import AuthorDisplay from "@/components/AuthorDisplay";
import { Quest, SessionRecap, UserNote } from "@/types/interfaces";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from "@/utils/questUtils";
import { getRecapsForQuest } from "@/utils/entityTags";
import { authFetch } from "@/utils/authFetch";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import Link from "next/link";

const STATUS_TONE: Record<string, { chip: string; word: string; rail: string; glow: boolean }> = {
  active:    { chip: "is-ember",  word: "active",   rail: "var(--grim-ember)",  glow: true },
  rumored:   { chip: "is-arcane", word: "rumored",  rail: "var(--grim-arcane)", glow: true },
  completed: { chip: "",          word: "closed",   rail: "var(--grim-line-2)", glow: false },
  complete:  { chip: "",          word: "closed",   rail: "var(--grim-line-2)", glow: false },
};

function getTone(status: string) {
  return STATUS_TONE[status] ?? { chip: "is-unknown", word: status, rail: "var(--grim-bone)", glow: false };
}

export default function QuestDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [quest, setQuest] = useState<Quest | null>(null);
  const [recapsData, setRecapsData] = useState<SessionRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  const loadAll = async () => {
    try {
      const [questsRes, recapsRes] = await Promise.all([
        authFetch("/api/data/quests"),
        authFetch("/api/data/session-recaps"),
      ]);
      const allQuests: Quest[] = questsRes.ok ? await questsRes.json() : [];
      const found = allQuests.find(q => String(q.id) === id);
      if (!found) { setNotFound(true); return; }
      setQuest(found);
      if (recapsRes.ok) setRecapsData(await recapsRes.json());
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const canEditNote = (note: UserNote) => !!userId && (isAdmin || userId === note.author);

  const handleAddNote = async () => {
    if (!quest || !newNoteContent.trim() || !userId) return;
    try {
      const newUserNote: UserNote = {
        id: `note-${Date.now()}`,
        content: newNoteContent.trim(),
        timestamp: new Date().toISOString(),
        author: userId,
      };
      const updatedNotes = [...normalizeQuestNotes(quest), newUserNote] as UserNote[];
      const updatedQuest = { ...quest, notes: updatedNotes };
      const res = await authFetch("/api/data/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quest.id, notes: updatedNotes }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      setQuest(updatedQuest);
      setNewNoteContent("");
      setEditingNote(false);
    } catch (e) {
      setNoteError(toErrorMessage(e));
    }
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (!quest || !userId) return;
    try {
      const notes = normalizeQuestNotes(quest).map(n =>
        n.id === noteId ? { ...n, content: editingNoteContent, timestamp: new Date().toISOString(), author: userId } : n
      );
      const updatedQuest = { ...quest, notes };
      const res = await authFetch("/api/data/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quest.id, notes }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      setQuest(updatedQuest);
      setEditingNoteId(null);
      setEditingNoteContent("");
    } catch (e) {
      setNoteError(toErrorMessage(e));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!quest) return;
    try {
      const notes = normalizeQuestNotes(quest).filter(n => n.id !== noteId);
      const updatedQuest = { ...quest, notes };
      const res = await authFetch("/api/data/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quest.id, notes }),
      });
      if (!res.ok) throw new Error("Failed to delete note");
      setQuest(updatedQuest);
    } catch (e) {
      setNoteError(toErrorMessage(e));
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

  if (notFound || !quest) {
    return (
      <div style={{ padding: "36px 56px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/quests")} style={{ marginBottom: 24 }}>
          ‹ The Ledger of Errands
        </button>
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ errand not found ~</div>
        </div>
      </div>
    );
  }

  const tone = getTone(quest.status);
  const notes = normalizeQuestNotes(quest);
  const isClosed = quest.status === "completed" || quest.status === "complete";
  const appearances = getRecapsForQuest(recapsData, quest.id);

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
      {noteError && <ErrorBlock error={noteError} onDismiss={() => setNoteError(null)} />}

      <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/quests")} style={{ marginBottom: 24 }}>
        ‹ The Ledger of Errands
      </button>

      <section className="grim-tome is-bordered" style={{ padding: 0, overflow: "hidden", display: "flex" }}>
        <div style={{
          width: 6, flexShrink: 0,
          background: tone.rail,
          boxShadow: tone.glow ? `0 0 12px ${tone.rail}` : "none",
        }} />

        <div style={{ flex: 1, padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontSize: 40,
                color: "var(--grim-gold)", margin: 0, lineHeight: 1,
                textDecoration: isClosed ? "line-through" : "none",
                opacity: isClosed ? 0.7 : 1,
              }}>
                {quest.name}
              </h1>
              <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 6 }}>
                ⚑ {notes.length} {notes.length === 1 ? "note" : "notes"}
              </div>
            </div>
            <span className={`grim-chip ${tone.chip}`} style={{ flexShrink: 0 }}>{tone.word}</span>
          </div>

          {/* Notes / Marginalia */}
          {notes.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="grim-label" style={{ marginBottom: 8 }}>Marginalia</div>
              <div className="grim-stack" style={{ gap: 8 }}>
                {notes.map(note => (
                  <div
                    key={note.id}
                    style={{ padding: "10px 14px", background: "oklch(0.14 0.025 290 / 0.7)", border: "1px solid var(--grim-line)" }}
                  >
                    {editingNoteId === note.id ? (
                      <>
                        <MarkdownEditor value={editingNoteContent} onChange={setEditingNoteContent} />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                          <button className="grim-btn is-ghost" style={{ padding: "4px 10px", fontSize: 11 }}
                            onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}>
                            Cancel
                          </button>
                          <button className="grim-btn is-ember" style={{ padding: "4px 10px", fontSize: 11 }}
                            onClick={() => handleSaveEditNote(note.id)}>
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
                              <a className="grim-link" style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer" }}
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                edit
                              </a>
                              <a style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer", color: "var(--grim-blood-2)", textDecoration: "none", borderBottom: "1px dotted var(--grim-blood-2)" }}
                                onClick={() => handleDeleteNote(note.id)}>
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
              <div style={{ marginTop: 22 }}>
                <div className="grim-label" style={{ marginBottom: 8, color: "var(--grim-arcane)" }}>GM&apos;s Compendium</div>
                <div className="grim-flavor" style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6, borderColor: "var(--grim-arcane)" }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(gmNotes, true) }} />
              </div>
            );
          })()}

          {/* Session back-references */}
          {appearances.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="grim-label" style={{ marginBottom: 8 }}>Appeared in Sessions</div>
              <div className="grim-stack" style={{ gap: 4 }}>
                {appearances.map(r => (
                  <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`}
                    style={{ textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "6px 10px", background: "oklch(0.14 0.025 290 / 0.5)", border: "1px solid var(--grim-line)" }}>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-gold-2)", letterSpacing: ".02em" }}>{r.title}</span>
                    <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", flexShrink: 0 }}>{r.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Add Note */}
          {userId && (
            <div style={{ marginTop: 18 }}>
              {editingNote ? (
                <div>
                  <MarkdownEditor value={newNoteContent} onChange={setNewNoteContent} placeholder="Add a note to the ledger…" label="New Note" />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                    <button className="grim-btn is-ghost" style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => { setEditingNote(false); setNewNoteContent(""); }}>
                      Cancel
                    </button>
                    <button className="grim-btn is-ember" style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={handleAddNote} disabled={!newNoteContent.trim()}>
                      Add Note
                    </button>
                  </div>
                </div>
              ) : (
                <a className="grim-link" style={{ display: "inline-block", fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}
                  onClick={() => { setEditingNote(true); setNewNoteContent(""); }}>
                  + Add note
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
