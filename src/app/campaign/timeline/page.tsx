"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import MarkdownEditor from "@/components/MarkdownEditor";

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  category?: string;
  gm_notes?: string;
}

const CATEGORIES = [
  { id: "Battle",    color: "var(--grim-ember-2)",  dot: "oklch(0.72 0.165 48)" },
  { id: "Discovery", color: "var(--grim-moss)",     dot: "oklch(0.55 0.090 145)" },
  { id: "Political", color: "var(--grim-arcane)",   dot: "oklch(0.65 0.150 285)" },
  { id: "Death",     color: "oklch(0.55 0.04 30)",  dot: "oklch(0.45 0.05 30)" },
  { id: "Prophecy",  color: "var(--grim-gold)",     dot: "oklch(0.84 0.115 85)" },
  { id: "Magic",     color: "var(--grim-arcane)",   dot: "oklch(0.55 0.12 285)" },
];

function getCategoryColor(category?: string): string {
  if (!category) return "var(--grim-gold-2)";
  const found = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
  return found ? found.color : "var(--grim-ink-3)";
}

function getCategoryDot(category?: string): string {
  if (!category) return "oklch(0.68 0.115 82)";
  const found = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
  return found ? found.dot : "var(--grim-ink-3)";
}

const BLANK_EVENT: Omit<TimelineEvent, "id"> = {
  title: "",
  date: "",
  description: "",
  category: "",
  gm_notes: "",
};

export default function TimelinePage() {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const canEdit = isAdmin || isDM;

  const { data: events = [], isPending: loading, error: queryError } = useQuery<TimelineEvent[]>({
    queryKey: ['/api/data/timeline'],
    queryFn: async () => {
      const res = await authFetch("/api/data/timeline");
      if (!res.ok) throw new Error("Failed to load timeline");
      return res.json();
    },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<TimelineEvent, "id">>({ ...BLANK_EVENT });
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [editError, setEditError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allCategories = Array.from(
    new Set(events.map(e => e.category).filter(Boolean) as string[])
  ).sort();

  const filtered = events.filter(e => {
    const matchSearch =
      !searchTerm.trim() ||
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.date ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat =
      categoryFilter === "all" ||
      (e.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCat;
  });

  const handleCreate = async () => {
    if (!newEvent.title.trim()) { setCreateError("An event must have a title."); return; }
    if (!newEvent.date.trim()) { setCreateError("An event must have a date."); return; }
    setCreateError("");
    try {
      const res = await authFetch("/api/data/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvent, category: newEvent.category || null, gm_notes: newEvent.gm_notes || null }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      await res.json();
      await queryClient.invalidateQueries({ queryKey: ['/api/data/timeline'] });
      setIsCreating(false);
      setNewEvent({ ...BLANK_EVENT });
    } catch (e) {
      setCreateError(toErrorMessage(e));
    }
  };

  const handleStartEdit = (event: TimelineEvent) => {
    setEditingId(event.id);
    setEditingEvent({ ...event });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    if (!editingEvent.title.trim()) { setEditError("An event must have a title."); return; }
    if (!editingEvent.date.trim()) { setEditError("An event must have a date."); return; }
    setEditError("");
    try {
      const res = await authFetch("/api/data/timeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingEvent, category: editingEvent.category || null, gm_notes: editingEvent.gm_notes || null }),
      });
      if (!res.ok) throw new Error("Failed to save event");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/timeline'] });
      setEditingId(null);
      setEditingEvent(null);
    } catch (e) {
      setEditError(toErrorMessage(e));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/data/timeline?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/timeline'] });
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = "w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.25 px-3.5 outline-none";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Unrolling the annals&hellip;
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full mx-auto my-0" style={{ maxWidth: 900 }}>
      {(error || queryError) && <ErrorBlock error={error ?? queryError?.message ?? ''} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div className="flex justify-between items-end mb-5.5">
        <div>
          <div className="grim-page-eyebrow">The Remembered Road</div>
          <h1 className="grim-page-title">The Great Annals</h1>
          <p className="grim-page-sub">Major events of the realm, set down for those who would understand the age.</p>
        </div>
        {canEdit && !isCreating && (
          <button className="grim-btn is-ember" onClick={() => setIsCreating(true)}>
            + Inscribe Event
          </button>
        )}
      </div>

      {/* Search + category filter */}
      <section className="flex gap-3 flex-wrap mb-5.5">
        <div className="relative flex-1 min-w-60">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search the annals…"
            className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
          />
          <span
            className="absolute left-3.5 text-grim-gold-2 text-2xl pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >✦</span>
        </div>
        {allCategories.length > 0 && (
          <div className="flex gap-1 flex-wrap items-center">
            <button
              className={`grim-btn ${categoryFilter === "all" ? "is-ember" : "is-ghost"} py-1.5 px-3`}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`grim-btn ${categoryFilter === cat ? "is-ember" : "is-ghost"} py-1.5 px-3`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase mb-7">
        {filtered.length} of {events.length} events
      </div>

      {/* Inline creation form */}
      {isCreating && (
        <div className="grim-tome mb-8 py-5.5 px-6.5">
          <div className="grim-label mb-3.5">New Event</div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="grim-label mb-1.5">Title</div>
                <input autoFocus value={newEvent.title} onChange={e => { setNewEvent(p => ({ ...p, title: e.target.value })); setCreateError(""); }} placeholder="Event title…" className={inputClass} />
              </div>
              <div>
                <div className="grim-label mb-1.5">In-World Date</div>
                <input value={newEvent.date} onChange={e => { setNewEvent(p => ({ ...p, date: e.target.value })); setCreateError(""); }} placeholder="e.g. Year 847, Readying 14" className={inputClass} />
              </div>
            </div>
            <div>
              <div className="grim-label mb-1.5">Category</div>
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`grim-btn ${newEvent.category === c.id ? "is-ember" : "is-ghost"} py-1 px-2.5 text-base`}
                    onClick={() => setNewEvent(p => ({ ...p, category: p.category === c.id ? "" : c.id }))}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
              <input value={newEvent.category ?? ""} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))} placeholder="Or type a custom category…" className={inputClass} />
            </div>
            <div>
              <MarkdownEditor value={newEvent.description} onChange={v => setNewEvent(p => ({ ...p, description: v }))} label="Description" rows={4} />
            </div>
            {isDM && (
              <div>
                <MarkdownEditor value={newEvent.gm_notes ?? ""} onChange={v => setNewEvent(p => ({ ...p, gm_notes: v }))} label="GM Notes (DM only)" rows={3} />
              </div>
            )}
            {createError && (
              <div className="grim-mono text-sm text-grim-blood-2 tracking-wider-2">{createError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button className="grim-btn is-ghost" onClick={() => { setIsCreating(false); setNewEvent({ ...BLANK_EVENT }); setCreateError(""); }}>Cancel</button>
              <button className="grim-btn is-ember" onClick={handleCreate} disabled={!newEvent.title.trim() || !newEvent.date.trim()}>Inscribe</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-15 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3 mb-2">~ no events found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase">
            Adjust your search or filters
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical rail */}
          <div
            className="absolute left-5 top-0 bottom-0 w-0.5"
            style={{ background: "linear-gradient(to bottom, var(--grim-gold-2), oklch(0.68 0.115 82 / 0.2))" }}
          />

          <div className="flex flex-col gap-0">
            {filtered.map((event, idx) => {
              const dotColor = getCategoryDot(event.category);
              const catColor = getCategoryColor(event.category);
              const isEditing = editingId === event.id;
              const isLast = idx === filtered.length - 1;

              return (
                <div key={event.id} className={`flex gap-5 ${isLast ? "pb-0" : "pb-8"}`}>
                  {/* Timeline dot */}
                  <div className="relative shrink-0 w-10.5">
                    <div
                      className="absolute left-2.75 top-4 w-5 h-5 rounded-full border-2 border-grim-bg-2"
                      style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}80`, zIndex: 1 }}
                    />
                  </div>

                  {/* Event card */}
                  <div className="flex-1 min-w-0">
                    {isEditing && editingEvent ? (
                      <div className="grim-tome py-5.5 px-6.5">
                        <div className="grim-label mb-3.5">Edit Event</div>
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="grim-label mb-1.5">Title</div>
                              <input autoFocus value={editingEvent.title} onChange={e => setEditingEvent(p => p ? { ...p, title: e.target.value } : p)} className={inputClass} />
                            </div>
                            <div>
                              <div className="grim-label mb-1.5">In-World Date</div>
                              <input value={editingEvent.date} onChange={e => setEditingEvent(p => p ? { ...p, date: e.target.value } : p)} className={inputClass} />
                            </div>
                          </div>
                          <div>
                            <div className="grim-label mb-1.5">Category</div>
                            <div className="flex gap-1.5 flex-wrap mb-1.5">
                              {CATEGORIES.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`grim-btn ${editingEvent.category === c.id ? "is-ember" : "is-ghost"} py-1 px-2.5 text-base`}
                                  onClick={() => setEditingEvent(p => p ? { ...p, category: p.category === c.id ? "" : c.id } : p)}
                                >
                                  {c.id}
                                </button>
                              ))}
                            </div>
                            <input value={editingEvent.category ?? ""} onChange={e => setEditingEvent(p => p ? { ...p, category: e.target.value } : p)} placeholder="Or type a custom category…" className={inputClass} />
                          </div>
                          <div>
                            <MarkdownEditor value={editingEvent.description} onChange={v => setEditingEvent(p => p ? { ...p, description: v } : p)} label="Description" rows={4} />
                          </div>
                          {isDM && (
                            <div>
                              <MarkdownEditor value={editingEvent.gm_notes ?? ""} onChange={v => setEditingEvent(p => p ? { ...p, gm_notes: v } : p)} label="GM Notes (DM only)" rows={3} />
                            </div>
                          )}
                          {editError && (
                            <div className="grim-mono text-sm text-grim-blood-2 tracking-wider-2">{editError}</div>
                          )}
                          <div className="flex justify-end gap-2">
                            <button className="grim-btn is-ghost" onClick={() => { setEditingId(null); setEditingEvent(null); setEditError(""); }}>Cancel</button>
                            <button className="grim-btn is-ember" onClick={handleSaveEdit} disabled={!editingEvent.title.trim() || !editingEvent.date.trim()}>Save</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grim-tome py-4.5 px-5.5">
                        {/* Header row */}
                        <div className="flex justify-between items-start gap-3 mb-2.5">
                          <div className="min-w-0">
                            <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-4 uppercase mb-1">
                              {event.date}
                            </div>
                            <h3 className="font-display text-4xl text-grim-gold m-0" style={{ lineHeight: 1.1 }}>
                              {event.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {event.category && (
                              <span
                                className="font-mono text-sm tracking-wider-3 uppercase py-0.5 px-2"
                                style={{ color: catColor, border: `1px solid ${catColor}80` }}
                              >
                                {event.category}
                              </span>
                            )}
                            {canEdit && (
                              <div className="flex gap-1.5">
                                <button className="grim-btn is-ghost py-1 px-2.5 text-sm" onClick={() => handleStartEdit(event)}>
                                  Edit
                                </button>
                                <button
                                  className="grim-btn is-blood py-1 px-2.5 text-sm"
                                  disabled={deletingId === event.id}
                                  onClick={() => handleDelete(event.id)}
                                >
                                  {deletingId === event.id ? "…" : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-lg text-grim-ink-2" style={{ lineHeight: 1.65 }}>
                            <ReactMarkdown>{event.description}</ReactMarkdown>
                          </div>
                        )}

                        {/* GM Notes */}
                        {isDM && event.gm_notes && event.gm_notes.trim() && event.gm_notes.trim().toLowerCase() !== "null" && (
                          <div className="mt-3.5 pt-3 border-t border-dashed border-grim-line">
                            <div className="grim-label mb-1.5 text-grim-arcane">GM&apos;s Compendium</div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-lg text-grim-ink-3" style={{ lineHeight: 1.55 }}>
                              <ReactMarkdown>{event.gm_notes}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
