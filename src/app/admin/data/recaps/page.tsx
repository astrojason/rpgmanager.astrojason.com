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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the chronicle…
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Chronicle</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Session Recaps</h1>
          <p className="grim-page-sub">Chronicle the sessions — each night of peril, set down in ink.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Inscribe Recap</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>

        {/* Recaps List */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search recaps…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "10px 14px", outline: "none" }}
            />
          </div>

          <div className="grim-tome" style={{ padding: 0, maxHeight: 520, overflowY: "auto" }}>
            {filteredRecaps.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                No session recaps found
              </div>
            ) : (
              filteredRecaps.map((recap) => {
                const isSelected = selectedRecap?.id === recap.id || (!selectedRecap?.id && selectedRecap?.date === recap.date);
                return (
                  <div
                    key={recap.id ?? recap.date}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: isSelected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                      borderLeft: "2px solid " + (isSelected ? "var(--grim-ember)" : "transparent"),
                      borderBottom: "1px solid var(--grim-line)",
                    }}
                    onClick={() => handleView(recap)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: isSelected ? "var(--grim-ember-2)" : "var(--grim-ink-2)" }}>
                          {recap.title}
                        </div>
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 3 }}>
                          {recap.date}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(recap); }}
                          className="grim-link"
                          style={{ fontSize: 11, letterSpacing: ".06em" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(recap); }}
                          className="grim-link"
                          style={{ fontSize: 11, letterSpacing: ".06em", color: "var(--grim-blood-2)" }}
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
            <div className="grim-tome" style={{ padding: "24px 28px" }}>
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div className="grim-tome-title">
                  {isCreating ? "Inscribe New Recap" : "Edit Recap"}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Inscribe Recap" : "Save Changes"}`}</button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="grim-label" style={{ marginBottom: 6 }}>Session Date *</div>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "9px 14px", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="grim-label" style={{ marginBottom: 6 }}>Session Title *</div>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter session title…"
                  style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "9px 14px", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
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

              <div style={{ marginBottom: 20 }}>
                <EntityTagPicker
                  npcs={availableNPCs}
                  locations={availableLocations}
                  selectedNpcs={formData.tagged_npcs ?? []}
                  selectedLocations={formData.tagged_locations ?? []}
                  onNpcsChange={(ids) => setFormData({ ...formData, tagged_npcs: ids })}
                  onLocationsChange={(ids) => setFormData({ ...formData, tagged_locations: ids })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="grim-btn is-ghost" onClick={handleCancel}>Cancel</button>
                <button className="grim-btn is-ember" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save Recap"}</button>
              </div>
            </div>
          ) : selectedRecap ? (
            <div className="grim-tome" style={{ padding: "24px 28px" }}>
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div className="grim-tome-title">{selectedRecap.title}</div>
                    <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", marginTop: 4, letterSpacing: ".12em" }}>
                      {formatDate(selectedRecap.date)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, paddingTop: 4 }}>
                    <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedRecap)}>Edit</button>
                    <button className="grim-btn is-blood" onClick={() => handleDelete(selectedRecap)}>Delete</button>
                  </div>
                </div>
              </div>

              <hr className="grim-rule" style={{ marginBottom: 20 }} />

              {((selectedRecap.tagged_npcs && selectedRecap.tagged_npcs.length > 0) ||
                (selectedRecap.tagged_locations && selectedRecap.tagged_locations.length > 0)) && (
                <div style={{ marginBottom: 20 }}>
                  <div className="grim-label" style={{ marginBottom: 8 }}>Tagged Souls & Places</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(selectedRecap.tagged_npcs ?? []).map(id => {
                      const n = availableNPCs.find(x => x.id === id);
                      return n ? (
                        <Link key={id} href={`/admin/data/npcs?selected=${id}`} className="grim-chip is-ember" style={{ fontSize: 11, textDecoration: "none" }}>
                          {n.name}
                        </Link>
                      ) : null;
                    })}
                    {(selectedRecap.tagged_locations ?? []).map(id => {
                      const l = availableLocations.find(x => x.id === id);
                      return l ? (
                        <Link key={id} href={`/admin/data/locations`} className="grim-chip is-arcane" style={{ fontSize: 11, textDecoration: "none" }}>
                          {l.name}
                        </Link>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div
                className="prose-grim"
                style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedRecap.recap, true) }}
              />
            </div>
          ) : (
            <div className="grim-tome" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ink-3)", marginBottom: 12 }}>✎</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No recap selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: 14 }}>Select a recap from the list to view, or inscribe a new one.</div>
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
