"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarData, CalendarEvent } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ConfirmModal from "@/components/ConfirmModal";

const AB_OFFSET = 1308; // Tyr'amryn year = AB year + AB_OFFSET

const inputClass =
  "bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none w-full";

export default function CalendarManagementPage() {
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
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const queryClient = useQueryClient();

  const { data: calendarData = null, isPending: loading, error: queryError } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: () => authFetch('/api/data/calendar').then(r => {
      if (!r.ok) throw new Error('Failed to load calendar');
      return r.json();
    }),
  });

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
      await queryClient.invalidateQueries({ queryKey: ['/api/data/calendar'] });
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
      await queryClient.invalidateQueries({ queryKey: ['/api/data/calendar'] });
      setIsCreating(false);
      setIsEditing(false);
      setSelectedEvent(eventData);

      setSuccess(isCreating ? "Calendar event created successfully!" : "Calendar event updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar event");
    }
  };

  const handleDelete = (event: CalendarEvent) => {
    setConfirmState({
      message: `Are you sure you want to delete "${event.name}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const updatedEvents = events.filter(e => e.id !== event.id);
          const updatedCalendarData = { ...calendarData!, events: updatedEvents };
          await persistCalendar(updatedCalendarData);
          await queryClient.invalidateQueries({ queryKey: ['/api/data/calendar'] });
          setSelectedEvent(null);
          setSuccess("Calendar event deleted successfully!");
          setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete calendar event");
        }
      },
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="grim-flame" />
        <span className="ml-3 font-body text-grim-ink-3 text-lg">Loading Calendar...</span>
      </div>
    );
  }

  return (
    <div className="pt-9 px-12 pb-20">

      {/* Masthead */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Calendar</div>
          <h1 className="grim-page-title" style={{ fontSize: "4.8333rem" }}>Calendar</h1>
          <p className="grim-page-sub">Tend the world calendar — sessions, festivals, and the turning of days.</p>
        </div>
        <button className="grim-btn is-ember shrink-0" onClick={handleCreate}>
          + Add Event
        </button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && (
        <div
          className="border border-grim-blood-2 text-grim-error-text py-3 px-4 mb-4 font-body text-lg"
          style={{ background: "oklch(0.25 0.12 22 / 0.4)" }}
        >
          {error || queryError?.message}
        </div>
      )}

      {success && (
        <div className="bg-grim-success-bg border border-grim-moss text-grim-moss py-3 px-4 mb-4 font-body text-lg">
          {success}
        </div>
      )}

      {/* Current Date */}
      <div className="grim-tome mb-6 flex items-center gap-6 flex-wrap" style={{ padding: "16px 20px" }}>
        <div>
          <div className="grim-label mb-1">Current In-Game Date</div>
          {calendarData?.current ? (
            <div>
              <div className="font-display text-3xl text-grim-gold">
                Day {calendarData.current.day} · {calendarData.static.months[calendarData.current.month - 1]?.name ?? `Month ${calendarData.current.month}`} · AB {calendarData.current.year}
              </div>
              <div className="grim-mono text-sm text-grim-ink-4 tracking-wider-3 mt-0.5">
                Tyr&apos;amryn Year {calendarData.current.year + AB_OFFSET}
              </div>
            </div>
          ) : (
            <div className="text-grim-ink-4 font-body text-lg">Not set</div>
          )}
        </div>
        {!editingDate && (
          <button
            className="grim-btn is-ghost py-1.5 px-3.5 text-lg"
            onClick={() => {
              setDateForm(calendarData?.current ?? { day: 1, month: 1, year: 1 });
              setEditingDate(true);
            }}
          >
            ✎ Set Date
          </button>
        )}
        {editingDate && (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">DAY</div>
              <input
                type="number"
                value={dateForm.day}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) return;
                  if (val > 40) setDateForm(f => ({ ...f, day: 1 }));
                  else if (val < 1) setDateForm(f => ({ ...f, day: 40 }));
                  else setDateForm(f => ({ ...f, day: val }));
                }}
                className="w-16 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">MONTH</div>
              <select
                value={dateForm.month}
                onChange={e => setDateForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-body text-lg py-1.5 px-2.5 outline-none"
              >
                {(calendarData?.static.months ?? []).map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">YEAR (AB)</div>
              <input
                type="number" min={1}
                value={dateForm.year}
                onChange={e => setDateForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-20 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">YEAR (T)</div>
              <input
                type="number" min={1}
                value={dateForm.year ? dateForm.year + AB_OFFSET : ""}
                onChange={e => setDateForm(f => ({ ...f, year: Number(e.target.value) - AB_OFFSET }))}
                className="w-22.5 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button className="grim-btn is-ghost" onClick={() => setEditingDate(false)}>Cancel</button>
              <button className="grim-btn is-ember" onClick={handleSaveCurrentDate} disabled={savingDate}>
                {savingDate ? "Saving…" : "Save Date"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List panel */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          {/* Search bar */}
          <div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none w-full"
            />
          </div>

          {/* List items */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filteredEvents.length === 0 ? (
              <div className="py-8 px-4 text-center font-body text-lg text-grim-ink-4">
                No calendar events found
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleView(event)}
                  className={`border-b border-grim-line py-3 px-4 cursor-pointer border-l-2 ${selectedEvent?.id === event.id ? "border-grim-ember" : "border-transparent"}`}
                  style={{
                    background: selectedEvent?.id === event.id
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-head text-lg text-grim-ink overflow-hidden text-ellipsis whitespace-nowrap">
                        {event.name}
                      </div>
                      <div className="grim-mono text-sm text-grim-ink-4 mt-1">
                        {calendarData?.static.months[event.date.month - 1]?.name ?? `Month ${event.date.month}`} {Array.isArray(event.date.day) ? `${event.date.day[0]}–${event.date.day[event.date.day.length - 1]}` : event.date.day} · AB {event.date.year} / T {event.date.year + AB_OFFSET}
                      </div>
                      {event.category && (
                        <span className="grim-chip is-ember mt-1 inline-block">
                          {event.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                        className="grim-btn is-ghost py-0.5 px-2 text-sm"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                        className="grim-btn is-blood py-0.5 px-2 text-sm"
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="py-4 px-5 border-b border-grim-line">
                <div className="font-head text-xl tracking-wider uppercase text-grim-ink">
                  {isCreating ? "Add New Event" : "Edit Event"}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="grim-label">Event Name *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="mb-4">
                  <label className="grim-label">Description *</label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div className="grid gap-3 mb-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
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
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="grim-label">Month</label>
                    <select
                      value={formData.date?.month ?? 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        date: { ...formData.date, month: parseInt(e.target.value) || 1 } as { month: number; day: number | number[]; year: number }
                      })}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {(calendarData?.static.months ?? []).map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="grim-label">Year — Azorian&apos;s Bounty</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 427"
                      value={formData.date?.year?.toString() || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        date: { ...formData.date, year: parseInt(e.target.value) || 1 } as { month: number; day: number | number[]; year: number }
                      })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="grim-label">Year — Tyr&apos;amryn</label>
                    <input
                      type="number"
                      min={AB_OFFSET + 1}
                      placeholder="e.g. 1735"
                      value={formData.date?.year ? (formData.date.year + AB_OFFSET).toString() : ""}
                      onChange={(e) => {
                        const t = parseInt(e.target.value) || AB_OFFSET + 1;
                        setFormData({
                          ...formData,
                          date: { ...formData.date, year: t - AB_OFFSET } as { month: number; day: number | number[]; year: number }
                        });
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="grim-label">Category</label>
                  <input
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-end gap-2.5">
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="py-4 px-5 border-b border-grim-line flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-5xl text-grim-gold" style={{ lineHeight: 1.1 }}>
                    {selectedEvent.name}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="grim-chip">
                      {calendarData?.static.months[selectedEvent.date.month - 1]?.name ?? `Month ${selectedEvent.date.month}`}{" "}
                      {Array.isArray(selectedEvent.date.day) ? `${selectedEvent.date.day[0]}–${selectedEvent.date.day[selectedEvent.date.day.length - 1]}` : selectedEvent.date.day}
                    </span>
                    <span className="grim-chip">AB {selectedEvent.date.year} / T {selectedEvent.date.year + AB_OFFSET}</span>
                    {selectedEvent.category && (
                      <span className="grim-chip is-ember">{selectedEvent.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(selectedEvent)} className="grim-btn is-ghost">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(selectedEvent)} className="grim-btn is-blood">
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="grim-flavor whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="grim-tome text-center" style={{ padding: "64px 32px" }}>
              <div className="font-display text-7xl text-grim-ink-4 mb-4 leading-none">✠</div>
              <div className="font-head text-lg tracking-wider-2 uppercase text-grim-ink-3 mb-2">
                Nothing selected
              </div>
              <div className="font-body text-lg text-grim-ink-4">
                Choose an event from the calendar, or add a new one.
              </div>
            </div>
          )}
        </div>

      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
