"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import UserNotesEditor from "@/components/UserNotesEditor";
import EntityTagPicker from "@/components/EntityTagPicker";
import { UserNote } from "@/types/interfaces";
import { renderMarkdownWithLinks, AutoLinkEntity } from "@/utils/markdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useIsAdmin } from "@/utils/adminCheck";
import { authFetch } from "@/utils/authFetch";
import Link from "next/link";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

interface EntityItem { id: string; name: string; }

interface Recap {
  date: string;
  title: string;
  recap: string;
  id?: string;
  author?: string;
  notes?: UserNote[];
  tagged_npcs?: string[];
  tagged_locations?: string[];
  tagged_quests?: string[];
  tagged_items?: string[];
  tagged_factions?: string[];
  tagged_deities?: string[];
}

export default function RecapsPage() {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [activeRecap, setActiveRecap] = useState<string | null>(null);
  const recapRefs = useRef<Record<string, HTMLElement | null>>({});
  const searchParams = useSearchParams();
  const isAdmin = useIsAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecap, setNewRecap] = useState<Partial<Recap>>({ date: "", title: "", recap: "", tagged_npcs: [], tagged_locations: [], tagged_quests: [], tagged_items: [], tagged_factions: [], tagged_deities: [] });
  const [editingRecapId, setEditingRecapId] = useState<string | null>(null);
  const [editingRecap, setEditingRecap] = useState<Partial<Recap>>({});
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allRecaps = [], isPending: loading } = useQuery<Recap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => {
      const r = await authFetch("/api/data/session-recaps");
      if (!r.ok) throw new Error("Failed to load recaps");
      return r.json();
    },
  });
  const { data: rawNpcs = [] } = useQuery<{ id: string; name?: string; display_name?: string; hidden?: boolean; nameHidden?: boolean }[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => {
      const r = await authFetch('/api/data/npcs');
      if (!r.ok) throw new Error("Failed to load NPCs");
      return r.json();
    },
  });
  const { data: rawLocations = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: async () => {
      const r = await authFetch('/api/data/locations');
      if (!r.ok) throw new Error("Failed to load locations");
      return r.json();
    },
  });
  const { data: rawQuests = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => {
      const r = await authFetch('/api/data/quests');
      if (!r.ok) throw new Error("Failed to load quests");
      return r.json();
    },
  });
  const { data: rawItems = [] } = useQuery<{ id: string; name: string; hidden?: boolean }[]>({
    queryKey: ['/api/data/items'],
    queryFn: async () => {
      const r = await authFetch('/api/data/items');
      if (!r.ok) throw new Error("Failed to load items");
      return r.json();
    },
  });
  const { data: rawFactions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/factions'],
    queryFn: async () => {
      const r = await authFetch('/api/data/factions');
      if (!r.ok) throw new Error("Failed to load factions");
      return r.json();
    },
  });
  const { data: rawDeities = [] } = useQuery<{ id: string; name: string; hidden?: boolean }[]>({
    queryKey: ['/api/data/deities'],
    queryFn: async () => {
      const r = await authFetch('/api/data/deities');
      if (!r.ok) throw new Error("Failed to load deities");
      return r.json();
    },
  });
  const { data: rawPCs = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => {
      const r = await authFetch('/api/data/pcs');
      if (!r.ok) throw new Error("Failed to load PCs");
      return r.json();
    },
  });

  const allNPCData = rawNpcs;
  const availableNPCs = useMemo(() => rawNpcs.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id), hidden: n.hidden, nameHidden: n.nameHidden })), [rawNpcs]);
  const availableLocations = useMemo(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocations) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) {
        flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
      }
    }
    return flat;
  }, [rawLocations]);
  const availableQuests = useMemo(() => rawQuests.map(q => ({ id: String(q.id), name: q.name })), [rawQuests]);
  const availableItems = useMemo(() => rawItems.map(it => ({ id: String(it.id), name: it.name, hidden: it.hidden })), [rawItems]);
  const availableFactions = useMemo(() => rawFactions.map(f => ({ id: String(f.id), name: f.name })), [rawFactions]);
  const availableDeities = useMemo(() => rawDeities.filter(d => !d.hidden || isAdmin).map(d => ({ id: String(d.id), name: d.name, hidden: d.hidden })), [rawDeities, isAdmin]);
  const availablePCs = useMemo(() => rawPCs.map(p => ({ id: String(p.id), name: p.name })), [rawPCs]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const recapId = searchParams.get("recap");
    if (recapId && allRecaps.length > 0) {
      handleJumpToRecap(recapId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecaps, searchParams]);

  // Assign session numbers based on chronological order (oldest = #1)
  const sessionNumbers = [...allRecaps]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce(
      (acc, recap, index) => ({ ...acc, [recap.id || recap.date]: index + 1 }),
      {} as Record<string, number>
    );

  const filteredRecaps = allRecaps
    .filter(
      (recap) =>
        recap.title.toLowerCase().includes(search.toLowerCase()) ||
        recap.recap.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  const handleJumpToRecap = (key: string) => {
    setActiveRecap(key);
    setTimeout(() => {
      recapRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const canEditRecap = (recap: Recap) => {
    const uid = user?.uid;
    return !!uid && (isAdmin || (recap.author && recap.author === uid));
  };

  const handleAddRecap = async () => {
    if (!user) return;
    try {
      const payload = { ...newRecap, author: user.uid } as Recap;
      const res = await authFetch("/api/data/session-recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add recap");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/session-recaps'] });
      setShowAddForm(false);
      setNewRecap({ date: "", title: "", recap: "" });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleStartEditRecap = (recap: Recap) => {
    if (!canEditRecap(recap)) return;
    setEditingRecapId(recap.id || null);
    setEditingRecap({ ...recap });
  };

  const handleSaveEditRecap = async () => {
    if (!editingRecapId) return;
    try {
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecap),
      });
      if (!res.ok) throw new Error("Failed to save recap");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/session-recaps'] });
      setEditingRecapId(null);
      setEditingRecap({});
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleUpdateRecapNotes = async (recap: Recap, updatedNotes: UserNote[]) => {
    try {
      const res = await authFetch("/api/data/session-recaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recap.id, notes: updatedNotes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/session-recaps'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the chronicle&hellip;
        </div>
      </div>
    );
  }

  const totalCount = allRecaps.length;

  const linkEntities = [
    ...availableNPCs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availablePCs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
    ...availableQuests.map(q => ({ id: q.id, name: q.name, type: 'quest' as const, url: `/campaign/quests/${q.id}` })),
    ...(availableItems as { id: string; name: string; hidden?: boolean }[]).filter(it => !it.hidden).map(it => ({ id: it.id, name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` })),
    ...availableFactions.map(f => ({ id: f.id, name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...availableDeities.map(d => ({ id: d.id, name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <div className="grid gap-0 h-full overflow-hidden" style={{ gridTemplateColumns: "1fr 300px" }}>

      {/* Chronicle column */}
      <div className="overflow-y-auto pt-9 pr-10 pb-20 pl-14">
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Page header */}
        <div className="flex justify-between items-end mb-5.5">
          <div>
            <div className="grim-page-eyebrow">The Remembered Road</div>
            <h1 className="grim-page-title">Chronicle of Sessions</h1>
            <p className="grim-page-sub">
              {totalCount} {totalCount === 1 ? "night" : "nights"} of peril, set down in ink while the memory was yet warm.
            </p>
          </div>
        </div>

        {/* Search + sort + add */}
        <section className="flex gap-3 mb-5.5">
          <div className="relative flex-1">
            <input
              placeholder="Search the chronicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
            />
            <span
              className="absolute left-3.5 text-grim-gold-2 text-2xl pointer-events-none"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >✦</span>
          </div>
          <button
            className="grim-btn is-ghost"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          >
            {sortOrder === "desc" ? "↓ Newest First" : "↑ Oldest First"}
          </button>
          {user && (
            <button
              className="grim-btn is-ember"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "✕ Cancel" : "+ Inscribe Recap"}
            </button>
          )}
        </section>

        {/* Add recap form */}
        {showAddForm && (
          <div className="grim-tome mb-5.5">
            <div className="grim-h-section mb-3.5">New Chronicle Entry</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="grim-label mb-1.5">Date</div>
                <input
                  type="date"
                  value={newRecap.date || ""}
                  onChange={(e) => setNewRecap({ ...newRecap, date: e.target.value })}
                  className="w-full bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
                />
              </div>
              <div>
                <div className="grim-label mb-1.5">Title</div>
                <input
                  type="text"
                  value={newRecap.title || ""}
                  onChange={(e) => setNewRecap({ ...newRecap, title: e.target.value })}
                  className="w-full bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
                />
              </div>
            </div>
            <div className="mb-4">
              <div className="grim-label mb-1.5">Recap</div>
              <MarkdownEditor
                value={newRecap.recap || ""}
                onChange={(v) => setNewRecap({ ...newRecap, recap: v })}
                rows={10}
                label="Recap"
                linkEntities={linkEntities}
              />
            </div>
            {isAdmin && (
              <div className="mb-4">
                <EntityTagPicker
                  npcs={availableNPCs}
                  locations={availableLocations}
                  quests={availableQuests}
                  items={availableItems}
                  factions={availableFactions}
                  deities={availableDeities}
                  selectedNpcs={newRecap.tagged_npcs ?? []}
                  selectedLocations={newRecap.tagged_locations ?? []}
                  selectedQuests={newRecap.tagged_quests ?? []}
                  selectedItems={newRecap.tagged_items ?? []}
                  selectedFactions={newRecap.tagged_factions ?? []}
                  selectedDeities={newRecap.tagged_deities ?? []}
                  onNpcsChange={(ids) => setNewRecap({ ...newRecap, tagged_npcs: ids })}
                  onLocationsChange={(ids) => setNewRecap({ ...newRecap, tagged_locations: ids })}
                  onQuestsChange={(ids) => setNewRecap({ ...newRecap, tagged_quests: ids })}
                  onItemsChange={(ids) => setNewRecap({ ...newRecap, tagged_items: ids })}
                  onFactionsChange={(ids) => setNewRecap({ ...newRecap, tagged_factions: ids })}
                  onDeitiesChange={(ids) => setNewRecap({ ...newRecap, tagged_deities: ids })}
                />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleAddRecap} className="grim-btn is-ember">
                Inscribe to Chronicle
              </button>
            </div>
          </div>
        )}

        {/* Recap entries */}
        <div className="grim-stack gap-5.5">
          {filteredRecaps.length === 0 ? (
            <div className="text-center py-15 px-6 text-grim-ink-4">
              <div className="font-display text-5xl text-grim-ink-3 mb-2">
                ~ no sessions found ~
              </div>
              <div className="grim-mono text-sm tracking-widest-2 uppercase">
                Adjust your search
              </div>
            </div>
          ) : (
            filteredRecaps.map((recap) => {
              const recapKey = recap.id || recap.date;
              const sessionNo = sessionNumbers[recapKey];
              const isActive = activeRecap === recapKey;

              return (
                <article
                  key={recap.date}
                  ref={(el) => { recapRefs.current[recapKey] = el; }}
                  className={`grim-tome${isActive ? " is-bordered" : ""} scroll-mt-6`}
                  id={`recap-${recap.date}`}
                >
                  {/* Entry header */}
                  <div className="flex justify-between items-start gap-4 mb-3.5 pb-3.5 border-b border-grim-line">
                    <div className="min-w-0 flex-1">
                      <div className="grim-mono text-sm tracking-widest-2 text-grim-ember-2 uppercase">
                        {sessionNo ? `Session ${sessionNo} · ` : ""}{recap.date}
                      </div>
                      {editingRecapId === recap.id ? (
                        <input
                          type="text"
                          value={editingRecap.title as string}
                          onChange={(e) => setEditingRecap({ ...editingRecap, title: e.target.value })}
                          className="mt-1 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-4xl py-1.5 px-3 outline-none w-full"
                        />
                      ) : (
                        <h3 className="font-display text-5xl text-grim-gold mt-1 mx-0 mb-0" style={{ lineHeight: 1.05 }}>
                          {recap.title}
                        </h3>
                      )}
                    </div>
                    {canEditRecap(recap) && (
                      <div className="flex gap-2 shrink-0">
                        {editingRecapId === recap.id ? (
                          <>
                            <button
                              onClick={() => { setEditingRecapId(null); setEditingRecap({}); }}
                              className="grim-btn is-ghost py-1.5 px-3 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEditRecap}
                              className="grim-btn is-ember py-1.5 px-3 text-sm"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEditRecap(recap)}
                            className="grim-btn is-ghost"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recap body */}
                  {editingRecapId === recap.id ? (
                    <>
                      <MarkdownEditor
                        value={(editingRecap.recap as string) || ""}
                        onChange={(v) => setEditingRecap({ ...editingRecap, recap: v })}
                        rows={12}
                        label="Recap"
                        linkEntities={linkEntities}
                      />
                      {isAdmin && (
                        <div className="mt-4">
                          <EntityTagPicker
                            npcs={availableNPCs}
                            locations={availableLocations}
                            quests={availableQuests}
                            items={availableItems}
                            factions={availableFactions}
                            deities={availableDeities}
                            selectedNpcs={editingRecap.tagged_npcs ?? []}
                            selectedLocations={editingRecap.tagged_locations ?? []}
                            selectedQuests={editingRecap.tagged_quests ?? []}
                            selectedItems={editingRecap.tagged_items ?? []}
                            selectedFactions={editingRecap.tagged_factions ?? []}
                            selectedDeities={editingRecap.tagged_deities ?? []}
                            onNpcsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_npcs: ids })}
                            onLocationsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_locations: ids })}
                            onQuestsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_quests: ids })}
                            onItemsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_items: ids })}
                            onFactionsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_factions: ids })}
                            onDeitiesChange={(ids) => setEditingRecap({ ...editingRecap, tagged_deities: ids })}
                          />
                        </div>
                      )}
                    </>
                  ) : (() => {
                    const entityLinks: AutoLinkEntity[] = [
                      ...allNPCData.filter(n => !n.hidden && !n.nameHidden).map(n => ({ id: String(n.id), name: n.name || '', url: `/campaign/npcs/${n.id}`, type: 'npc' as const })).filter(e => e.name),
                      ...availableLocations.map(l => ({ id: l.id, name: l.name, url: `/campaign/locations/${l.id}`, type: 'location' as const })),
                      ...(availableItems as (EntityItem & { hidden?: boolean })[]).filter(it => !it.hidden).map(it => ({ id: it.id, name: it.name, url: `/campaign/items/${it.id}`, type: 'item' as const })),
                    ];
                    return (
                      <div
                        className="grim-chronicle"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(recap.recap, isAdmin, entityLinks) }}
                      />
                    );
                  })()}

                  {/* Tagged entities */}
                  {((recap.tagged_npcs?.length ?? 0) > 0 ||
                    (recap.tagged_locations?.length ?? 0) > 0 ||
                    (recap.tagged_quests?.length ?? 0) > 0 ||
                    (recap.tagged_items?.length ?? 0) > 0 ||
                    (recap.tagged_factions?.length ?? 0) > 0 ||
                    (recap.tagged_deities?.length ?? 0) > 0) && (
                    <div className="mt-5 pt-4 border-t border-dashed border-grim-line">
                      <div className="grim-label mb-2">Souls, Places, Errands, Relics, Banners &amp; Divinities</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(recap.tagged_npcs ?? []).map(id => {
                          const n = availableNPCs.find(x => x.id === id);
                          if (!n || (n.hidden && !isAdmin)) return null;
                          return (
                            <Link key={id} href={`/campaign/npcs/${id}`} className="grim-chip is-ember text-sm no-underline inline-flex items-center gap-1.25">
                              {n.name}
                              {n.hidden && <span className="text-xs opacity-75">(hidden)</span>}
                              {n.nameHidden && isAdmin && <span className="text-xs opacity-75">(name hidden)</span>}
                            </Link>
                          );
                        })}
                        {(recap.tagged_locations ?? []).map(id => {
                          const l = availableLocations.find(x => x.id === id);
                          return l ? (
                            <Link key={id} href={`/campaign/locations/${id}`} className="grim-chip is-arcane text-sm no-underline">
                              {l.name}
                            </Link>
                          ) : null;
                        })}
                        {(recap.tagged_quests ?? []).map(id => {
                          const qt = availableQuests.find(x => x.id === id);
                          return qt ? (
                            <Link key={id} href={`/campaign/quests/${id}`} className="grim-chip is-faction text-sm no-underline">
                              {qt.name}
                            </Link>
                          ) : null;
                        })}
                        {(recap.tagged_items ?? []).map(id => {
                          const it = availableItems.find(x => x.id === id);
                          if (!it || (it.hidden && !isAdmin)) return null;
                          return (
                            <Link key={id} href={`/campaign/items/${id}`} className="grim-chip text-sm no-underline inline-flex items-center gap-1.25 bg-grim-moss/18 border border-grim-moss/45 text-grim-moss">
                              ⚔ {it.name}
                              {it.hidden && <span className="text-xs opacity-75">(hidden)</span>}
                            </Link>
                          );
                        })}
                        {(recap.tagged_factions ?? []).map(id => {
                          const f = availableFactions.find(x => x.id === id);
                          return f ? (
                            <Link key={id} href={`/campaign/factions/${id}`} className="grim-chip text-sm no-underline bg-grim-arcane-bg border border-grim-arcane-border text-grim-arcane">
                              ⚑ {f.name}
                            </Link>
                          ) : null;
                        })}
                        {(recap.tagged_deities ?? []).map(id => {
                          const d = availableDeities.find(x => x.id === id);
                          if (!d) return null;
                          return (
                            <Link key={id} href={`/campaign/deities/${id}`} className="grim-chip text-sm no-underline inline-flex items-center gap-1.25 bg-grim-gold-bg border border-grim-gold-border text-grim-gold">
                              ✦ {d.name}
                              {d.hidden && <span className="text-xs opacity-75">(hidden)</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes / Marginalia */}
                  <div className="grim-rule" />
                  <div>
                    <div className="grim-label mb-2.5">Marginalia</div>
                    <UserNotesEditor
                      notes={recap.notes || []}
                      onChange={(notes) => handleUpdateRecapNotes(recap, notes)}
                      currentUser={user}
                      isAdmin={isAdmin}
                      linkEntities={linkEntities}
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Session rail */}
      <aside className="border-l border-grim-line overflow-y-auto py-5.5 px-0">
        <div className="flex items-baseline justify-between mb-3.5 py-0 px-5.5">
          <h2 className="grim-h-section m-0">The Sessions</h2>
          <span className="grim-mono text-sm text-grim-ink-4 tracking-wider-3">
            {filteredRecaps.length}
          </span>
        </div>
        <div className="grim-stack gap-1">
          {filteredRecaps.map((recap) => {
            const recapKey = recap.id || recap.date;
            const sessionNo = sessionNumbers[recapKey];
            const isActive = activeRecap === recapKey;
            return (
              <div
                key={recap.date}
                onClick={() => handleJumpToRecap(recapKey)}
                className={`py-2.5 px-5.5 cursor-pointer border-l-2 ${isActive ? "border-l-grim-ember" : "border-l-transparent"}`}
                style={{ background: isActive ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent" }}
              >
                <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 uppercase">
                  {recap.date}{sessionNo ? ` · s${sessionNo}` : ""}
                </div>
                <div className={`font-head text-lg tracking-wide leading-tight mt-0.5 ${isActive ? "text-grim-ember-2" : "text-grim-ink-2"}`}>
                  {recap.title}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
