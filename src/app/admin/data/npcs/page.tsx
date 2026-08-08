"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { NPC, Faction, PC } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";

const fieldClass = "w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none";

function statusChipClass(status: string | undefined): string {
  if (!status) return "grim-chip is-unknown";
  if (status === "alive") return "grim-chip is-alive";
  if (status === "dead" || status === "deceased") return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

export default function NPCsManagementPage() {
  const [isMerging, setIsMerging] = useState(false);
  const [mergeWithId, setMergeWithId] = useState<string>("");
  const [mergeChoice, setMergeChoice] = useState<Record<string, 'left' | 'right'>>({});
  const [mergeIncludeRightFactions, setMergeIncludeRightFactions] = useState(true);
  const [mergeIncludeRightNotes, setMergeIncludeRightNotes] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [cursorId, setCursorId] = useState<string | null>(null);

  const {
    items: npcs,
    loading,
    queryError,
    selected: selectedNpc,
    setSelected: setSelectedNpc,
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
    setSuccess,
    confirmState,
    closeConfirm,
    handleCreate: createNpc,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<NPC>({
    endpoint: "/api/data/npcs",
    getId: (npc) => npc.id,
    validate: (f) => (!f.name || !f.race || !f.location ? "Please fill in all required fields (Name, Race, Location)" : null),
    successMessage: (creating) => (creating ? "NPC created successfully!" : "NPC updated successfully!"),
    saveErrorMessage: (creating) => (creating ? "Failed to create NPC" : "Failed to update NPC"),
    deleteConfirmMessage: (npc) => `Are you sure you want to delete ${npc.name}?`,
    deleteErrorMessage: "Failed to delete NPC",
    deleteSuccessMessage: "NPC deleted successfully!",
  });

  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
  });
  const { data: pcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.json()),
  });

  const getFactionName = (factionId: string) => {
    const f = factions.find((x) => x.id === factionId);
    return f ? f.name : factionId;
  };

  // Restore review progress
  useEffect(() => {
    try {
      const done = localStorage.getItem('npcReviewDoneIds');
      const cursor = localStorage.getItem('npcReviewCursorId');
      if (done) setDoneIds(new Set(JSON.parse(done)));
      if (cursor) setCursorId(cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore review progress from localStorage');
    }
  }, [setError]);

  const persistProgress = (nextDone: Set<string>, nextCursorId: string | null) => {
    try {
      localStorage.setItem('npcReviewDoneIds', JSON.stringify(Array.from(nextDone)));
      if (nextCursorId) localStorage.setItem('npcReviewCursorId', nextCursorId);
      else localStorage.removeItem('npcReviewCursorId');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save review progress to localStorage');
    }
  };

  const filteredNpcs = npcs.filter(npc => {
    const term = searchTerm.toLowerCase();
    return (
      (npc.name && npc.name.toLowerCase().includes(term)) ||
      (npc.aka && (npc.aka as string).toLowerCase().includes(term)) ||
      (npc.location && npc.location.toLowerCase().includes(term)) ||
      (npc.race && npc.race.toLowerCase().includes(term))
    );
  });

  // Default sort by name (then AKA, then ID)
  const sortedNpcs = useMemo(() => {
    const label = (n: NPC) => (n.name || (n.aka as string) || n.id || '').toLowerCase();
    return [...filteredNpcs].sort((a, b) => label(a).localeCompare(label(b)));
  }, [filteredNpcs]);

  useListArrowNav({
    items: sortedNpcs,
    selected: selectedNpc,
    getId: (npc) => npc.id,
    dataAttr: "data-npc-id",
    onSelect: handleView,
  });

  const currentIndex = useMemo(() => {
    if (!reviewMode) return -1;
    if (!selectedNpc) return -1;
    return npcs.findIndex(n => n.id === selectedNpc.id);
  }, [reviewMode, selectedNpc, npcs]);

  const getNextUnreviewed = (afterId: string | null): NPC | null => {
    if (npcs.length === 0) return null;
    const startIdx = afterId ? Math.max(0, npcs.findIndex(n => n.id === afterId) + 1) : 0;
    for (let i = 0; i < npcs.length; i++) {
      const idx = (startIdx + i) % npcs.length;
      const candidate = npcs[idx];
      if (!doneIds.has(candidate.id)) return candidate;
    }
    return null; // all done
  };

  const handleCreate = () => {
    createNpc({
      id: `npc-${Date.now()}`,
      name: "",
      display_name: "",
      race: "",
      gender: "",
      location: "",
      status: "alive",
      description: "",
      pronunciation: "",
      factions: [],
      hidden: false,
      nameHidden: false
    });
  };

  // Review mode actions
  const startReview = (resume = false) => {
    setReviewMode(true);
    const next = resume ? getNextUnreviewed(cursorId) : getNextUnreviewed(null);
    if (next) {
      handleEdit(next);
      setCursorId(next.id);
      persistProgress(doneIds, next.id);
    } else {
      setSelectedNpc(null);
      handleCancel();
    }
  };
  const markDoneAndNext = () => {
    if (!selectedNpc) return;
    const nextDone = new Set(doneIds);
    nextDone.add(selectedNpc.id);
    setDoneIds(nextDone);
    const next = getNextUnreviewed(selectedNpc.id);
    if (next) {
      handleEdit(next);
      setCursorId(next.id);
      persistProgress(nextDone, next.id);
    } else {
      setCursorId(null);
      persistProgress(nextDone, null);
      setReviewMode(false);
      setSelectedNpc(null);
      handleCancel();
      setSuccess('Review complete!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };
  const skipToNext = () => {
    if (!selectedNpc) return;
    const next = getNextUnreviewed(selectedNpc.id);
    if (next) {
      handleEdit(next);
      setCursorId(next.id);
      persistProgress(doneIds, next.id);
    } else {
      setReviewMode(false);
      setSelectedNpc(null);
      handleCancel();
    }
  };
  const resetProgress = () => {
    setDoneIds(new Set());
    setCursorId(null);
    try {
      localStorage.removeItem('npcReviewDoneIds');
      localStorage.removeItem('npcReviewCursorId');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear review progress from localStorage');
    }
    setSuccess('Review progress reset');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Merge helpers
  const mergeCandidate = useMemo(() => npcs.find(n => n.id === mergeWithId) || null, [mergeWithId, npcs]);
  useEffect(() => {
    if (!selectedNpc || !mergeCandidate) return;
    const init: Record<string, 'left' | 'right'> = {};
    const fields: (keyof NPC)[] = ['name','aka','pronunciation','race','gender','location','status','description','background','roleplaying_notes','image'];
    for (const k of fields) {
      const left = selectedNpc[k];
      const right = mergeCandidate[k];
      init[k as string] = left ? 'left' : (right ? 'right' : 'left');
    }
    setMergeChoice(init);
    setMergeIncludeRightFactions(true);
    setMergeIncludeRightNotes(true);
  }, [selectedNpc, mergeCandidate]);

  const previewMerged: NPC | null = useMemo(() => {
    if (!selectedNpc || !mergeCandidate) return null;
    const merged: NPC = { ...(selectedNpc as NPC) } as NPC;
    const fields: (keyof NPC)[] = ['name','aka','pronunciation','race','gender','location','status','description','background','roleplaying_notes','image'];
    for (const k of fields) {
      const choice = mergeChoice[k as string] || 'left';
      (merged as Record<keyof NPC, unknown>)[k] = choice === 'left' ? selectedNpc[k] : mergeCandidate[k];
    }
    // arrays
    const leftF = new Set([...(selectedNpc.factions || [])]);
    if (mergeIncludeRightFactions) {
      for (const f of mergeCandidate.factions || []) leftF.add(f);
    }
    merged.factions = Array.from(leftF);
    if (selectedNpc.notes || (mergeIncludeRightNotes && mergeCandidate.notes)) {
      merged.notes = [ ...(selectedNpc.notes || []), ...(mergeIncludeRightNotes ? (mergeCandidate.notes || []) : []) ];
    }
    return merged as NPC;
  }, [selectedNpc, mergeCandidate, mergeChoice, mergeIncludeRightFactions, mergeIncludeRightNotes]);

  const performMerge = async () => {
    if (!selectedNpc || !mergeCandidate) return;
    try {
      const merged = previewMerged as NPC;

      // Save merged target
      const putResp = await authFetch('/api/data/npcs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      if (!putResp.ok) throw new Error('Failed to save merged NPC');
      // Delete source
      const delResp = await authFetch(`/api/data/npcs?id=${encodeURIComponent(mergeCandidate.id)}`, { method: 'DELETE' });
      if (!delResp.ok) throw new Error('Failed to delete merged-from NPC');
      await queryClient.invalidateQueries({ queryKey: ['/api/data/npcs'] });
      setSelectedNpc(merged);
      setIsMerging(false);
      setMergeWithId("");
      setSuccess('Merged successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to merge NPCs');
    }
  };

  if (loading) {
    return (
      <div className="pt-9 px-12 pb-20">
        <div className="flex items-center justify-center h-50">
          <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
            <span className="grim-flame" />
            Consulting the codex…
          </div>
        </div>
      </div>
    );
  }

  const linkEntities = [
    ...npcs.map(n => ({ id: String(n.id), name: n.name || n.aka || String(n.id), type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...pcs.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
  ];

  return (
    <div className="pt-9 px-12 pb-20">

      {/* Page Header */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Souls</div>
          <h1 className="grim-page-title">The Codex of Souls</h1>
          <p className="grim-page-sub">Tend the register of NPCs — names, factions, and their fates.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pb-1.5">
          <button
            onClick={() => startReview(false)}
            className="grim-btn"
            title="Go item by item"
          >
            Review
          </button>
          {(doneIds.size > 0 || cursorId) && (
            <button
              onClick={() => startReview(true)}
              className="grim-btn is-ember"
              title="Resume where you left off"
            >
              Resume
            </button>
          )}
          {(doneIds.size > 0 || cursorId) && (
            <button
              onClick={resetProgress}
              className="grim-btn is-blood"
              title="Clear review progress"
            >
              Reset
            </button>
          )}
          <button className="grim-btn is-ember" onClick={handleCreate}>+ Inscribe Soul</button>
        </div>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* ── Left: NPC list panel ── */}
        <div>
          {/* Search */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="✦ Search souls…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            />
          </div>

          {/* Count label */}
          <div className="grim-mono text-sm tracking-widest-2 uppercase text-grim-ink-4 mb-1.5 pl-0.5">
            {sortedNpcs.length} {sortedNpcs.length === 1 ? "soul" : "souls"}
          </div>

          {/* List */}
          <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {sortedNpcs.map((npc) => (
                <div
                  key={npc.id}
                  data-npc-id={npc.id}
                  className={`py-3 px-4 cursor-pointer border-b border-grim-line ${selectedNpc?.id === npc.id ? "border-l-2 border-l-grim-ember" : "border-l-2 border-l-transparent"}`}
                  style={{
                    background: selectedNpc?.id === npc.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                  }}
                  onClick={() => handleView(npc)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-head text-lg flex items-center gap-1.5 ${selectedNpc?.id === npc.id ? "text-grim-ember-2" : "text-grim-ink-2"}`} style={{ lineHeight: 1.2 }}>
                        <span>{npc.name || (typeof npc.aka === 'string' ? npc.aka : '')}</span>
                        {npc.hidden && <span title="Hidden from players" className="text-sm text-grim-blood-2 font-mono tracking-widest">HIDDEN</span>}
                        {npc.nameHidden && <span title="Name hidden from players" className="text-sm text-grim-gold-2 font-mono tracking-widest">NAME?</span>}
                      </div>
                      {npc.race && (
                        <div className="grim-mono text-sm text-grim-ink-4 mt-0.5">
                          {npc.race}{npc.status ? ` · ${npc.status}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        className="grim-link text-sm font-head tracking-widest uppercase cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleEdit(npc); }}
                      >
                        edit
                      </a>
                      <a
                        className="text-sm font-head tracking-widest uppercase cursor-pointer text-grim-blood-2 no-underline border-b border-dotted border-grim-blood-2"
                        onClick={(e) => { e.stopPropagation(); handleDelete(npc); }}
                      >
                        del
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Detail / Edit panel ── */}
        <div>
          {/* Review mode controls */}
          {reviewMode && selectedNpc && (
            <div className="flex items-center justify-between mb-3 py-2.5 px-3.5 bg-grim-bg-3 border border-grim-line-2">
              <div className="font-mono text-sm tracking-wider-3 uppercase text-grim-ink-3">
                Reviewing {currentIndex + 1} of {npcs.length} · Done: {doneIds.size}
              </div>
              <div className="flex gap-2">
                <button onClick={markDoneAndNext} className="grim-btn is-ember">✓ Done &amp; Next</button>
                <button onClick={skipToNext} className="grim-btn">Skip</button>
                <button onClick={() => setReviewMode(false)} className="grim-btn is-ghost">Exit</button>
              </div>
            </div>
          )}

          {(isCreating || isEditing) ? (
            /* ── Form ── */
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "Inscribe a New Soul" : "Amend the Record"}</div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Inscribe Soul" : "Save Changes"}`}</button>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <div className="grim-label mb-1.5">Name *</div>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <div className="grim-label mb-1.5">Also Known As</div>
                    <input
                      type="text"
                      value={typeof formData.aka === 'string' ? formData.aka : ""}
                      onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Display Name (shown when name is hidden)</div>
                  <input
                    type="text"
                    value={formData.display_name || ""}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className={fieldClass}
                    placeholder="Public-facing name"
                  />
                </div>

                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div>
                    <div className="grim-label mb-1.5">Race *</div>
                    <input
                      type="text"
                      value={formData.race || ""}
                      onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <div className="grim-label mb-1.5">Gender</div>
                    <select
                      value={formData.gender || ""}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="grim-label mb-1.5">Status</div>
                    <select
                      value={formData.status || "alive"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="alive">Alive</option>
                      <option value="dead">Dead</option>
                      <option value="missing">Missing</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Factions selector */}
                <div className="mb-4">
                  <div className="grim-label mb-1.5">Factions</div>
                  <div className="max-h-40 overflow-y-auto py-2.5 px-3.5 bg-grim-bg-3 border border-grim-line-2 grid gap-y-1.5 gap-x-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {factions.map((f) => {
                      const checked = (formData.factions || []).includes(f.id);
                      return (
                        <label key={f.id} className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(formData.factions || []);
                              if (e.target.checked) next.add(f.id);
                              else next.delete(f.id);
                              setFormData({ ...formData, factions: Array.from(next) });
                            }}
                          />
                          <span>{f.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Location *</div>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Pronunciation</div>
                  <input
                    type="text"
                    value={formData.pronunciation || ""}
                    onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                    className={fieldClass}
                    placeholder="e.g., ah-LAIR-ah"
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Description</div>
                  <MarkdownEditor
                    value={formData.description || ""}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    rows={6}
                    label="Description"
                    linkEntities={linkEntities}
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Background</div>
                  <MarkdownEditor
                    value={formData.background || ""}
                    onChange={(value) => setFormData({ ...formData, background: value })}
                    rows={6}
                    label="Background"
                    linkEntities={linkEntities}
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Roleplaying Notes</div>
                  <MarkdownEditor
                    value={formData.roleplaying_notes || ""}
                    onChange={(value) => setFormData({ ...formData, roleplaying_notes: value })}
                    rows={6}
                    label="Roleplaying Notes"
                    linkEntities={linkEntities}
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">GM Notes</div>
                  <MarkdownEditor
                    value={formData.gm_notes || ""}
                    onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                    rows={6}
                    label="GM Notes"
                    linkEntities={linkEntities}
                  />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Image URL</div>
                  <input
                    type="text"
                    value={formData.image || ""}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className={fieldClass}
                    placeholder="/images/npcs/example.png"
                  />
                </div>

                <div className="flex gap-6 mb-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                    <input
                      type="checkbox"
                      checked={formData.hidden || false}
                      onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                    />
                    <span>Hidden from players</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                    <input
                      type="checkbox"
                      checked={formData.nameHidden || false}
                      onChange={(e) => setFormData({ ...formData, nameHidden: e.target.checked })}
                    />
                    <span>Name hidden</span>
                  </label>
                </div>

                <hr className="grim-rule" />

                <div className="flex items-center justify-end gap-2.5">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">
                    ✕ Cancel
                  </button>
                  <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                    {isSaving ? "Saving…" : `✓ ${isCreating ? "Inscribe Soul" : "Save Changes"}`}
                  </button>
                </div>
              </form>
            </div>

          ) : selectedNpc ? (
            /* ── Detail view ── */
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-5xl text-grim-gold leading-none mb-1.5">
                    {selectedNpc.name || String(selectedNpc.aka || "")}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className={statusChipClass(selectedNpc.status)}>{selectedNpc.status || "unknown"}</span>
                    {selectedNpc.race && <span className="grim-chip">{selectedNpc.race}</span>}
                    {selectedNpc.hidden && <span className="grim-chip is-blood">Hidden</span>}
                    {selectedNpc.nameHidden && <span className="grim-chip is-ember">Name Hidden</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(selectedNpc)} className="grim-btn">✎ Edit</button>
                  <button onClick={() => { setIsMerging(true); setMergeWithId(""); }} className="grim-btn is-arcane border-grim-arcane" style={{ background: "linear-gradient(180deg, oklch(0.35 0.12 285), oklch(0.25 0.08 290))", color: "oklch(0.95 0.02 80)" }}>Merge</button>
                  <button onClick={() => handleDelete(selectedNpc)} className="grim-btn is-blood">✕ Delete</button>
                </div>
              </div>

              <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {/* Left column: attributes */}
                <div>
                  <h3 className="grim-h-section" style={{ marginBottom: 10 }}>Basic Info</h3>
                  <div className="grim-stack" style={{ gap: 8 }}>
                    {selectedNpc.name && (
                      <div>
                        <span className="grim-label">Name </span>
                        <span className="font-body text-xl text-grim-ink">{selectedNpc.name}</span>
                      </div>
                    )}
                    {selectedNpc.aka && (
                      <div>
                        <span className="grim-label">AKA </span>
                        <span className="font-body text-xl text-grim-ink-2">{String(selectedNpc.aka)}</span>
                      </div>
                    )}
                    {selectedNpc.pronunciation && (
                      <div>
                        <span className="grim-label">Pronunciation </span>
                        <span className="font-mono text-lg text-grim-ink-3">{selectedNpc.pronunciation}</span>
                      </div>
                    )}
                    {selectedNpc.gender && (
                      <div>
                        <span className="grim-label">Gender </span>
                        <span className="font-body text-xl text-grim-ink-2">{selectedNpc.gender}</span>
                      </div>
                    )}
                    {selectedNpc.location && (
                      <div>
                        <span className="grim-label">Location </span>
                        <span className="font-body text-xl text-grim-ink-2">{selectedNpc.location}</span>
                      </div>
                    )}
                  </div>

                  {selectedNpc.factions && selectedNpc.factions.length > 0 && (
                    <div className="mt-4.5">
                      <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Factions</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNpc.factions.map((faction, index) => (
                          <span key={index} className="grim-chip is-faction">{getFactionName(faction)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column: image */}
                <div>
                  {selectedNpc.image ? (
                    <div>
                      <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Portrait</h3>
                      <Image
                        src={selectedNpc.image}
                        alt={selectedNpc.name || 'NPC'}
                        width={128}
                        height={128}
                        className="w-32 h-32 object-cover border border-grim-line-2"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center border border-grim-line bg-grim-bg-3 font-display text-5xl text-grim-ink-4">
                      ☥
                    </div>
                  )}
                </div>
              </div>

              {selectedNpc.description && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Description</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.description || '', true) }} />
                </div>
              )}

              {selectedNpc.background && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Background</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.background || '', true) }} />
                </div>
              )}

              {selectedNpc.roleplaying_notes && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Roleplaying Notes</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.roleplaying_notes || '', true) }} />
                </div>
              )}
            </div>

          ) : (
            /* ── Empty state ── */
            <div className="grim-tome text-center" style={{ padding: "60px 24px" }}>
              <div className="font-display text-5xl text-grim-ink-3 mb-3">☥</div>
              <div className="font-head text-xl tracking-widest uppercase text-grim-ink-2 mb-2">No soul selected</div>
              <div className="text-grim-ink-4 text-lg">Select a soul from the register to view, or inscribe a new one.</div>
            </div>
          )}

          {/* ── Merge Modal ── */}
          {isMerging && selectedNpc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "oklch(0 0 0 / 0.65)" }}>
              <div className="grim-tome w-full m-4 overflow-y-auto" style={{ maxWidth: 900, maxHeight: "90vh" }}>
                <div className="grim-tome-head">
                  <div className="grim-tome-title">Merge Souls</div>
                  <button onClick={() => setIsMerging(false)} className="grim-btn is-ghost">✕ Close</button>
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Merge &ldquo;{selectedNpc.name}&rdquo; with:</div>
                  <select
                    value={mergeWithId}
                    onChange={(e) => setMergeWithId(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select NPC…</option>
                    {npcs.filter(n => n.id !== selectedNpc.id).map(n => (
                      <option key={n.id} value={n.id}>{n.name || n.id}</option>
                    ))}
                  </select>
                </div>

                {mergeCandidate && (
                  <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                    {/* Keep (left) */}
                    <div className="bg-grim-bg-3 border border-grim-line-2 p-3.5">
                      <div className="grim-label mb-2">Keep</div>
                      <dl className="flex flex-col gap-1 text-lg font-body text-grim-ink-2">
                        <dt className="grim-label">Name</dt><dd className="m-0 text-grim-ink">{selectedNpc.name}</dd>
                        <dt className="grim-label">AKA</dt><dd className="m-0 text-grim-ink">{String(selectedNpc.aka || "")}</dd>
                        <dt className="grim-label">Pronunciation</dt><dd className="m-0 text-grim-ink">{selectedNpc.pronunciation}</dd>
                        <dt className="grim-label">Race</dt><dd className="m-0 text-grim-ink">{selectedNpc.race}</dd>
                        <dt className="grim-label">Gender</dt><dd className="m-0 text-grim-ink">{selectedNpc.gender}</dd>
                        <dt className="grim-label">Location</dt><dd className="m-0 text-grim-ink">{selectedNpc.location}</dd>
                        <dt className="grim-label">Status</dt><dd className="m-0 text-grim-ink">{selectedNpc.status}</dd>
                        <dt className="grim-label">Description</dt><dd className="m-0 text-grim-ink whitespace-pre-wrap overflow-hidden max-h-15">{selectedNpc.description}</dd>
                        <dt className="grim-label">Factions</dt><dd className="m-0 text-grim-ink">{(selectedNpc.factions||[]).map(getFactionName).join(', ')}</dd>
                      </dl>
                    </div>

                    {/* Per-field chooser */}
                    <div className="bg-grim-bg-3 border border-grim-ember p-3.5">
                      <div className="grim-label mb-2">Choose Per Field</div>
                      <div className="flex flex-col gap-2 text-lg">
                        {[
                          ['name','Name'],
                          ['aka','AKA'],
                          ['pronunciation','Pronunciation'],
                          ['race','Race'],
                          ['gender','Gender'],
                          ['location','Location'],
                          ['status','Status'],
                          ['description','Description'],
                          ['background','Background'],
                          ['roleplaying_notes','Roleplaying Notes'],
                          ['image','Image URL'],
                        ].map(([key, label]) => (
                          <div key={key as string} className="flex items-center justify-between gap-2">
                            <span className="text-grim-ink-3 font-mono text-sm tracking-wider-2 uppercase min-w-20">{label as string}</span>
                            <div className="flex gap-2.5">
                              <label className="inline-flex items-center gap-1 cursor-pointer font-body text-lg text-grim-ink-2">
                                <input
                                  type="radio"
                                  name={`merge-${key}`}
                                  checked={(mergeChoice[key as string] || 'left') === 'left'}
                                  onChange={() => setMergeChoice(prev => ({...prev, [key as string]: 'left'}))}
                                />
                                <span>Keep</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer font-body text-lg text-grim-ink-2">
                                <input
                                  type="radio"
                                  name={`merge-${key}`}
                                  checked={(mergeChoice[key as string] || 'left') === 'right'}
                                  onChange={() => setMergeChoice(prev => ({...prev, [key as string]: 'right'}))}
                                />
                                <span>Other</span>
                              </label>
                            </div>
                          </div>
                        ))}
                        <hr className="grim-rule mx-0 my-1" />
                        <label className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                          <input type="checkbox" checked={mergeIncludeRightFactions} onChange={(e) => setMergeIncludeRightFactions(e.target.checked)} />
                          <span>Include factions from other</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                          <input type="checkbox" checked={mergeIncludeRightNotes} onChange={(e) => setMergeIncludeRightNotes(e.target.checked)} />
                          <span>Include notes from other</span>
                        </label>
                      </div>
                    </div>

                    {/* Merge from (right) */}
                    <div className="bg-grim-bg-3 border border-grim-line-2 p-3.5">
                      <div className="grim-label mb-2">Merge From</div>
                      <dl className="flex flex-col gap-1 text-lg font-body text-grim-ink-2">
                        <dt className="grim-label">Name</dt><dd className="m-0 text-grim-ink">{mergeCandidate.name}</dd>
                        <dt className="grim-label">AKA</dt><dd className="m-0 text-grim-ink">{String(mergeCandidate.aka || "")}</dd>
                        <dt className="grim-label">Pronunciation</dt><dd className="m-0 text-grim-ink">{mergeCandidate.pronunciation}</dd>
                        <dt className="grim-label">Race</dt><dd className="m-0 text-grim-ink">{mergeCandidate.race}</dd>
                        <dt className="grim-label">Gender</dt><dd className="m-0 text-grim-ink">{mergeCandidate.gender}</dd>
                        <dt className="grim-label">Location</dt><dd className="m-0 text-grim-ink">{mergeCandidate.location}</dd>
                        <dt className="grim-label">Status</dt><dd className="m-0 text-grim-ink">{mergeCandidate.status}</dd>
                        <dt className="grim-label">Description</dt><dd className="m-0 text-grim-ink whitespace-pre-wrap overflow-hidden max-h-15">{mergeCandidate.description}</dd>
                        <dt className="grim-label">Factions</dt><dd className="m-0 text-grim-ink">{(mergeCandidate.factions||[]).map(getFactionName).join(', ')}</dd>
                      </dl>
                    </div>
                  </div>
                )}

                {previewMerged && (
                  <div className="mt-3.5 py-3 px-4 bg-grim-bg-3 border border-grim-gold-2">
                    <div className="grim-label mb-1.5">Preview</div>
                    <div className="font-body text-lg text-grim-ink-2 flex flex-col gap-1">
                      <div><span className="text-grim-ink-4">Name: </span>{previewMerged.name}</div>
                      {previewMerged.aka && <div><span className="text-grim-ink-4">AKA: </span>{String(previewMerged.aka)}</div>}
                      <div><span className="text-grim-ink-4">Race: </span>{previewMerged.race} · <span className="text-grim-ink-4">Gender: </span>{previewMerged.gender}</div>
                      <div><span className="text-grim-ink-4">Location: </span>{previewMerged.location} · <span className="text-grim-ink-4">Status: </span>{previewMerged.status}</div>
                      {previewMerged.description && <div className="overflow-hidden max-h-10 text-grim-ink-3">{previewMerged.description}</div>}
                      <div><span className="text-grim-ink-4">Factions: </span>{(previewMerged.factions||[]).map(getFactionName).join(', ')}</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4 gap-2.5">
                  <button onClick={() => setIsMerging(false)} className="grim-btn is-ghost">Cancel</button>
                  <button
                    disabled={!mergeCandidate}
                    onClick={performMerge}
                    className={`grim-btn is-ember ${!mergeCandidate ? "opacity-45" : "opacity-100"}`}
                  >
                    ✓ Confirm Merge (keep left, absorb right)
                  </button>
                </div>
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
