"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from '@/components/MarkdownEditor';
import UserNotesEditor from '@/components/UserNotesEditor';
import AuthorDisplay from '@/components/AuthorDisplay';
import EntityTagPicker from '@/components/EntityTagPicker';
import { Quest, UserNote } from '@/types/interfaces';
import { normalizeQuestNotes, isLegacyNote, formatNoteTimestamp } from '@/utils/questUtils';
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";
import Link from "next/link";

interface EntityItem { id: string; name: string; }

export default function QuestsManagementPage() {
  const [user, setUser] = useState<User | null>(null);

  const {
    items: quests,
    loading,
    queryError,
    selected: selectedQuest,
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
    handleCreate: createQuest,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<Quest>({
    endpoint: "/api/data/quests",
    getId: (q) => q.id,
    validate: (f) => (!f.name ? "Please fill in quest name" : null),
    successMessage: (creating) => (creating ? "Quest created successfully!" : "Quest updated successfully!"),
    deleteConfirmMessage: (q) => `Are you sure you want to delete "${q.name}"?`,
    deleteSuccessMessage: "Quest deleted successfully!",
  });

  // Authentication state
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => { setUser(user); });
    return () => unsubscribe();
  }, []);

  const { data: rawNpcs = [] } = useQuery<{ id: string; name?: string; display_name?: string }[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.json()),
  });
  const { data: rawLocations = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: () => authFetch('/api/data/locations').then(r => r.json()),
  });
  const { data: rawFactions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.json()),
  });
  const { data: rawDeities = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/deities'],
    queryFn: () => authFetch('/api/data/deities').then(r => r.json()),
  });
  const { data: rawPCs = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.json()),
  });

  const availableNPCs = useMemo<EntityItem[]>(() =>
    rawNpcs.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id) })),
    [rawNpcs]
  );
  const availableLocations = useMemo<EntityItem[]>(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocations) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
    }
    return flat;
  }, [rawLocations]);
  const availableFactions = useMemo<EntityItem[]>(() => rawFactions.map(f => ({ id: String(f.id), name: f.name })), [rawFactions]);
  const availableDeities = useMemo<EntityItem[]>(() => rawDeities.map(d => ({ id: String(d.id), name: d.name })), [rawDeities]);
  const availablePCs = useMemo<EntityItem[]>(() => rawPCs.map(p => ({ id: String(p.id), name: p.name })), [rawPCs]);

  const filteredQuests = quests.filter(quest => {
    const searchLower = searchTerm.toLowerCase();
    const normalizedNotes = normalizeQuestNotes(quest);
    const notesText = normalizedNotes
      .map(note => note.content).join(" ");

    return quest.name?.toLowerCase().includes(searchLower) ||
      notesText.toLowerCase().includes(searchLower) ||
      quest.status?.toLowerCase().includes(searchLower);
  });

  useListArrowNav({
    items: filteredQuests,
    selected: selectedQuest,
    getId: (q) => q.id,
    dataAttr: "data-quest-id",
    onSelect: handleView,
  });

  const handleCreate = () => {
    createQuest({
      id: `quest-${Date.now()}`,
      name: "",
      notes: [],
      status: "active"
    });
  };

  const getStatusChipClass = (status: string) => {
    const map: Record<string, string> = {
      active:    "grim-chip is-ember",
      completed: "grim-chip",
      failed:    "grim-chip is-dead",
      onhold:    "grim-chip is-arcane",
    };
    return map[status] ?? "grim-chip";
  };

  const getStatusRail = (status: string) => {
    const map: Record<string, string> = {
      active:    "var(--grim-ember)",
      completed: "var(--grim-line-2)",
      failed:    "oklch(0.52 0.180 22)",
      onhold:    "var(--grim-arcane)",
    };
    return map[status] ?? "var(--grim-line-2)";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <span className="grim-flame" style={{ fontSize: 32 }}>✦</span>
        <span style={{ marginLeft: 14, fontFamily: "var(--font-body)", fontSize: 16, color: "var(--grim-ink-3)" }}>
          Consulting the ledger…
        </span>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--grim-bg-3)",
    border: "1px solid var(--grim-line-2)",
    color: "var(--grim-ink)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    padding: "10px 14px",
    outline: "none",
    width: "100%",
  };

  const linkEntities = [
    ...availableNPCs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availablePCs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
    ...availableFactions.map(f => ({ id: f.id, name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...availableDeities.map(d => ({ id: d.id, name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Page header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Errands</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Ledger of Errands</h1>
          <p className="grim-page-sub">Manage the campaign&apos;s threads — active, rumored, and closed.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ New Errand</button>
      </header>

      {/* Status banners */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List panel */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          {/* Search */}
          <div style={{ borderBottom: "1px solid var(--grim-line)" }}>
            <input
              type="text"
              placeholder="Search errands…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Count */}
          <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid var(--grim-line)" }}>
            <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>
              {filteredQuests.length} errand{filteredQuests.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Quest list */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filteredQuests.map((quest) => {
              const isSelected = selectedQuest?.id === quest.id;
              return (
                <div
                  key={quest.id}
                  data-quest-id={quest.id}
                  onClick={() => handleView(quest)}
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    borderLeft: isSelected ? "2px solid var(--grim-ember)" : "2px solid transparent",
                    background: isSelected
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--font-head)",
                        fontSize: 14,
                        color: isSelected ? "var(--grim-ember-2)" : "var(--grim-ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 4,
                      }}>
                        {quest.name}
                      </div>
                      <span className={getStatusChipClass(quest.status || "active")} style={{ fontSize: 10, padding: "1px 7px" }}>
                        {quest.status || "active"}
                      </span>
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 4 }}>
                        {normalizeQuestNotes(quest).length} note{normalizeQuestNotes(quest).length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(quest); }}
                        className="grim-btn is-ghost"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(quest); }}
                        className="grim-btn is-blood"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredQuests.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-ink-4)", marginBottom: 8 }}>✦</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)" }}>
                  No errands found
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail / edit panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              {/* Form header */}
              <div className="grim-tome-head" style={{ padding: "16px 24px" }}>
                <div className="grim-tome-title">
                  {isCreating ? "New Errand" : "Edit Errand"}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Create Errand" : "Save Changes"}`}</button>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                  {/* Name */}
                  <div style={{ marginBottom: 20 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 20 }}>
                    <UserNotesEditor
                      notes={formData.notes ?
                        (typeof formData.notes[0] === 'string' ?
                          (formData.notes as string[]).map((content, index) => ({
                            id: `legacy-${index}`,
                            content,
                            timestamp: '',
                            author: 'Unknown'
                          })) :
                          formData.notes as UserNote[]
                        ) : []
                      }
                      onChange={(notes) => setFormData({ ...formData, notes })}
                      currentUser={user}
                      linkEntities={linkEntities}
                    />
                  </div>

                  {/* Status */}
                  <div style={{ marginBottom: 20 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>
                      Status
                    </label>
                    <select
                      value={formData.status || "active"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="onhold">On Hold</option>
                    </select>
                  </div>

                  {/* GM Notes */}
                  <div style={{ marginBottom: 20 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                      linkEntities={linkEntities}
                    />
                  </div>

                  {/* Entity Tags */}
                  <div style={{ marginBottom: 28 }}>
                    <EntityTagPicker
                      npcs={availableNPCs}
                      locations={availableLocations}
                      factions={availableFactions}
                      deities={availableDeities}
                      selectedNpcs={formData.tagged_npcs ?? []}
                      selectedLocations={formData.tagged_locations ?? []}
                      selectedFactions={formData.tagged_factions ?? []}
                      selectedDeities={formData.tagged_deities ?? []}
                      onNpcsChange={(ids) => setFormData({ ...formData, tagged_npcs: ids })}
                      onLocationsChange={(ids) => setFormData({ ...formData, tagged_locations: ids })}
                      onFactionsChange={(ids) => setFormData({ ...formData, tagged_factions: ids })}
                      onDeitiesChange={(ids) => setFormData({ ...formData, tagged_deities: ids })}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                      {isSaving ? "Saving…" : (isCreating ? "Create Errand" : "Save Changes")}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          ) : selectedQuest ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              {/* Quest header with colored rail */}
              <div style={{ display: "flex", overflow: "hidden" }}>
                <div style={{
                  width: 6,
                  flexShrink: 0,
                  background: getStatusRail(selectedQuest.status || "active"),
                  boxShadow: selectedQuest.status !== "completed"
                    ? `0 0 12px ${getStatusRail(selectedQuest.status || "active")}`
                    : "none",
                }} />
                <div style={{ flex: 1, padding: "22px 26px" }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                    <div>
                      <h2 style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 32,
                        color: "var(--grim-gold)",
                        margin: 0,
                        lineHeight: 1.1,
                        textDecoration: selectedQuest.status === "completed" ? "line-through" : "none",
                        opacity: selectedQuest.status === "completed" ? 0.7 : 1,
                      }}>
                        {selectedQuest.name}
                      </h2>
                      <div style={{ marginTop: 8 }}>
                        <span className={getStatusChipClass(selectedQuest.status || "active")}>
                          {selectedQuest.status || "active"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedQuest)}>
                        ✎ Edit
                      </button>
                      <button className="grim-btn is-blood" onClick={() => handleDelete(selectedQuest)}>
                        ✕ Delete
                      </button>
                    </div>
                  </div>

                  {/* Tagged entities */}
                  {((selectedQuest.tagged_npcs?.length ?? 0) > 0 ||
                    (selectedQuest.tagged_locations?.length ?? 0) > 0 ||
                    (selectedQuest.tagged_factions?.length ?? 0) > 0 ||
                    (selectedQuest.tagged_deities?.length ?? 0) > 0) && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Tagged Souls, Places, Banners &amp; Divinities</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(selectedQuest.tagged_npcs ?? []).map(id => {
                          const n = availableNPCs.find(x => x.id === id);
                          return n ? (
                            <Link key={id} href={`/admin/data/npcs?selected=${id}`} className="grim-chip is-ember" style={{ fontSize: 11, textDecoration: "none" }}>
                              {n.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_locations ?? []).map(id => {
                          const l = availableLocations.find(x => x.id === id);
                          return l ? (
                            <Link key={id} href={`/admin/data/locations`} className="grim-chip is-arcane" style={{ fontSize: 11, textDecoration: "none" }}>
                              {l.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_factions ?? []).map(id => {
                          const f = availableFactions.find(x => x.id === id);
                          return f ? (
                            <Link key={id} href={`/admin/data/factions`} className="grim-chip" style={{ fontSize: 11, textDecoration: "none", background: "oklch(0.50 0.14 285 / 0.18)", border: "1px solid oklch(0.50 0.14 285 / 0.45)", color: "var(--grim-arcane)" }}>
                              ⚑ {f.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_deities ?? []).map(id => {
                          const d = availableDeities.find(x => x.id === id);
                          return d ? (
                            <Link key={id} href={`/admin/data/deities`} className="grim-chip" style={{ fontSize: 11, textDecoration: "none", background: "oklch(0.55 0.10 60 / 0.18)", border: "1px solid oklch(0.55 0.10 60 / 0.45)", color: "var(--grim-gold)" }}>
                              ✦ {d.name}
                            </Link>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedQuest.notes && selectedQuest.notes.length > 0 && (
                    <div>
                      <div className="grim-label" style={{ marginBottom: 10 }}>Marginalia</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {normalizeQuestNotes(selectedQuest).map((note: UserNote, index: number) => (
                          <div
                            key={note.id}
                            style={{
                              padding: "10px 14px",
                              background: "oklch(0.14 0.025 290 / 0.7)",
                              border: "1px solid var(--grim-line)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                              <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>
                                Note #{index + 1}
                              </span>
                            </div>
                            <div style={{ fontSize: 14, color: "var(--grim-ink)", lineHeight: 1.55, fontFamily: "var(--font-body)" }}>
                              <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                            {!isLegacyNote(note) && (
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: "1px solid var(--grim-line)",
                              }}>
                                <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em" }}>
                                  {formatNoteTimestamp(note)}
                                </span>
                                <AuthorDisplay uid={note.author} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!selectedQuest.notes || selectedQuest.notes.length === 0) && (
                    <div style={{ paddingTop: 8 }}>
                      <p className="grim-flavor" style={{ color: "var(--grim-ink-4)", fontSize: 15 }}>
                        No notes have been inscribed for this errand.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="grim-tome" style={{ padding: "60px 40px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-ink-4)", marginBottom: 16, lineHeight: 1 }}>
                ✦
              </div>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-ink-2)", margin: "0 0 10px", letterSpacing: ".06em" }}>
                No errand selected
              </h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-4)", maxWidth: 320, margin: "0 auto" }}>
                Choose an errand from the ledger to view its threads, or inscribe a new one.
              </p>
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
