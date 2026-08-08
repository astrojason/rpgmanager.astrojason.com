"use client";

import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  category?: string;
  gm_notes?: string;
}

const inputClassName =
  "bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none w-full";

export default function TimelineManagementPage() {
  const {
    items: events,
    loading,
    queryError,
    selected: selectedEvent,
    isEditing,
    isCreating,
    isSaving,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    error,
    setError,
    success,
    confirmState,
    closeConfirm,
    handleCreate: createEvent,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<TimelineEvent>({
    endpoint: "/api/data/timeline",
    getId: (ev) => ev.id,
    validate: (f) => (!f.title || !f.date || !f.description ? "Please fill in all required fields" : null),
    successMessage: (creating) => (creating ? "Event created successfully!" : "Event updated successfully!"),
    saveErrorMessage: () => "Failed to save event",
    deleteConfirmMessage: (ev) => `Are you sure you want to delete "${ev.title}"?`,
    deleteErrorMessage: "Failed to delete event",
    deleteSuccessMessage: "Event deleted successfully!",
  });

  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useListArrowNav({
    items: filteredEvents,
    selected: selectedEvent,
    getId: (ev) => ev.id,
    dataAttr: "data-event-id",
    onSelect: handleView,
  });

  const handleCreate = () => {
    createEvent({
      id: `event-${Date.now()}`,
      title: "",
      date: "",
      description: "",
      category: ""
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 px-0">
        <span className="grim-flame" />
        <span className="ml-3 font-body text-grim-ink-3 text-lg">Loading Timeline...</span>
      </div>
    );
  }

  return (
    <div className="pt-9 px-12 pb-20">

      {/* Masthead */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Events</div>
          <h1 className="grim-page-title text-7xl">The Timeline</h1>
          <p className="grim-page-sub">Chronicle the turning of history — events, ages, and turning points.</p>
        </div>
        <button className="grim-btn is-ember shrink-0" onClick={handleCreate}>
          + Mark Event
        </button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List panel */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          {/* Search bar */}
          <div className="border-b border-grim-line">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-grim-bg-3 border-0 border-b border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none w-full"
            />
          </div>

          {/* List items */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                data-event-id={event.id}
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
                    <div className="font-head text-lg text-grim-ink truncate">
                      {event.title}
                    </div>
                    <div className="grim-mono text-sm text-grim-ink-4 truncate mt-1">
                      {event.date}
                    </div>
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
            ))}
          </div>
        </div>

        {/* Detail / Edit panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="py-4 px-5 border-b border-grim-line">
                <div className="font-head text-xl tracking-wider uppercase text-grim-ink">
                  {isCreating ? "Mark New Event" : "Edit Event"}
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="mb-4">
                    <label className="grim-label">Title *</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={inputClassName}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label">Date *</label>
                    <input
                      type="text"
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="e.g., 15th of Reaping, 1482 AC"
                      className={inputClassName}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label">Category</label>
                    <input
                      type="text"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Campaign, Historical, Personal"
                      className={inputClassName}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label">Description *</label>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="grim-label">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button type="button" onClick={handleCancel} className="grim-btn is-ghost">
                      Cancel
                    </button>
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                      {isSaving ? "Saving…" : (isCreating ? "Mark Event" : "Save Changes")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedEvent ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="py-4 px-5 border-b border-grim-line flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-5xl text-grim-gold" style={{ lineHeight: 1.1 }}>
                    {selectedEvent.title}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="grim-chip">{selectedEvent.date}</span>
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
                <div
                  className="grim-flavor"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedEvent.description || '', true) }}
                />
              </div>
            </div>
          ) : (
            <div className="grim-tome text-center" style={{ padding: "64px 32px" }}>
              <div className="font-display text-7xl text-grim-ink-4 mb-4 leading-none">☾</div>
              <div className="font-head text-lg tracking-wider-2 uppercase text-grim-ink-3 mb-2">
                Nothing selected
              </div>
              <div className="font-body text-lg text-grim-ink-4">
                Choose an event from the chronicle, or mark a new one.
              </div>
            </div>
          )}
        </div>

      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
