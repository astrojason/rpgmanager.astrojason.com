"use client";

import { useState, useEffect } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { authFetch } from "@/utils/authFetch";

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  category?: string;
  gm_notes?: string;
}

const inputStyle: React.CSSProperties = {
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  padding: "9px 14px",
  outline: "none",
  width: "100%",
};

export default function TimelineManagementPage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<TimelineEvent>>({});

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/data/timeline');
      if (!response.ok) throw new Error('Failed to load Timeline');
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Timeline');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Arrow key navigation similar to NPCs editor
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = el as HTMLElement;
      return !!node.closest('input, textarea, select, [contenteditable="true"]');
    };
    const moveSelection = (delta: number) => {
      if (filteredEvents.length === 0) return;
      const idx = selectedEvent ? filteredEvents.findIndex(n => n.id === selectedEvent.id) : -1;
      if (idx === -1) {
        const nextIdx = delta > 0 ? 0 : filteredEvents.length - 1;
        const next = filteredEvents[nextIdx];
        if (next) {
          setSelectedEvent(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          setTimeout(() => {
            document.querySelector(`[data-event-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= filteredEvents.length) return;
      const next = filteredEvents[nextIdx];
      if (!next) return;
      setSelectedEvent(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-event-id=\"${next.id}\"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredEvents, selectedEvent, setSelectedEvent, setIsEditing, setIsCreating]);

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedEvent(null);
    setFormData({
      id: `event-${Date.now()}`,
      title: "",
      date: "",
      description: "",
      category: ""
    });
  };

  const handleEdit = (event: TimelineEvent) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedEvent(event);
    setFormData({ ...event });
  };

  const handleView = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.date || !formData.description) {
        setError("Please fill in all required fields");
        return;
      }

      const eventData = formData as TimelineEvent;

      let updatedEvents;
      if (isCreating) {
        updatedEvents = [...events, eventData];
        setSuccess("Event created successfully!");
      } else {
        updatedEvents = events.map(event => event.id === eventData.id ? eventData : event);
        setSuccess("Event updated successfully!");
      }

      setEvents(updatedEvents);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedEvent(eventData);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Event");
    }
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) return;

    try {
      const updatedEvents = events.filter(e => e.id !== event.id);
      setEvents(updatedEvents);
      setSelectedEvent(null);
      setSuccess("Event deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Event");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
        <span className="grim-flame" />
        <span style={{ marginLeft: 12, fontFamily: "var(--font-body)", color: "var(--grim-ink-3)", fontSize: 14 }}>Loading Timeline...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Masthead */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Events</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Timeline</h1>
          <p className="grim-page-sub">Chronicle the turning of history — events, ages, and turning points.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate} style={{ flexShrink: 0 }}>
          + Mark Event
        </button>
      </header>

      {/* Status Messages */}
      {error && (
        <div style={{
          background: "oklch(0.25 0.12 22 / 0.4)",
          border: "1px solid var(--grim-blood-2)",
          color: "oklch(0.85 0.08 30)",
          padding: "12px 16px",
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "oklch(0.25 0.10 145 / 0.4)",
          border: "1px solid oklch(0.55 0.090 145)",
          color: "var(--grim-moss)",
          padding: "12px 16px",
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}>
          {success}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List panel */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          {/* Search bar */}
          <div style={{ borderBottom: "1px solid var(--grim-line)" }}>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "var(--grim-bg-3)",
                border: "none",
                borderBottom: "1px solid var(--grim-line-2)",
                color: "var(--grim-ink)",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                padding: "10px 14px",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* List items */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                data-event-id={event.id}
                onClick={() => handleView(event)}
                style={{
                  borderBottom: "1px solid var(--grim-line)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderLeft: selectedEvent?.id === event.id
                    ? "2px solid var(--grim-ember)"
                    : "2px solid transparent",
                  background: selectedEvent?.id === event.id
                    ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                    : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.title}
                    </div>
                    <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>
                      {event.date}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                      className="grim-btn is-ghost"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                      className="grim-btn is-blood"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail / Edit panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--grim-line)" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--grim-ink)" }}>
                  {isCreating ? "Mark New Event" : "Edit Event"}
                </div>
              </div>
              <div style={{ padding: "24px 24px" }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label">Title *</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label">Date *</label>
                    <input
                      type="text"
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="e.g., 15th of Reaping, 1482 AC"
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label">Category</label>
                    <input
                      type="text"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Campaign, Historical, Personal"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label">Description *</label>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label className="grim-label">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" onClick={handleCancel} className="grim-btn is-ghost">
                      Cancel
                    </button>
                    <button type="submit" className="grim-btn is-ember">
                      {isCreating ? "Mark Event" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedEvent ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--grim-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-gold)", lineHeight: 1.1 }}>
                    {selectedEvent.title}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="grim-chip">{selectedEvent.date}</span>
                    {selectedEvent.category && (
                      <span className="grim-chip is-ember">{selectedEvent.category}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(selectedEvent)} className="grim-btn is-ghost">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(selectedEvent)} className="grim-btn is-blood">
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ padding: "24px 24px" }}>
                <div
                  className="grim-flavor"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedEvent.description || '', true) }}
                />
              </div>
            </div>
          ) : (
            <div className="grim-tome" style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-ink-4)", marginBottom: 16, lineHeight: 1 }}>☾</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>
                Nothing selected
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)" }}>
                Choose an event from the chronicle, or mark a new one.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
