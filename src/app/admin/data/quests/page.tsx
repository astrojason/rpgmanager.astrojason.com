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
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
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
      <div className="flex items-center justify-center py-20">
        <span className="grim-flame text-5xl">✦</span>
        <span className="ml-3.5 font-body text-xl text-grim-ink-3">
          Consulting the ledger…
        </span>
      </div>
    );
  }

  const inputClass = "bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none w-full";

  const linkEntities = [
    ...availableNPCs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availablePCs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
    ...availableFactions.map(f => ({ id: f.id, name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...availableDeities.map(d => ({ id: d.id, name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <div className="pt-9 px-12 pb-20">

      {/* Page header */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Errands</div>
          <h1 className="grim-page-title" style={{ fontSize: "4.8333rem" }}>The Ledger of Errands</h1>
          <p className="grim-page-sub">Manage the campaign&apos;s threads — active, rumored, and closed.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ New Errand</button>
      </header>

      {/* Status banners */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List panel */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          {/* Search */}
          <div className="border-b border-grim-line">
            <input
              type="text"
              placeholder="Search errands…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Count */}
          <div className="pt-2 px-3.5 pb-1.5 border-b border-grim-line">
            <span className="grim-mono text-sm tracking-wider-4 text-grim-ink-4 uppercase">
              {filteredQuests.length} errand{filteredQuests.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Quest list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filteredQuests.map((quest) => {
              const isSelected = selectedQuest?.id === quest.id;
              return (
                <div
                  key={quest.id}
                  data-quest-id={quest.id}
                  onClick={() => handleView(quest)}
                  className={`border-b border-grim-line border-l-2 ${isSelected ? "border-l-grim-ember" : "border-l-transparent"} py-3 px-4 cursor-pointer`}
                  style={{ background: isSelected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent" }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-head text-lg ${isSelected ? "text-grim-ember-2" : "text-grim-ink-2"} overflow-hidden text-ellipsis whitespace-nowrap mb-1`}>
                        {quest.name}
                      </div>
                      <span className={`${getStatusChipClass(quest.status || "active")} text-sm py-px px-2`}>
                        {quest.status || "active"}
                      </span>
                      <div className="grim-mono text-sm text-grim-ink-4 mt-1">
                        {normalizeQuestNotes(quest).length} note{normalizeQuestNotes(quest).length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(quest); }}
                        className="grim-btn is-ghost py-1 px-2 text-sm"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(quest); }}
                        className="grim-btn is-blood py-1 px-2 text-sm"
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
              <div className="py-8 px-4 text-center">
                <div className="font-display text-4xl text-grim-ink-4 mb-2">✦</div>
                <div className="font-body text-lg text-grim-ink-4">
                  No errands found
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail / edit panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              {/* Form header */}
              <div className="grim-tome-head" style={{ padding: "16px 24px" }}>
                <div className="grim-tome-title">
                  {isCreating ? "New Errand" : "Edit Errand"}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Create Errand" : "Save Changes"}`}</button>
                </div>
              </div>

              <div className="py-6 px-7">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                  {/* Name */}
                  <div className="mb-5">
                    <label className="grim-label block mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-5">
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
                  <div className="mb-5">
                    <label className="grim-label block mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.status || "active"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="onhold">On Hold</option>
                    </select>
                  </div>

                  {/* GM Notes */}
                  <div className="mb-5">
                    <label className="grim-label block mb-1.5">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                      linkEntities={linkEntities}
                    />
                  </div>

                  {/* Entity Tags */}
                  <div className="mb-7">
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
                  <div className="flex justify-end gap-2.5">
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              {/* Quest header with colored rail */}
              <div className="flex overflow-hidden">
                <div
                  className="w-1.5 shrink-0"
                  style={{
                    background: getStatusRail(selectedQuest.status || "active"),
                    boxShadow: selectedQuest.status !== "completed"
                      ? `0 0 12px ${getStatusRail(selectedQuest.status || "active")}`
                      : "none",
                  }}
                />
                <div className="flex-1 py-5.5 px-6.5">
                  {/* Title row */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h2
                        className={`font-display text-5xl text-grim-gold m-0 ${selectedQuest.status === "completed" ? "line-through opacity-70" : "no-underline opacity-100"}`}
                        style={{ lineHeight: 1.1 }}
                      >
                        {selectedQuest.name}
                      </h2>
                      <div className="mt-2">
                        <span className={getStatusChipClass(selectedQuest.status || "active")}>
                          {selectedQuest.status || "active"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
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
                    <div className="mb-4">
                      <div className="grim-label mb-2">Tagged Souls, Places, Banners &amp; Divinities</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedQuest.tagged_npcs ?? []).map(id => {
                          const n = availableNPCs.find(x => x.id === id);
                          return n ? (
                            <Link key={id} href={`/admin/data/npcs?selected=${id}`} className="grim-chip is-ember text-sm no-underline">
                              {n.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_locations ?? []).map(id => {
                          const l = availableLocations.find(x => x.id === id);
                          return l ? (
                            <Link key={id} href={`/admin/data/locations`} className="grim-chip is-arcane text-sm no-underline">
                              {l.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_factions ?? []).map(id => {
                          const f = availableFactions.find(x => x.id === id);
                          return f ? (
                            <Link key={id} href={`/admin/data/factions`} className="grim-chip text-sm no-underline bg-grim-arcane-bg border border-grim-arcane-border text-grim-arcane">
                              ⚑ {f.name}
                            </Link>
                          ) : null;
                        })}
                        {(selectedQuest.tagged_deities ?? []).map(id => {
                          const d = availableDeities.find(x => x.id === id);
                          return d ? (
                            <Link key={id} href={`/admin/data/deities`} className="grim-chip text-sm no-underline bg-grim-gold-bg border border-grim-gold-border text-grim-gold">
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
                      <div className="grim-label mb-2.5">Marginalia</div>
                      <div className="flex flex-col gap-2">
                        {normalizeQuestNotes(selectedQuest).map((note: UserNote, index: number) => (
                          <div
                            key={note.id}
                            className="py-2.5 px-3.5 bg-grim-bg-overlay/70 border border-grim-line"
                          >
                            <div className="flex justify-between items-start gap-3 mb-1.5">
                              <span className="grim-mono text-xs text-grim-ink-4 tracking-wider-3 uppercase">
                                Note #{index + 1}
                              </span>
                            </div>
                            <div className="text-lg text-grim-ink font-body" style={{ lineHeight: 1.55 }}>
                              <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                            {!isLegacyNote(note) && (
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-grim-line">
                                <span className="grim-mono text-xs text-grim-ink-4 tracking-wider-2">
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
                    <div className="pt-2">
                      <p className="grim-flavor text-grim-ink-4 text-xl">
                        No notes have been inscribed for this errand.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="grim-tome text-center" style={{ padding: "60px 40px" }}>
              <div className="font-display text-6xl text-grim-ink-4 mb-4 leading-none">
                ✦
              </div>
              <h3 className="font-head text-2xl text-grim-ink-2 mb-2.5 tracking-wider">
                No errand selected
              </h3>
              <p className="font-body text-xl text-grim-ink-4 max-w-80 mx-auto">
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
