"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { NPC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

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
      const resp = await fetch(`/api/data/npcs?id=${encodeURIComponent(npc.id)}`, { method: 'DELETE' });
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
      const delResp = await fetch(`/api/data/npcs?id=${encodeURIComponent(mergeCandidate.id)}`, { method: 'DELETE' });
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading NPCs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            NPCs Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage non-player characters, merchants, and quest givers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startReview(false)}
            className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 transition-colors"
            title="Go item by item"
          >
            Review
          </button>
          {(doneIds.size > 0 || cursorId) && (
            <button
              onClick={() => startReview(true)}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              title="Resume where you left off"
            >
              Resume
            </button>
          )}
          {(doneIds.size > 0 || cursorId) && (
            <button
              onClick={resetProgress}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              title="Clear review progress"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create NPC
          </button>
        </div>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NPCs List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                NPCs ({sortedNpcs.length})
              </h2>
              <input
                type="text"
                placeholder="Search NPCs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {sortedNpcs.map((npc) => (
                  <div
                    key={npc.id}
                    data-npc-id={npc.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNpc?.id === npc.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(npc)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <span>{npc.name || (typeof npc.aka === 'string' ? npc.aka : '')}</span>
                          {npc.hidden && (
                            <EyeSlashIcon
                              className="w-4 h-4 text-red-500"
                              title="Hidden from players"
                            />
                          )}
                          {npc.nameHidden && (
                            <TagIcon
                              className="w-4 h-4 text-yellow-500"
                              title="Name hidden from players"
                            />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {npc.race} • {npc.location}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Status: {npc.status}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(npc);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(npc);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail/Edit Panel */}
        <div className="lg:col-span-2">
          {/* Review mode controls */}
          {reviewMode && selectedNpc && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <div className="text-gray-600 dark:text-gray-400">Reviewing {currentIndex + 1} of {npcs.length} • Done: {doneIds.size}</div>
              <div className="flex gap-2">
                <button onClick={markDoneAndNext} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Mark Done & Next</button>
                <button onClick={skipToNext} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Skip</button>
                <button onClick={() => setReviewMode(false)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Exit</button>
              </div>
            </div>
          )}
          {(isCreating || isEditing) ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCreating ? "Create New NPC" : "Edit NPC"}
                </h2>
              </div>
              <div className="p-6">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Also Known As
                      </label>
                      <input
                        type="text"
                        value={typeof formData.aka === 'string' ? formData.aka : ""}
                        onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name (shown when name is hidden)
                    </label>
                    <input
                      type="text"
                      value={formData.display_name || ""}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Public-facing name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Race *
                      </label>
                      <input
                        type="text"
                        value={formData.race || ""}
                        onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender || ""}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status || "alive"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="alive">Alive</option>
                        <option value="dead">Dead</option>
                        <option value="missing">Missing</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  {/* Factions selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Factions
                    </label>
                    <div className="mt-1 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {factions.map((f) => {
                        const checked = (formData.factions || []).includes(f.id);
                        return (
                          <label key={f.id} className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(formData.factions || []);
                                if (e.target.checked) next.add(f.id);
                                else next.delete(f.id);
                                setFormData({ ...formData, factions: Array.from(next) });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{f.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pronunciation
                    </label>
                    <input
                      type="text"
                      value={formData.pronunciation || ""}
                      onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., ah-LAIR-ah"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background</label>
                    <MarkdownEditor
                      value={formData.background || ""}
                      onChange={(value) => setFormData({ ...formData, background: value })}
                      rows={6}
                      label="Background"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personality</label>
                    <MarkdownEditor
                      value={formData.personality || ""}
                      onChange={(value) => setFormData({ ...formData, personality: value })}
                      rows={6}
                      label="Personality"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={6}
                      label="GM Notes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="/images/npcs/example.png"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.hidden || false}
                        onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hidden from players</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.nameHidden || false}
                        onChange={(e) => setFormData({ ...formData, nameHidden: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Name hidden</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {isCreating ? "Create NPC" : "Update NPC"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedNpc ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{selectedNpc.name || String(selectedNpc.aka || "")}</span>
                    {selectedNpc.hidden && (
                      <EyeSlashIcon
                        className="w-5 h-5 text-red-500"
                        title="Hidden from players"
                      />
                    )}
                    {selectedNpc.nameHidden && (
                      <TagIcon
                        className="w-5 h-5 text-yellow-500"
                        title="Name hidden from players"
                      />
                    )}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedNpc)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setIsMerging(true); setMergeWithId(""); }}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Merge
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNpc)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Basic Info</h3>
                      <div className="mt-2 space-y-2">
                        <p><span className="font-medium">Name:</span> {selectedNpc.name}</p>
                        {selectedNpc.aka && <p><span className="font-medium">AKA:</span> {selectedNpc.aka}</p>}
                        {selectedNpc.pronunciation && <p><span className="font-medium">Pronunciation:</span> {selectedNpc.pronunciation}</p>}
                        <p><span className="font-medium">Race:</span> {selectedNpc.race}</p>
                        <p><span className="font-medium">Gender:</span> {selectedNpc.gender}</p>
                        <p><span className="font-medium">Location:</span> {selectedNpc.location}</p>
                        <p><span className="font-medium">Status:</span> <span className={`capitalize ${selectedNpc.status === 'alive' ? 'text-green-600' : selectedNpc.status === 'dead' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedNpc.status}</span></p>
                      </div>
                    </div>
                    
                    {selectedNpc.factions && selectedNpc.factions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Factions</h3>
                        <div className="mt-2">
                          {selectedNpc.factions.map((faction, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                              {getFactionName(faction)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {selectedNpc.image && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Image</h3>
                        <Image 
                          src={selectedNpc.image} 
                          alt={selectedNpc.name || 'NPC'}
                          width={128}
                          height={128}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedNpc.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.description || '', true) }} />
                  </div>
                )}
                
                {selectedNpc.background && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Background</h3>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.background || '', true) }} />
                  </div>
                )}
                
                {selectedNpc.personality && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Personality</h3>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNpc.personality || '', true) }} />
                  </div>
                )}

                <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {selectedNpc.hidden && <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Hidden from Players</span>}
                  {selectedNpc.nameHidden && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Name Hidden</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No NPC selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select an NPC from the list to view details, or create a new one.
              </p>
            </div>
          )}
          {/* Merge UI Modal */}
          {isMerging && selectedNpc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl m-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Merge NPCs</h3>
              <button onClick={() => setIsMerging(false)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Close</button>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Merge &quot;{selectedNpc.name}&quot; with:</label>
              <select
                value={mergeWithId}
                onChange={(e) => setMergeWithId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="">Select NPC…</option>
                {npcs.filter(n => n.id !== selectedNpc.id).map(n => (
                  <option key={n.id} value={n.id}>{n.name || n.id}</option>
                ))}
              </select>
            </div>
            {mergeCandidate && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-3">
                  <h4 className="font-semibold mb-2">Keep</h4>
                  <dl className="space-y-1 text-sm">
                    <dt className="font-medium">Name</dt><dd>{selectedNpc.name}</dd>
                    <dt className="font-medium">AKA</dt><dd>{String(selectedNpc.aka || "")}</dd>
                    <dt className="font-medium">Pronunciation</dt><dd>{selectedNpc.pronunciation}</dd>
                    <dt className="font-medium">Race</dt><dd>{selectedNpc.race}</dd>
                    <dt className="font-medium">Gender</dt><dd>{selectedNpc.gender}</dd>
                    <dt className="font-medium">Location</dt><dd>{selectedNpc.location}</dd>
                    <dt className="font-medium">Status</dt><dd>{selectedNpc.status}</dd>
                    <dt className="font-medium">Description</dt><dd>{selectedNpc.description}</dd>
                    <dt className="font-medium">Factions</dt><dd>{(selectedNpc.factions||[]).map(getFactionName).join(', ')}</dd>
                  </dl>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-semibold mb-2">Choose Per Field</h4>
                  <div className="space-y-2 text-sm">
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
                      <div key={key as string} className="flex items-center justify-between gap-2">
                        <span className="w-36 text-gray-600 dark:text-gray-300">{label as string}</span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="radio"
                              name={`merge-${key}`}
                              checked={(mergeChoice[key as string] || 'left') === 'left'}
                              onChange={() => setMergeChoice(prev => ({...prev, [key as string]: 'left'}))}
                            />
                            <span>Keep</span>
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="radio"
                              name={`merge-${key}`}
                              checked={(mergeChoice[key as string] || 'left') === 'right'}
                              onChange={() => setMergeChoice(prev => ({...prev, [key as string]: 'right'}))}
                            />
                            <span>Use Other</span>
                          </label>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={mergeIncludeRightFactions} onChange={(e) => setMergeIncludeRightFactions(e.target.checked)} />
                        <span>Include factions from other</span>
                      </label>
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={mergeIncludeRightNotes} onChange={(e) => setMergeIncludeRightNotes(e.target.checked)} />
                        <span>Include notes from other</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-semibold mb-2">Merge From</h4>
                  <dl className="space-y-1 text-sm">
                    <dt className="font-medium">Name</dt><dd>{mergeCandidate.name}</dd>
                    <dt className="font-medium">AKA</dt><dd>{String(mergeCandidate.aka || "")}</dd>
                    <dt className="font-medium">Pronunciation</dt><dd>{mergeCandidate.pronunciation}</dd>
                    <dt className="font-medium">Race</dt><dd>{mergeCandidate.race}</dd>
                    <dt className="font-medium">Gender</dt><dd>{mergeCandidate.gender}</dd>
                    <dt className="font-medium">Location</dt><dd>{mergeCandidate.location}</dd>
                    <dt className="font-medium">Status</dt><dd>{mergeCandidate.status}</dd>
                    <dt className="font-medium">Description</dt><dd>{mergeCandidate.description}</dd>
                    <dt className="font-medium">Factions</dt><dd>{(mergeCandidate.factions||[]).map(getFactionName).join(', ')}</dd>
                  </dl>
                </div>
              </div>
            )}
            {previewMerged && (
              <div className="mt-4 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm">
                <div className="font-semibold mb-1">Preview</div>
                <div>Name: {previewMerged.name}</div>
                {previewMerged.aka && <div>AKA: {String(previewMerged.aka)}</div>}
                <div>Race: {previewMerged.race} • Gender: {previewMerged.gender}</div>
                <div>Location: {previewMerged.location} • Status: {previewMerged.status}</div>
                {previewMerged.description && <div className="line-clamp-2">Desc: {previewMerged.description}</div>}
                <div>Factions: {(previewMerged.factions||[]).map(getFactionName).join(', ')}</div>
              </div>
            )}
            <div className="flex justify-end mt-4 gap-2">
              <button
                disabled={!mergeCandidate}
                onClick={performMerge}
                className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              >
                Confirm Merge (keep left, absorb right)
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
