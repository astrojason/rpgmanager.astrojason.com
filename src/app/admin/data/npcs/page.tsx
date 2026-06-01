"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { NPC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  padding: "9px 14px",
  outline: "none",
};

function statusChipClass(status: string | undefined): string {
  if (!status) return "grim-chip is-unknown";
  if (status === "alive") return "grim-chip is-alive";
  if (status === "dead" || status === "deceased") return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

export default function NPCsManagementPage() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeWithId, setMergeWithId] = useState<string>("");
  const [mergeChoice, setMergeChoice] = useState<Record<string, 'left' | 'right'>>({});
  const [mergeIncludeRightFactions, setMergeIncludeRightFactions] = useState(true);
  const [mergeIncludeRightNotes, setMergeIncludeRightNotes] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<NPC>>({});

  // Load NPCs data
  useEffect(() => {
    loadNpcs();
  }, []);

  const loadNpcs = async () => {
    setLoading(true);
    try {
      const [npcsRes, factionsRes] = await Promise.all([
        authFetch('/api/data/npcs'),
        authFetch('/api/data/factions'),
      ]);
      if (!npcsRes.ok) throw new Error('Failed to load NPCs');
      if (!factionsRes.ok) throw new Error('Failed to load factions');
      const [npcsData, factionsData] = await Promise.all([
        npcsRes.json(),
        factionsRes.json(),
      ]);
      setNpcs(Array.isArray(npcsData) ? npcsData : []);
      setFactions(Array.isArray(factionsData) ? factionsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NPCs');
    } finally {
      setLoading(false);
    }
  };

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
    } catch {}
  }, []);

  const persistProgress = (nextDone: Set<string>, nextCursorId: string | null) => {
    try {
      localStorage.setItem('npcReviewDoneIds', JSON.stringify(Array.from(nextDone)));
      if (nextCursorId) localStorage.setItem('npcReviewCursorId', nextCursorId);
      else localStorage.removeItem('npcReviewCursorId');
    } catch {}
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

  // Keyboard navigation: ArrowDown selects next, ArrowUp selects previous
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = (el as HTMLElement);
      const editable = node.closest('input, textarea, select, [contenteditable="true"]');
      return !!editable;
    };

    const moveSelection = (delta: number) => {
      if (sortedNpcs.length === 0) return;
      // Determine current index within the sorted list
      const idx = selectedNpc ? sortedNpcs.findIndex(n => n.id === selectedNpc.id) : -1;
      if (idx === -1) {
        // If nothing selected, pick first/last depending on direction
        const nextIdx = delta > 0 ? 0 : sortedNpcs.length - 1;
        const next = sortedNpcs[nextIdx];
        if (next) {
          setSelectedNpc(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          // Scroll into view in the list panel
          setTimeout(() => {
            document.querySelector(`[data-npc-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= sortedNpcs.length) return; // clamp, no wrap
      const next = sortedNpcs[nextIdx];
      if (!next) return;
      setSelectedNpc(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-npc-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return; // don't hijack typing in inputs
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sortedNpcs, selectedNpc, setSelectedNpc, setIsEditing, setIsCreating]);

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
    setIsCreating(true);
    setIsEditing(false);
    setSelectedNpc(null);
    setFormData({
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

  const handleEdit = (npc: NPC) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedNpc(npc);
    setFormData({ ...npc });
  };

  const handleView = (npc: NPC) => {
    setSelectedNpc(npc);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.race || !formData.location) {
        setError("Please fill in all required fields (Name, Race, Location)");
        return;
      }

      const npcData = formData as NPC;

      let updatedNpcs;
      if (isCreating) {
        // Create via API
        const response = await authFetch('/api/data/npcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData),
        });
        if (!response.ok) throw new Error('Failed to create NPC');
        const re = await authFetch('/api/data/npcs');
        updatedNpcs = await re.json();
        setSuccess("NPC created successfully!");
      } else {
        const response = await authFetch('/api/data/npcs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData),
        });
        if (!response.ok) throw new Error('Failed to update NPC');
        const re = await authFetch('/api/data/npcs');
        updatedNpcs = await re.json();
        setSuccess("NPC updated successfully!");
      }

      setNpcs(updatedNpcs);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedNpc(npcData);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save NPC");
    }
  };

  const handleDelete = async (npc: NPC) => {
    if (!confirm(`Are you sure you want to delete ${npc.name}?`)) return;

    try {
      const resp = await authFetch(`/api/data/npcs?id=${encodeURIComponent(npc.id)}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete NPC');
      const re = await authFetch('/api/data/npcs');
      const updatedNpcs = await re.json();
      setNpcs(updatedNpcs);
      setSelectedNpc(null);
      setSuccess("NPC deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete NPC");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  // Review mode actions
  const startReview = (resume = false) => {
    setReviewMode(true);
    const next = resume ? getNextUnreviewed(cursorId) : getNextUnreviewed(null);
    if (next) {
      setSelectedNpc(next);
      setFormData({ ...next });
      setIsEditing(true);
      setIsCreating(false);
      setCursorId(next.id);
      persistProgress(doneIds, next.id);
    } else {
      setSelectedNpc(null);
      setIsEditing(false);
    }
  };
  const markDoneAndNext = () => {
    if (!selectedNpc) return;
    const nextDone = new Set(doneIds);
    nextDone.add(selectedNpc.id);
    setDoneIds(nextDone);
    const next = getNextUnreviewed(selectedNpc.id);
    if (next) {
      setSelectedNpc(next);
      setFormData({ ...next });
      setIsEditing(true);
      setIsCreating(false);
      setCursorId(next.id);
      persistProgress(nextDone, next.id);
    } else {
      setCursorId(null);
      persistProgress(nextDone, null);
      setReviewMode(false);
      setIsEditing(false);
      setSelectedNpc(null);
      setSuccess('Review complete!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };
  const skipToNext = () => {
    if (!selectedNpc) return;
    const next = getNextUnreviewed(selectedNpc.id);
    if (next) {
      setSelectedNpc(next);
      setFormData({ ...next });
      setIsEditing(true);
      setIsCreating(false);
      setCursorId(next.id);
      persistProgress(doneIds, next.id);
    } else {
      setReviewMode(false);
      setIsEditing(false);
      setSelectedNpc(null);
    }
  };
  const resetProgress = () => {
    setDoneIds(new Set());
    setCursorId(null);
    try {
      localStorage.removeItem('npcReviewDoneIds');
      localStorage.removeItem('npcReviewCursorId');
    } catch {}
    setSuccess('Review progress reset');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Merge helpers
  const mergeCandidate = useMemo(() => npcs.find(n => n.id === mergeWithId) || null, [mergeWithId, npcs]);
  useEffect(() => {
    if (!selectedNpc || !mergeCandidate) return;
    const init: Record<string, 'left' | 'right'> = {};
    const fields: (keyof NPC)[] = ['name','aka','pronunciation','race','gender','location','status','description','background','personality','image'];
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
    const fields: (keyof NPC)[] = ['name','aka','pronunciation','race','gender','location','status','description','background','personality','image'];
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
      // Reload
      const re = await authFetch('/api/data/npcs');
      const updated = await re.json();
      setNpcs(updated);
      const fresh = updated.find((n: NPC) => n.id === merged.id) || merged;
      setSelectedNpc(fresh);
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
      <div style={{ padding: "36px 48px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
            <span className="grim-flame" />
            Consulting the codex…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Page Header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Souls</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Codex of Souls</h1>
          <p className="grim-page-sub">Tend the register of NPCs — names, factions, and their fates.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingBottom: 6 }}>
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
      {error && (
        <div style={{ background: "oklch(0.25 0.12 22 / 0.4)", border: "1px solid var(--grim-blood-2)", color: "oklch(0.85 0.08 30)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "oklch(0.25 0.10 145 / 0.4)", border: "1px solid oklch(0.55 0.090 145)", color: "var(--grim-moss)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 14 }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* ── Left: NPC list panel ── */}
        <div>
          {/* Search */}
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="✦ Search souls…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "10px 14px", outline: "none" }}
            />
          </div>

          {/* Count label */}
          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-4)", marginBottom: 6, paddingLeft: 2 }}>
            {sortedNpcs.length} {sortedNpcs.length === 1 ? "soul" : "souls"}
          </div>

          {/* List */}
          <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
              {sortedNpcs.map((npc) => (
                <div
                  key={npc.id}
                  data-npc-id={npc.id}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: selectedNpc?.id === npc.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                    borderLeft: "2px solid " + (selectedNpc?.id === npc.id ? "var(--grim-ember)" : "transparent"),
                    borderBottom: "1px solid var(--grim-line)",
                  }}
                  onClick={() => handleView(npc)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: selectedNpc?.id === npc.id ? "var(--grim-ember-2)" : "var(--grim-ink-2)", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{npc.name || (typeof npc.aka === 'string' ? npc.aka : '')}</span>
                        {npc.hidden && <span title="Hidden from players" style={{ fontSize: 10, color: "var(--grim-blood-2)", fontFamily: "var(--font-mono)", letterSpacing: ".10em" }}>HIDDEN</span>}
                        {npc.nameHidden && <span title="Name hidden from players" style={{ fontSize: 10, color: "var(--grim-gold-2)", fontFamily: "var(--font-mono)", letterSpacing: ".10em" }}>NAME?</span>}
                      </div>
                      {npc.race && (
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 2 }}>
                          {npc.race}{npc.status ? ` · ${npc.status}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <a
                        className="grim-link"
                        style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); handleEdit(npc); }}
                      >
                        edit
                      </a>
                      <a
                        style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer", color: "var(--grim-blood-2)", textDecoration: "none", borderBottom: "1px dotted var(--grim-blood-2)" }}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "10px 14px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--grim-ink-3)" }}>
                Reviewing {currentIndex + 1} of {npcs.length} · Done: {doneIds.size}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
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
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Name *</div>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={fieldStyle}
                      required
                    />
                  </div>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Also Known As</div>
                    <input
                      type="text"
                      value={typeof formData.aka === 'string' ? formData.aka : ""}
                      onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Display Name (shown when name is hidden)</div>
                  <input
                    type="text"
                    value={formData.display_name || ""}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    style={fieldStyle}
                    placeholder="Public-facing name"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Race *</div>
                    <input
                      type="text"
                      value={formData.race || ""}
                      onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                      style={fieldStyle}
                      required
                    />
                  </div>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Gender</div>
                    <select
                      value={formData.gender || ""}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      style={fieldStyle}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Status</div>
                    <select
                      value={formData.status || "alive"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={fieldStyle}
                    >
                      <option value="alive">Alive</option>
                      <option value="dead">Dead</option>
                      <option value="missing">Missing</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Factions selector */}
                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Factions</div>
                  <div style={{ maxHeight: 160, overflowY: "auto", padding: "10px 14px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                    {factions.map((f) => {
                      const checked = (formData.factions || []).includes(f.id);
                      return (
                        <label key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)" }}>
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

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Location *</div>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={fieldStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Pronunciation</div>
                  <input
                    type="text"
                    value={formData.pronunciation || ""}
                    onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                    style={fieldStyle}
                    placeholder="e.g., ah-LAIR-ah"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Description</div>
                  <MarkdownEditor
                    value={formData.description || ""}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    rows={6}
                    label="Description"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Background</div>
                  <MarkdownEditor
                    value={formData.background || ""}
                    onChange={(value) => setFormData({ ...formData, background: value })}
                    rows={6}
                    label="Background"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Personality</div>
                  <MarkdownEditor
                    value={formData.personality || ""}
                    onChange={(value) => setFormData({ ...formData, personality: value })}
                    rows={6}
                    label="Personality"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>GM Notes</div>
                  <MarkdownEditor
                    value={formData.gm_notes || ""}
                    onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                    rows={6}
                    label="GM Notes"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Image URL</div>
                  <input
                    type="text"
                    value={formData.image || ""}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    style={fieldStyle}
                    placeholder="/images/npcs/example.png"
                  />
                </div>

                <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)" }}>
                    <input
                      type="checkbox"
                      checked={formData.hidden || false}
                      onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                    />
                    <span>Hidden from players</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)" }}>
                    <input
                      type="checkbox"
                      checked={formData.nameHidden || false}
                      onChange={(e) => setFormData({ ...formData, nameHidden: e.target.checked })}
                    />
                    <span>Name hidden</span>
                  </label>
                </div>

                <hr className="grim-rule" />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">
                    ✕ Cancel
                  </button>
                  <button type="submit" className="grim-btn is-ember">
                    ✓ {isCreating ? "Inscribe Soul" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

          ) : selectedNpc ? (
            /* ── Detail view ── */
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-gold)", lineHeight: 1, marginBottom: 6 }}>
                    {selectedNpc.name || String(selectedNpc.aka || "")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <span className={statusChipClass(selectedNpc.status)}>{selectedNpc.status || "unknown"}</span>
                    {selectedNpc.race && <span className="grim-chip">{selectedNpc.race}</span>}
                    {selectedNpc.hidden && <span className="grim-chip is-blood">Hidden</span>}
                    {selectedNpc.nameHidden && <span className="grim-chip is-ember">Name Hidden</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(selectedNpc)} className="grim-btn">✎ Edit</button>
                  <button onClick={() => { setIsMerging(true); setMergeWithId(""); }} className="grim-btn is-arcane" style={{ background: "linear-gradient(180deg, oklch(0.35 0.12 285), oklch(0.25 0.08 290))", borderColor: "var(--grim-arcane)", color: "oklch(0.95 0.02 80)" }}>Merge</button>
                  <button onClick={() => handleDelete(selectedNpc)} className="grim-btn is-blood">✕ Delete</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Left column: attributes */}
                <div>
                  <h3 className="grim-h-section" style={{ marginBottom: 10 }}>Basic Info</h3>
                  <div className="grim-stack" style={{ gap: 8 }}>
                    {selectedNpc.name && (
                      <div>
                        <span className="grim-label">Name </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink)" }}>{selectedNpc.name}</span>
                      </div>
                    )}
                    {selectedNpc.aka && (
                      <div>
                        <span className="grim-label">AKA </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-2)" }}>{String(selectedNpc.aka)}</span>
                      </div>
                    )}
                    {selectedNpc.pronunciation && (
                      <div>
                        <span className="grim-label">Pronunciation </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--grim-ink-3)" }}>{selectedNpc.pronunciation}</span>
                      </div>
                    )}
                    {selectedNpc.gender && (
                      <div>
                        <span className="grim-label">Gender </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-2)" }}>{selectedNpc.gender}</span>
                      </div>
                    )}
                    {selectedNpc.location && (
                      <div>
                        <span className="grim-label">Location </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-2)" }}>{selectedNpc.location}</span>
                      </div>
                    )}
                  </div>

                  {selectedNpc.factions && selectedNpc.factions.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Factions</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
                        style={{ width: 128, height: 128, objectFit: "cover", border: "1px solid var(--grim-line-2)" }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: 128, height: 128, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--grim-line)", background: "var(--grim-bg-3)", fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-4)" }}>
                      ☥
                    </div>
                  )}
                </div>
              </div>

              {selectedNpc.description && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Description</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.description || '', true) }} />
                </div>
              )}

              {selectedNpc.background && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Background</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.background || '', true) }} />
                </div>
              )}

              {selectedNpc.personality && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Personality</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.personality || '', true) }} />
                </div>
              )}
            </div>

          ) : (
            /* ── Empty state ── */
            <div className="grim-tome" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ink-3)", marginBottom: 12 }}>☥</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No soul selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: 14 }}>Select a soul from the register to view, or inscribe a new one.</div>
            </div>
          )}

          {/* ── Merge Modal ── */}
          {isMerging && selectedNpc && (
            <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "oklch(0 0 0 / 0.65)" }}>
              <div className="grim-tome" style={{ width: "100%", maxWidth: 900, margin: 16, maxHeight: "90vh", overflowY: "auto" }}>
                <div className="grim-tome-head">
                  <div className="grim-tome-title">Merge Souls</div>
                  <button onClick={() => setIsMerging(false)} className="grim-btn is-ghost">✕ Close</button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Merge &ldquo;{selectedNpc.name}&rdquo; with:</div>
                  <select
                    value={mergeWithId}
                    onChange={(e) => setMergeWithId(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="">Select NPC…</option>
                    {npcs.filter(n => n.id !== selectedNpc.id).map(n => (
                      <option key={n.id} value={n.id}>{n.name || n.id}</option>
                    ))}
                  </select>
                </div>

                {mergeCandidate && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {/* Keep (left) */}
                    <div style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", padding: 14 }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Keep</div>
                      <dl style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--grim-ink-2)" }}>
                        <dt className="grim-label">Name</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.name}</dd>
                        <dt className="grim-label">AKA</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{String(selectedNpc.aka || "")}</dd>
                        <dt className="grim-label">Pronunciation</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.pronunciation}</dd>
                        <dt className="grim-label">Race</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.race}</dd>
                        <dt className="grim-label">Gender</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.gender}</dd>
                        <dt className="grim-label">Location</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.location}</dd>
                        <dt className="grim-label">Status</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{selectedNpc.status}</dd>
                        <dt className="grim-label">Description</dt><dd style={{ margin: 0, color: "var(--grim-ink)", whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: 60 }}>{selectedNpc.description}</dd>
                        <dt className="grim-label">Factions</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{(selectedNpc.factions||[]).map(getFactionName).join(', ')}</dd>
                      </dl>
                    </div>

                    {/* Per-field chooser */}
                    <div style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-ember)", padding: 14 }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Choose Per Field</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
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
                          ['personality','Personality'],
                          ['image','Image URL'],
                        ].map(([key, label]) => (
                          <div key={key as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", minWidth: 80 }}>{label as string}</span>
                            <div style={{ display: "flex", gap: 10 }}>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                                <input
                                  type="radio"
                                  name={`merge-${key}`}
                                  checked={(mergeChoice[key as string] || 'left') === 'left'}
                                  onChange={() => setMergeChoice(prev => ({...prev, [key as string]: 'left'}))}
                                />
                                <span>Keep</span>
                              </label>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
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
                        <hr className="grim-rule" style={{ margin: "4px 0" }} />
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                          <input type="checkbox" checked={mergeIncludeRightFactions} onChange={(e) => setMergeIncludeRightFactions(e.target.checked)} />
                          <span>Include factions from other</span>
                        </label>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                          <input type="checkbox" checked={mergeIncludeRightNotes} onChange={(e) => setMergeIncludeRightNotes(e.target.checked)} />
                          <span>Include notes from other</span>
                        </label>
                      </div>
                    </div>

                    {/* Merge from (right) */}
                    <div style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", padding: 14 }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Merge From</div>
                      <dl style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--grim-ink-2)" }}>
                        <dt className="grim-label">Name</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.name}</dd>
                        <dt className="grim-label">AKA</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{String(mergeCandidate.aka || "")}</dd>
                        <dt className="grim-label">Pronunciation</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.pronunciation}</dd>
                        <dt className="grim-label">Race</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.race}</dd>
                        <dt className="grim-label">Gender</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.gender}</dd>
                        <dt className="grim-label">Location</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.location}</dd>
                        <dt className="grim-label">Status</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{mergeCandidate.status}</dd>
                        <dt className="grim-label">Description</dt><dd style={{ margin: 0, color: "var(--grim-ink)", whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: 60 }}>{mergeCandidate.description}</dd>
                        <dt className="grim-label">Factions</dt><dd style={{ margin: 0, color: "var(--grim-ink)" }}>{(mergeCandidate.factions||[]).map(getFactionName).join(', ')}</dd>
                      </dl>
                    </div>
                  </div>
                )}

                {previewMerged && (
                  <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-gold-2)" }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Preview</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div><span style={{ color: "var(--grim-ink-4)" }}>Name: </span>{previewMerged.name}</div>
                      {previewMerged.aka && <div><span style={{ color: "var(--grim-ink-4)" }}>AKA: </span>{String(previewMerged.aka)}</div>}
                      <div><span style={{ color: "var(--grim-ink-4)" }}>Race: </span>{previewMerged.race} · <span style={{ color: "var(--grim-ink-4)" }}>Gender: </span>{previewMerged.gender}</div>
                      <div><span style={{ color: "var(--grim-ink-4)" }}>Location: </span>{previewMerged.location} · <span style={{ color: "var(--grim-ink-4)" }}>Status: </span>{previewMerged.status}</div>
                      {previewMerged.description && <div style={{ overflow: "hidden", maxHeight: 40, color: "var(--grim-ink-3)" }}>{previewMerged.description}</div>}
                      <div><span style={{ color: "var(--grim-ink-4)" }}>Factions: </span>{(previewMerged.factions||[]).map(getFactionName).join(', ')}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
                  <button onClick={() => setIsMerging(false)} className="grim-btn is-ghost">Cancel</button>
                  <button
                    disabled={!mergeCandidate}
                    onClick={performMerge}
                    className="grim-btn is-ember"
                    style={{ opacity: !mergeCandidate ? 0.45 : 1 }}
                  >
                    ✓ Confirm Merge (keep left, absorb right)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
