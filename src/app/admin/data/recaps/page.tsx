"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SessionRecap } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import MarkdownEditor from "@/components/MarkdownEditor";
import EntityTagPicker from "@/components/EntityTagPicker";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";

interface EntityItem { id: string; name: string; }

export default function RecapsManagementPage() {
  const {
    items: recaps,
    loading,
    queryError,
    selected: selectedRecap,
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
    handleCreate: createRecap,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete: deleteRecap,
  } = useCrudResource<SessionRecap>({
    endpoint: "/api/data/session-recaps",
    getId: (r) => String(r.id ?? r.date),
    validate: (f, isCreating) => {
      if (!f.title || !f.recap || !f.date) return "Please fill in all required fields (Date, Title, Recap)";
      if (!isCreating && !f.id) return "Unable to update recap: missing identifier.";
      return null;
    },
    buildPayload: (f) => ({ ...(f as SessionRecap), notes: Array.isArray(f.notes) ? f.notes : [] }),
    resolveSelected: (payload, responseData) => {
      const p = payload as SessionRecap;
      const rd = responseData as SessionRecap | undefined;
      const mergedNotes = Array.isArray(rd?.notes) ? rd.notes : p.notes;
      return { ...p, ...(rd ?? {}), notes: mergedNotes ?? [], id: String(rd?.id ?? p.id ?? "") };
    },
    successMessage: (creating) => (creating ? "Session recap created successfully!" : "Session recap updated successfully!"),
    saveErrorMessage: (creating) => (creating ? "Failed to create session recap" : "Failed to update session recap"),
    deleteUrl: (r) => `/api/data/session-recaps?id=${encodeURIComponent(String(r.id))}`,
    deleteConfirmMessage: (r) => `Are you sure you want to delete the recap for "${r.title}"?`,
    deleteErrorMessage: "Failed to delete session recap",
    deleteSuccessMessage: "Session recap deleted successfully!",
    resolveAfterDelete: (current, deleted) => {
      const targetId = deleted.id ?? deleted.date;
      return current && (current.id ?? current.date) === targetId ? null : current;
    },
  });

  const handleDelete = (recap: SessionRecap) => {
    if (!recap.id) {
      setError("Unable to delete recap: missing identifier.");
      return;
    }
    deleteRecap(recap);
  };

  const { data: rawNpcs = [] } = useQuery<{ id: string; name?: string; display_name?: string }[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.json()),
  });

  const { data: rawLocations = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: () => authFetch('/api/data/locations').then(r => r.json()),
  });

  const availableNPCs = useMemo<EntityItem[]>(() =>
    rawNpcs.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id) })),
    [rawNpcs]
  );

  const availableLocations = useMemo<EntityItem[]>(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocations) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) {
        flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
      }
    }
    return flat;
  }, [rawLocations]);

  const filteredRecaps = recaps
    .filter(recap =>
      recap.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recap.recap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recap.date?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCreate = () => {
    createRecap({
      date: new Date().toISOString().split('T')[0],
      title: "",
      recap: ""
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-50">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the chronicle…
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-12 pb-20">

      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Chronicle</div>
          <h1 className="grim-page-title" style={{ fontSize: "4.8333rem" }}>Session Recaps</h1>
          <p className="grim-page-sub">Chronicle the sessions — each night of peril, set down in ink.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Inscribe Recap</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div className="grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>

        {/* Recaps List */}
        <div>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search recaps…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            />
          </div>

          <div className="grim-tome max-h-130 overflow-y-auto" style={{ padding: 0 }}>
            {filteredRecaps.length === 0 ? (
              <div className="py-8 px-4 text-center text-grim-ink-4 font-body text-lg">
                No session recaps found
              </div>
            ) : (
              filteredRecaps.map((recap) => {
                const isSelected = selectedRecap?.id === recap.id || (!selectedRecap?.id && selectedRecap?.date === recap.date);
                return (
                  <div
                    key={recap.id ?? recap.date}
                    className={`py-3 px-4 cursor-pointer border-l-2 ${isSelected ? "border-l-grim-ember" : "border-l-transparent"} border-b border-b-grim-line`}
                    style={{ background: isSelected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent" }}
                    onClick={() => handleView(recap)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-head text-lg ${isSelected ? "text-grim-ember-2" : "text-grim-ink-2"}`}>
                          {recap.title}
                        </div>
                        <div className="grim-mono text-sm text-grim-ink-4 mt-0.75">
                          {recap.date}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(recap); }}
                          className="grim-link text-sm tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(recap); }}
                          className="grim-link text-sm tracking-wider text-grim-blood-2"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail / Edit Panel */}
        <div>
          {isCreating || isEditing ? (
            <div className="grim-tome">
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div className="grim-tome-title">
                  {isCreating ? "Inscribe New Recap" : "Edit Recap"}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Inscribe Recap" : "Save Changes"}`}</button>
                </div>
              </div>

              <div className="mb-4">
                <div className="grim-label mb-1.5">Session Date *</div>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none"
                />
              </div>

              <div className="mb-4">
                <div className="grim-label mb-1.5">Session Title *</div>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter session title…"
                  className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none"
                />
              </div>

              <div className="mb-4">
                <MarkdownEditor
                  value={formData.recap || ""}
                  onChange={(val) => setFormData({ ...formData, recap: val })}
                  rows={14}
                  label="Session Recap"
                  placeholder="Enter session recap content…"
                  linkEntities={[
                    ...availableNPCs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
                    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
                  ]}
                />
              </div>

              <div className="mb-5">
                <EntityTagPicker
                  npcs={availableNPCs}
                  locations={availableLocations}
                  selectedNpcs={formData.tagged_npcs ?? []}
                  selectedLocations={formData.tagged_locations ?? []}
                  onNpcsChange={(ids) => setFormData({ ...formData, tagged_npcs: ids })}
                  onLocationsChange={(ids) => setFormData({ ...formData, tagged_locations: ids })}
                />
              </div>

              <div className="flex gap-2.5 justify-end mt-5">
                <button className="grim-btn is-ghost" onClick={handleCancel}>Cancel</button>
                <button className="grim-btn is-ember" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save Recap"}</button>
              </div>
            </div>
          ) : selectedRecap ? (
            <div className="grim-tome">
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="grim-tome-title">{selectedRecap.title}</div>
                    <div className="grim-mono text-sm text-grim-ink-3 mt-1 tracking-wider-2">
                      {formatDate(selectedRecap.date)}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 pt-1">
                    <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedRecap)}>Edit</button>
                    <button className="grim-btn is-blood" onClick={() => handleDelete(selectedRecap)}>Delete</button>
                  </div>
                </div>
              </div>

              <hr className="grim-rule mb-5" />

              {((selectedRecap.tagged_npcs && selectedRecap.tagged_npcs.length > 0) ||
                (selectedRecap.tagged_locations && selectedRecap.tagged_locations.length > 0)) && (
                <div className="mb-5">
                  <div className="grim-label mb-2">Tagged Souls & Places</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedRecap.tagged_npcs ?? []).map(id => {
                      const n = availableNPCs.find(x => x.id === id);
                      return n ? (
                        <Link key={id} href={`/admin/data/npcs?selected=${id}`} className="grim-chip is-ember text-sm no-underline">
                          {n.name}
                        </Link>
                      ) : null;
                    })}
                    {(selectedRecap.tagged_locations ?? []).map(id => {
                      const l = availableLocations.find(x => x.id === id);
                      return l ? (
                        <Link key={id} href={`/admin/data/locations`} className="grim-chip is-arcane text-sm no-underline">
                          {l.name}
                        </Link>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div
                className="prose-grim text-grim-ink-2 font-body text-xl"
                style={{ lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedRecap.recap, true) }}
              />
            </div>
          ) : (
            <div className="grim-tome text-center" style={{ padding: "60px 24px" }}>
              <div className="font-display text-5xl text-grim-ink-3 mb-3">✎</div>
              <div className="font-head text-xl tracking-widest uppercase text-grim-ink-2 mb-2">No recap selected</div>
              <div className="text-grim-ink-4 text-lg">Select a recap from the list to view, or inscribe a new one.</div>
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
