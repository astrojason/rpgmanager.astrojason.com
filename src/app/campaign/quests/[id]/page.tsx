"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const queryClient = useQueryClient();

  const { data: allQuests = [], isPending: loading } = useQuery<Quest[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => { const r = await authFetch("/api/data/quests"); if (!r.ok) throw new Error("Failed to load quests"); return r.json(); },
  });
  const { data: recapsData = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });

  const quest = useMemo(() => allQuests.find(q => String(q.id) === id) ?? null, [allQuests, id]);
  const notFound = !loading && !quest;

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
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
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
      await queryClient.invalidateQueries({ queryKey: ['/api/data/quests'] });
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

  if (notFound || !quest) {
    return (
      <div className="py-9 px-14">
        <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/quests")}>
          ‹ The Ledger of Errands
        </button>
        <div className="text-center py-15 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3 mb-2">~ errand not found ~</div>
        </div>
      </div>
    );
  }

  const tone = getTone(quest.status);
  const notes = normalizeQuestNotes(quest);
  const isClosed = quest.status === "completed" || quest.status === "complete";
  const appearances = getRecapsForQuest(recapsData, quest.id);

  return (
    <div className="py-9 px-14 pb-20 overflow-y-auto h-full">
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
      {noteError && <ErrorBlock error={noteError} onDismiss={() => setNoteError(null)} />}

      <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/quests")}>
        ‹ The Ledger of Errands
      </button>

      <section className="grim-tome is-bordered p-0 overflow-hidden flex">
        <div
          className="w-1.5 shrink-0"
          style={{
            background: tone.rail,
            boxShadow: tone.glow ? `0 0 12px ${tone.rail}` : "none",
          }}
        />

        <div className="flex-1 py-7 px-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className={`font-display text-5xl text-grim-gold m-0 leading-none ${isClosed ? "line-through" : "no-underline"} ${isClosed ? "opacity-70" : "opacity-100"}`}>
                {quest.name}
              </h1>
              <div className="grim-mono text-sm tracking-wider-3 text-grim-ink-4 uppercase mt-1.5">
                ⚑ {notes.length} {notes.length === 1 ? "note" : "notes"}
              </div>
            </div>
            <span className={`grim-chip ${tone.chip} shrink-0`}>{tone.word}</span>
          </div>

          {/* Notes / Marginalia */}
          {notes.length > 0 && (
            <div className="mt-5.5">
              <div className="grim-label mb-2">Marginalia</div>
              <div className="grim-stack gap-2">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="py-2.5 px-3.5 bg-grim-bg-overlay/70 border border-grim-line"
                  >
                    {editingNoteId === note.id ? (
                      <>
                        <MarkdownEditor value={editingNoteContent} onChange={setEditingNoteContent} />
                        <div className="flex justify-end gap-2 mt-2">
                          <button className="grim-btn is-ghost py-1 px-2.5 text-sm"
                            onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}>
                            Cancel
                          </button>
                          <button className="grim-btn is-ember py-1 px-2.5 text-sm"
                            onClick={() => handleSaveEditNote(note.id)}>
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-start gap-3">
                        <div className="text-lg text-grim-ink leading-normal flex-1">
                          {!isLegacyNote(note) && isDM && (
                            <span className="grim-chip is-arcane text-xs py-0 px-1.5 mr-2 align-middle">DM</span>
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
                              <a className="grim-link text-sm font-head tracking-widest uppercase cursor-pointer"
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                edit
                              </a>
                              <a className="text-sm font-head tracking-widest uppercase cursor-pointer text-grim-blood-2 no-underline border-b border-dotted border-grim-blood-2"
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
              <div className="mt-5.5">
                <div className="grim-label mb-2 text-grim-arcane">GM&apos;s Compendium</div>
                <div className="grim-flavor text-lg text-grim-ink-2 border-grim-arcane"
                  style={{ lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(gmNotes, true) }} />
              </div>
            );
          })()}

          {/* Session back-references */}
          {appearances.length > 0 && (
            <div className="mt-5.5">
              <div className="grim-label mb-2">Appeared in Sessions</div>
              <div className="grim-stack gap-1">
                {appearances.map(r => (
                  <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`}
                    className="no-underline flex justify-between items-baseline gap-3 py-1.5 px-2.5 bg-grim-bg-overlay/50 border border-grim-line">
                    <span className="font-head text-lg text-grim-gold-2 tracking-wide">{r.title}</span>
                    <span className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 shrink-0">{r.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Add Note */}
          {userId && (
            <div className="mt-4.5">
              {editingNote ? (
                <div>
                  <MarkdownEditor value={newNoteContent} onChange={setNewNoteContent} placeholder="Add a note to the ledger…" label="New Note" />
                  <div className="flex justify-end gap-2 mt-2">
                    <button className="grim-btn is-ghost py-1 px-2.5 text-sm"
                      onClick={() => { setEditingNote(false); setNewNoteContent(""); }}>
                      Cancel
                    </button>
                    <button className="grim-btn is-ember py-1 px-2.5 text-sm"
                      onClick={handleAddNote} disabled={!newNoteContent.trim()}>
                      Add Note
                    </button>
                  </div>
                </div>
              ) : (
                <a className="grim-link inline-block font-head text-base tracking-wider-3 uppercase cursor-pointer"
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
