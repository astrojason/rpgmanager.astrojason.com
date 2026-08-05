"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import UserNotesEditor from "@/components/UserNotesEditor";
import EntityTagPicker from "@/components/EntityTagPicker";
import { UserNote } from "@/types/interfaces";
import { renderMarkdownWithLinks, AutoLinkEntity } from "@/utils/markdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useIsAdmin } from "@/utils/adminCheck";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import Link from "next/link";

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

export default function RecapDetailPage() {
  const params = useParams();
  const urlId = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingRecap, setEditingRecap] = useState<Partial<Recap>>({});

  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  const { data: allRecaps = [], isPending: loading } = useQuery<Recap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });
  const { data: rawNpcs = [] } = useQuery<{ id: string; name?: string; display_name?: string; aka?: string; hidden?: boolean; nameHidden?: boolean }[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => { const r = await authFetch("/api/data/npcs"); if (!r.ok) throw new Error("Failed to load NPCs"); return r.json(); },
  });
  const { data: rawLocs = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: async () => { const r = await authFetch("/api/data/locations"); if (!r.ok) throw new Error("Failed to load locations"); return r.json(); },
  });
  const { data: rawQuests = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => { const r = await authFetch("/api/data/quests"); if (!r.ok) throw new Error("Failed to load quests"); return r.json(); },
  });
  const { data: rawItems = [] } = useQuery<{ id: string; name: string; hidden?: boolean }[]>({
    queryKey: ['/api/data/items'],
    queryFn: async () => { const r = await authFetch("/api/data/items"); if (!r.ok) throw new Error("Failed to load items"); return r.json(); },
  });
  const { data: rawFactions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/factions'],
    queryFn: async () => { const r = await authFetch("/api/data/factions"); if (!r.ok) throw new Error("Failed to load factions"); return r.json(); },
  });
  const { data: rawDeities = [] } = useQuery<{ id: string; name: string; hidden?: boolean }[]>({
    queryKey: ['/api/data/deities'],
    queryFn: async () => { const r = await authFetch("/api/data/deities"); if (!r.ok) throw new Error("Failed to load deities"); return r.json(); },
  });
  const { data: allPCData = [] } = useQuery<{ id: string; name: string; nickname?: string }[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });

  const recap = useMemo(() =>
    allRecaps.find(r => (r.id ?? r.date) === urlId || r.id === urlId || r.date === urlId) ?? null,
    [allRecaps, urlId]
  );
  const notFound = !loading && !recap;
  const sessionNo = useMemo(() => {
    if (!recap) return null;
    const sorted = [...allRecaps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const idx = sorted.findIndex(r => (r.id ?? r.date) === (recap.id ?? recap.date));
    return idx !== -1 ? idx + 1 : null;
  }, [allRecaps, recap]);
  const allNPCData = rawNpcs;
  const availableNPCs = useMemo(() => rawNpcs.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id), hidden: n.hidden, nameHidden: n.nameHidden })), [rawNpcs]);
  const availableLocations = useMemo(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocs) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
    }
    return flat;
  }, [rawLocs]);
  const availableQuests = useMemo(() => rawQuests.map(q => ({ id: String(q.id), name: q.name })), [rawQuests]);
  const availableItems = useMemo(() => rawItems.map(it => ({ id: String(it.id), name: it.name, hidden: it.hidden })), [rawItems]);
  const availableFactions = useMemo(() => rawFactions.map(f => ({ id: String(f.id), name: f.name })), [rawFactions]);
  const availableDeities = useMemo(() => rawDeities.filter(d => !d.hidden || isAdmin).map(d => ({ id: String(d.id), name: d.name, hidden: d.hidden })), [rawDeities, isAdmin]);

  const canEdit = (r: Recap) => {
    const uid = user?.uid;
    return !!uid && (isAdmin || (r.author && r.author === uid));
  };

  const handleSaveEdit = async () => {
    if (!recap) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecap),
      });
      if (!res.ok) throw new Error("Failed to save recap");
      await queryClient.invalidateQueries({ queryKey: ['/api/data/session-recaps'] });
      setEditing(false);
      setEditingRecap({});
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNotes = async (updatedNotes: UserNote[]) => {
    if (!recap) return;
    setError(null);
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

  if (notFound || !recap) {
    return (
      <div className="py-9 px-14">
        <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/recaps")}>
          ‹ Chronicle of Sessions
        </button>
        <div className="text-center py-15 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3 mb-2">~ session not found ~</div>
        </div>
      </div>
    );
  }

  const entityLinks: AutoLinkEntity[] = [
    ...allNPCData.filter(n => !n.hidden && !n.nameHidden).map(n => ({
      id: String(n.id), name: n.name || '', url: `/campaign/npcs/${n.id}`, type: 'npc' as const,
      aliases: n.aka ? n.aka.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    })).filter(e => e.name),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, url: `/campaign/locations/${l.id}`, type: 'location' as const })),
    ...availableItems.filter(it => !it.hidden).map(it => ({ id: it.id, name: it.name, url: `/campaign/items/${it.id}`, type: 'item' as const })),
    ...availableFactions.map(f => ({ id: f.id, name: f.name, url: `/campaign/factions/${f.id}`, type: 'faction' as const })),
    ...availableDeities.map(d => ({ id: d.id, name: d.name, url: `/campaign/deities/${d.id}`, type: 'deity' as const })),
    ...allPCData.map(p => ({
      id: String(p.id), name: p.name, url: `/campaign/pcs/${p.id}`, type: 'pc' as const,
      aliases: p.nickname ? [p.nickname] : undefined,
    })),
  ];

  const linkEntities = [
    ...availableNPCs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
    ...availableQuests.map(q => ({ id: q.id, name: q.name, type: 'quest' as const, url: `/campaign/quests/${q.id}` })),
    ...availableItems.filter(it => !it.hidden).map(it => ({ id: it.id, name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` })),
    ...availableFactions.map(f => ({ id: f.id, name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...availableDeities.map(d => ({ id: d.id, name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
    ...allPCData.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
  ];

  return (
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full">
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/recaps")}>
        ‹ Chronicle of Sessions
      </button>

      <article className="grim-tome is-bordered">
        <div className="flex justify-between items-start gap-4 mb-3.5 pb-3.5 border-b border-grim-line">
          <div className="min-w-0 flex-1">
            <div className="grim-mono text-sm tracking-widest-2 text-grim-ember-2 uppercase">
              {sessionNo ? `Session ${sessionNo} · ` : ""}{recap.date}
            </div>
            {editing ? (
              <input
                type="text"
                value={editingRecap.title as string}
                onChange={e => setEditingRecap({ ...editingRecap, title: e.target.value })}
                className="mt-1 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-4xl py-1.5 px-3 outline-none w-full"
              />
            ) : (
              <h1 className="font-display text-5xl text-grim-gold mt-1 mx-0 mb-0" style={{ lineHeight: 1.05 }}>
                {recap.title}
              </h1>
            )}
          </div>
          {canEdit(recap) && (
            <div className="flex gap-2 shrink-0">
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setEditingRecap({}); setError(null); }} className="grim-btn is-ghost py-1.5 px-3 text-sm">Cancel</button>
                  <button onClick={handleSaveEdit} className="grim-btn is-ember py-1.5 px-3 text-sm" disabled={isSaving}>
                    {isSaving ? <><span className="grim-flame w-1.75 h-1.75" /> Saving…</> : "Save"}
                  </button>
                </>
              ) : (
                <button onClick={() => { setEditing(true); setEditingRecap({ ...recap }); }} className="grim-btn is-ghost">Edit</button>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <>
            <MarkdownEditor value={(editingRecap.recap as string) || ""} onChange={v => setEditingRecap({ ...editingRecap, recap: v })} rows={12} label="Recap" linkEntities={linkEntities} />
            {isAdmin && (
              <div className="mt-4">
                <EntityTagPicker
                  npcs={availableNPCs} locations={availableLocations} quests={availableQuests}
                  items={availableItems} factions={availableFactions} deities={availableDeities}
                  selectedNpcs={editingRecap.tagged_npcs ?? []} selectedLocations={editingRecap.tagged_locations ?? []}
                  selectedQuests={editingRecap.tagged_quests ?? []} selectedItems={editingRecap.tagged_items ?? []}
                  selectedFactions={editingRecap.tagged_factions ?? []} selectedDeities={editingRecap.tagged_deities ?? []}
                  onNpcsChange={ids => setEditingRecap({ ...editingRecap, tagged_npcs: ids })}
                  onLocationsChange={ids => setEditingRecap({ ...editingRecap, tagged_locations: ids })}
                  onQuestsChange={ids => setEditingRecap({ ...editingRecap, tagged_quests: ids })}
                  onItemsChange={ids => setEditingRecap({ ...editingRecap, tagged_items: ids })}
                  onFactionsChange={ids => setEditingRecap({ ...editingRecap, tagged_factions: ids })}
                  onDeitiesChange={ids => setEditingRecap({ ...editingRecap, tagged_deities: ids })}
                />
              </div>
            )}
          </>
        ) : (
          <div className="grim-chronicle" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(recap.recap, isAdmin, entityLinks) }} />
        )}

        {((recap.tagged_npcs?.length ?? 0) > 0 || (recap.tagged_locations?.length ?? 0) > 0 ||
          (recap.tagged_quests?.length ?? 0) > 0 || (recap.tagged_items?.length ?? 0) > 0 ||
          (recap.tagged_factions?.length ?? 0) > 0 || (recap.tagged_deities?.length ?? 0) > 0) && (
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
                return l ? <Link key={id} href={`/campaign/locations/${id}`} className="grim-chip is-arcane text-sm no-underline">{l.name}</Link> : null;
              })}
              {(recap.tagged_quests ?? []).map(id => {
                const qt = availableQuests.find(x => x.id === id);
                return qt ? <Link key={id} href={`/campaign/quests/${id}`} className="grim-chip is-faction text-sm no-underline">{qt.name}</Link> : null;
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
                return f ? <Link key={id} href={`/campaign/factions/${id}`} className="grim-chip text-sm no-underline bg-grim-arcane-bg border border-grim-arcane-border text-grim-arcane">⚑ {f.name}</Link> : null;
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

        <div className="grim-rule" />
        <div>
          <div className="grim-label mb-2.5">Marginalia</div>
          <UserNotesEditor
            notes={recap.notes || []}
            onChange={handleUpdateNotes}
            currentUser={user}
            isAdmin={isAdmin}
            linkEntities={linkEntities}
          />
        </div>
      </article>
    </div>
  );
}
