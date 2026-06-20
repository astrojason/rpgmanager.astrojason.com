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

  const inputStyle = {
    width: "100%",
    background: "var(--grim-bg-3)",
    border: "1px solid var(--grim-line-2)",
    color: "var(--grim-ink)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    padding: "9px 14px",
    outline: "none",
  } as const;

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Unrolling the annals&hellip;
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%", maxWidth: 900, margin: "0 auto" }}>
      {(error || queryError) && <ErrorBlock error={error ?? queryError?.message ?? ''} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
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
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search the annals…"
            style={{
              width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)",
              color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16,
              padding: "12px 16px 12px 42px", outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18, pointerEvents: "none" }}>✦</span>
        </div>
        {allCategories.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className={`grim-btn ${categoryFilter === "all" ? "is-ember" : "is-ghost"}`}
              style={{ padding: "6px 12px" }}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`grim-btn ${categoryFilter === cat ? "is-ember" : "is-ghost"}`}
                style={{ padding: "6px 12px" }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginBottom: 28 }}>
        {filtered.length} of {events.length} events
      </div>

      {/* Inline creation form */}
      {isCreating && (
        <div className="grim-tome" style={{ marginBottom: 32, padding: "22px 26px" }}>
          <div className="grim-label" style={{ marginBottom: 14 }}>New Event</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="grim-label" style={{ marginBottom: 6 }}>Title</div>
                <input autoFocus value={newEvent.title} onChange={e => { setNewEvent(p => ({ ...p, title: e.target.value })); setCreateError(""); }} placeholder="Event title…" style={inputStyle} />
              </div>
              <div>
                <div className="grim-label" style={{ marginBottom: 6 }}>In-World Date</div>
                <input value={newEvent.date} onChange={e => { setNewEvent(p => ({ ...p, date: e.target.value })); setCreateError(""); }} placeholder="e.g. Year 847, Readying 14" style={inputStyle} />
              </div>
            </div>
            <div>
              <div className="grim-label" style={{ marginBottom: 6 }}>Category</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`grim-btn ${newEvent.category === c.id ? "is-ember" : "is-ghost"}`}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setNewEvent(p => ({ ...p, category: p.category === c.id ? "" : c.id }))}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
              <input value={newEvent.category ?? ""} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))} placeholder="Or type a custom category…" style={inputStyle} />
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
              <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-blood-2)", letterSpacing: ".12em" }}>{createError}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="grim-btn is-ghost" onClick={() => { setIsCreating(false); setNewEvent({ ...BLANK_EVENT }); setCreateError(""); }}>Cancel</button>
              <button className="grim-btn is-ember" onClick={handleCreate} disabled={!newEvent.title.trim() || !newEvent.date.trim()}>Inscribe</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ no events found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>
            Adjust your search or filters
          </div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Vertical rail */}
          <div style={{
            position: "absolute",
            left: 20,
            top: 0,
            bottom: 0,
            width: 2,
            background: "linear-gradient(to bottom, var(--grim-gold-2), oklch(0.68 0.115 82 / 0.2))",
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtered.map((event, idx) => {
              const dotColor = getCategoryDot(event.category);
              const catColor = getCategoryColor(event.category);
              const isEditing = editingId === event.id;
              const isLast = idx === filtered.length - 1;

              return (
                <div key={event.id} style={{ display: "flex", gap: 20, paddingBottom: isLast ? 0 : 32 }}>
                  {/* Timeline dot */}
                  <div style={{ position: "relative", flexShrink: 0, width: 42 }}>
                    <div style={{
                      position: "absolute",
                      left: 11,
                      top: 16,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: dotColor,
                      border: "2px solid var(--grim-bg-2)",
                      boxShadow: `0 0 10px ${dotColor}80`,
                      zIndex: 1,
                    }} />
                  </div>

                  {/* Event card */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing && editingEvent ? (
                      <div className="grim-tome" style={{ padding: "22px 26px" }}>
                        <div className="grim-label" style={{ marginBottom: 14 }}>Edit Event</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <div className="grim-label" style={{ marginBottom: 6 }}>Title</div>
                              <input autoFocus value={editingEvent.title} onChange={e => setEditingEvent(p => p ? { ...p, title: e.target.value } : p)} style={inputStyle} />
                            </div>
                            <div>
                              <div className="grim-label" style={{ marginBottom: 6 }}>In-World Date</div>
                              <input value={editingEvent.date} onChange={e => setEditingEvent(p => p ? { ...p, date: e.target.value } : p)} style={inputStyle} />
                            </div>
                          </div>
                          <div>
                            <div className="grim-label" style={{ marginBottom: 6 }}>Category</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              {CATEGORIES.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`grim-btn ${editingEvent.category === c.id ? "is-ember" : "is-ghost"}`}
                                  style={{ padding: "4px 10px", fontSize: 12 }}
                                  onClick={() => setEditingEvent(p => p ? { ...p, category: p.category === c.id ? "" : c.id } : p)}
                                >
                                  {c.id}
                                </button>
                              ))}
                            </div>
                            <input value={editingEvent.category ?? ""} onChange={e => setEditingEvent(p => p ? { ...p, category: e.target.value } : p)} placeholder="Or type a custom category…" style={inputStyle} />
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
                            <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-blood-2)", letterSpacing: ".12em" }}>{editError}</div>
                          )}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button className="grim-btn is-ghost" onClick={() => { setEditingId(null); setEditingEvent(null); setEditError(""); }}>Cancel</button>
                            <button className="grim-btn is-ember" onClick={handleSaveEdit} disabled={!editingEvent.title.trim() || !editingEvent.date.trim()}>Save</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grim-tome" style={{ padding: "18px 22px" }}>
                        {/* Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginBottom: 4 }}>
                              {event.date}
                            </div>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-gold)", margin: 0, lineHeight: 1.1 }}>
                              {event.title}
                            </h3>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            {event.category && (
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em",
                                textTransform: "uppercase", color: catColor,
                                border: `1px solid ${catColor}80`, padding: "2px 8px",
                              }}>
                                {event.category}
                              </span>
                            )}
                            {canEdit && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="grim-btn is-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleStartEdit(event)}>
                                  Edit
                                </button>
                                <button
                                  className="grim-btn is-blood"
                                  style={{ padding: "4px 10px", fontSize: 11 }}
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
                          <div className="prose prose-sm dark:prose-invert max-w-none" style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.65 }}>
                            <ReactMarkdown>{event.description}</ReactMarkdown>
                          </div>
                        )}

                        {/* GM Notes */}
                        {isDM && event.gm_notes && event.gm_notes.trim() && event.gm_notes.trim().toLowerCase() !== "null" && (
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--grim-line)" }}>
                            <div className="grim-label" style={{ marginBottom: 6, color: "var(--grim-arcane)" }}>GM&apos;s Compendium</div>
                            <div className="prose prose-sm dark:prose-invert max-w-none" style={{ fontSize: 13, color: "var(--grim-ink-3)", lineHeight: 1.55 }}>
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
