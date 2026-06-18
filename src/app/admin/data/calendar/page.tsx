"use client";

import { useState, useEffect } from "react";
import { CalendarData, CalendarEvent } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

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

export default function CalendarManagementPage() {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({});
  const [editingDate, setEditingDate] = useState(false);
  const [dateForm, setDateForm] = useState({ day: 0, month: 0, year: 0 });
  const [savingDate, setSavingDate] = useState(false);

  // Load calendar data
  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/data/calendar');
      if (!response.ok) throw new Error('Failed to load calendar');
      const data = await response.json();
      setCalendarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const events = calendarData?.events || [];
  const filteredEvents = events.filter(event =>
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedEvent(null);
    setFormData({
      id: `event-${Date.now()}`,
      name: "",
      description: "",
      date: { day: 1, month: 1, year: 1 },
      category: "",
      sort: { timestamp: Date.now(), order: "" }
    });
  };

  const handleEdit = (event: CalendarEvent) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedEvent(event);
    setFormData({ ...event });
  };

  const handleView = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const persistCalendar = async (updated: CalendarData): Promise<void> => {
    const res = await authFetch('/api/data/calendar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error(`Failed to save calendar (${res.status})`);
  };

  const handleSaveCurrentDate = async () => {
    if (!calendarData) return;
    setSavingDate(true);
    setError("");
    try {
      const updated = { ...calendarData, current: dateForm };
      await persistCalendar(updated);
      setCalendarData(updated);
      setEditingDate(false);
      setSuccess("Current date updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save current date");
    } finally {
      setSavingDate(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.description) {
        setError("Please fill in all required fields (Name, Description)");
        return;
      }

      const eventData = formData as CalendarEvent;

      let updatedEvents;
      if (isCreating) {
        updatedEvents = [...events, eventData];
      } else {
        updatedEvents = events.map(event => event.id === eventData.id ? eventData : event);
      }

      const updatedCalendarData = { ...calendarData!, events: updatedEvents };
      await persistCalendar(updatedCalendarData);
      setCalendarData(updatedCalendarData);

      setIsCreating(false);
      setIsEditing(false);
      setSelectedEvent(eventData);

      setSuccess(isCreating ? "Calendar event created successfully!" : "Calendar event updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar event");
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) return;

    try {
      const updatedEvents = events.filter(e => e.id !== event.id);
      const updatedCalendarData = { ...calendarData!, events: updatedEvents };
      await persistCalendar(updatedCalendarData);
      setCalendarData(updatedCalendarData);
      setSelectedEvent(null);
      setSuccess("Calendar event deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete calendar event");
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
        <span style={{ marginLeft: 12, fontFamily: "var(--font-body)", color: "var(--grim-ink-3)", fontSize: 14 }}>Loading Calendar...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Masthead */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Calendar</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Calendar</h1>
          <p className="grim-page-sub">Tend the world calendar — sessions, festivals, and the turning of days.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate} style={{ flexShrink: 0 }}>
          + Add Event
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

      {/* Current Date */}
      <div className="grim-tome" style={{ padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="grim-label" style={{ marginBottom: 4 }}>Current In-Game Date</div>
          {calendarData?.current ? (
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold)" }}>
              Day {calendarData.current.day} · Month {calendarData.current.month} · Year {calendarData.current.year}
            </div>
          ) : (
            <div style={{ color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 14 }}>Not set</div>
          )}
        </div>
        {!editingDate && (
          <button
            className="grim-btn is-ghost"
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => {
              setDateForm(calendarData?.current ?? { day: 1, month: 1, year: 1 });
              setEditingDate(true);
            }}
          >
            ✎ Set Date
          </button>
        )}
        {editingDate && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--grim-ink-4)", marginBottom: 4 }}>DAY</div>
              <input
                type="number" min={1}
                value={dateForm.day}
                onChange={e => setDateForm(f => ({ ...f, day: Number(e.target.value) }))}
                style={{ width: 64, background: "var(--grim-bg-4)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-display)", fontSize: 18, padding: "6px 10px", outline: "none" }}
              />
            </div>
            <div>
              <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--grim-ink-4)", marginBottom: 4 }}>MONTH</div>
              <input
                type="number" min={1}
                value={dateForm.month}
                onChange={e => setDateForm(f => ({ ...f, month: Number(e.target.value) }))}
                style={{ width: 64, background: "var(--grim-bg-4)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-display)", fontSize: 18, padding: "6px 10px", outline: "none" }}
              />
            </div>
            <div>
              <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--grim-ink-4)", marginBottom: 4 }}>YEAR</div>
              <input
                type="number" min={1}
                value={dateForm.year}
                onChange={e => setDateForm(f => ({ ...f, year: Number(e.target.value) }))}
                style={{ width: 90, background: "var(--grim-bg-4)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-display)", fontSize: 18, padding: "6px 10px", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="grim-btn is-ghost" onClick={() => setEditingDate(false)}>Cancel</button>
              <button className="grim-btn is-ember" onClick={handleSaveCurrentDate} disabled={savingDate}>
                {savingDate ? "Saving…" : "Save Date"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List panel */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          {/* Search bar */}
          <div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "var(--grim-bg-3)",
                border: "1px solid var(--grim-line-2)",
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
            {filteredEvents.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)" }}>
                No calendar events found
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
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
                        {event.name}
                      </div>
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 3 }}>
                        {event.date.day}/{event.date.month}/{event.date.year}
                      </div>
                      {event.category && (
                        <span className="grim-chip is-ember" style={{ marginTop: 4, display: "inline-block" }}>
                          {event.category}
                        </span>
                      )}
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
              ))
            )}
          </div>
        </div>

        {/* Detail / Edit panel */}
        <div>
          {isCreating || isEditing ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--grim-line)" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--grim-ink)" }}>
                  {isCreating ? "Add New Event" : "Edit Event"}
                </div>
              </div>
              <div style={{ padding: "24px 24px" }}>
                <div style={{ marginBottom: 16 }}>
                  <label className="grim-label">Event Name *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="grim-label">Description *</label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="grim-label">Day</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.date?.day?.toString() || "1"}
                      onChange={(e) => setFormData({
                        ...formData,
                        date: { ...formData.date, day: parseInt(e.target.value) || 1 } as { month: number; day: number | number[]; year: number }
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="grim-label">Month</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.date?.month?.toString() || "1"}
                      onChange={(e) => setFormData({
                        ...formData,
                        date: { ...formData.date, month: parseInt(e.target.value) || 1 } as { month: number; day: number | number[]; year: number }
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="grim-label">Year</label>
                    <input
                      type="number"
                      value={formData.date?.year?.toString() || "1"}
                      onChange={(e) => setFormData({
                        ...formData,
                        date: { ...formData.date, year: parseInt(e.target.value) || 1 } as { month: number; day: number | number[]; year: number }
                      })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label className="grim-label">Category</label>
                  <input
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember">
                    {isCreating ? "Add Event" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          ) : selectedEvent ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--grim-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-gold)", lineHeight: 1.1 }}>
                    {selectedEvent.name}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="grim-chip">
                      {selectedEvent.date.day}/{selectedEvent.date.month}/{selectedEvent.date.year}
                    </span>
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
                <p className="grim-flavor" style={{ whiteSpace: "pre-wrap" }}>
                  {selectedEvent.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="grim-tome" style={{ padding: "64px 32px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-ink-4)", marginBottom: 16, lineHeight: 1 }}>✠</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>
                Nothing selected
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)" }}>
                Choose an event from the calendar, or add a new one.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
