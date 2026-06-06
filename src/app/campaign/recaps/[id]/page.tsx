"use client";

import { useState, useEffect } from "react";
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

  const [recap, setRecap] = useState<Recap | null>(null);
  const [sessionNo, setSessionNo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingRecap, setEditingRecap] = useState<Partial<Recap>>({});

  const [availableNPCs, setAvailableNPCs] = useState<EntityItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<EntityItem[]>([]);
  const [availableQuests, setAvailableQuests] = useState<EntityItem[]>([]);
  const [availableItems, setAvailableItems] = useState<(EntityItem & { hidden?: boolean })[]>([]);
  const [availableFactions, setAvailableFactions] = useState<EntityItem[]>([]);
  const [availableDeities, setAvailableDeities] = useState<EntityItem[]>([]);
  const [allNPCData, setAllNPCData] = useState<{ id: string; name?: string; aka?: string; hidden?: boolean; nameHidden?: boolean }[]>([]);
  const [allPCData, setAllPCData] = useState<{ id: string; name: string; nickname?: string }[]>([]);

  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [recapsRes, npcsRes, locsRes, questsRes, itemsRes, factionsRes, deitiesRes, pcsRes] = await Promise.all([
          authFetch("/api/data/session-recaps"),
          authFetch("/api/data/npcs"),
          authFetch("/api/data/locations"),
          authFetch("/api/data/quests"),
          authFetch("/api/data/items"),
          authFetch("/api/data/factions"),
          authFetch("/api/data/deities"),
          authFetch("/api/data/pcs"),
        ]);

        const allRecaps: Recap[] = recapsRes.ok ? await recapsRes.json() : [];
        const found = allRecaps.find(r => (r.id ?? r.date) === urlId || r.id === urlId || r.date === urlId);
        if (!found) { setNotFound(true); return; }
        setRecap(found);

        const sorted = [...allRecaps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const idx = sorted.findIndex(r => (r.id ?? r.date) === (found.id ?? found.date));
        if (idx !== -1) setSessionNo(idx + 1);

        const npcData: { id: string; name?: string; display_name?: string; hidden?: boolean; nameHidden?: boolean }[] = npcsRes.ok ? await npcsRes.json() : [];
        setAllNPCData(npcData);
        setAvailableNPCs(npcData.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id) })));

        const locData: { id: string; name: string; locations?: { id: string; name: string }[] }[] = locsRes.ok ? await locsRes.json() : [];
        const flat: EntityItem[] = [];
        for (const loc of locData) {
          flat.push({ id: String(loc.id), name: loc.name });
          for (const sub of loc.locations ?? []) flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
        }
        setAvailableLocations(flat);

        const questData: { id: string; name: string }[] = questsRes.ok ? await questsRes.json() : [];
        setAvailableQuests(questData.map(q => ({ id: String(q.id), name: q.name })));

        const itemData: { id: string; name: string; hidden?: boolean }[] = itemsRes.ok ? await itemsRes.json() : [];
        setAvailableItems(itemData.map(it => ({ id: String(it.id), name: it.name, hidden: it.hidden })));

        const factionData: { id: string; name: string }[] = factionsRes.ok ? await factionsRes.json() : [];
        setAvailableFactions(factionData.map(f => ({ id: String(f.id), name: f.name })));

        const deityData: { id: string; name: string; hidden?: boolean }[] = deitiesRes.ok ? await deitiesRes.json() : [];
        setAvailableDeities(deityData.filter(d => !d.hidden).map(d => ({ id: String(d.id), name: d.name })));

        const pcData: { id: string; name: string; nickname?: string }[] = pcsRes.ok ? await pcsRes.json() : [];
        setAllPCData(pcData);
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [urlId]);

  const canEdit = (r: Recap) => {
    const uid = user?.uid;
    return !!uid && (isAdmin || (r.author && r.author === uid));
  };

  const handleSaveEdit = async () => {
    if (!recap) return;
    try {
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecap),
      });
      if (!res.ok) throw new Error("Failed to save recap");
      const refreshed = await authFetch("/api/data/session-recaps");
      const all: Recap[] = refreshed.ok ? await refreshed.json() : [];
      const updated = all.find(r => r.id === recap.id);
      if (updated) setRecap(updated);
      setEditing(false);
      setEditingRecap({});
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleUpdateNotes = async (updatedNotes: UserNote[]) => {
    if (!recap) return;
    try {
      const payload = { ...recap, notes: updatedNotes };
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      setRecap(payload);
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the chronicle&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !recap) {
    return (
      <div style={{ padding: "36px 56px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/recaps")} style={{ marginBottom: 24 }}>
          ‹ Chronicle of Sessions
        </button>
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ session not found ~</div>
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
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/recaps")} style={{ marginBottom: 24 }}>
        ‹ Chronicle of Sessions
      </button>

      <article className="grim-tome is-bordered">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--grim-line)" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>
              {sessionNo ? `Session ${sessionNo} · ` : ""}{recap.date}
            </div>
            {editing ? (
              <input
                type="text"
                value={editingRecap.title as string}
                onChange={e => setEditingRecap({ ...editingRecap, title: e.target.value })}
                style={{ marginTop: 4, background: "var(--grim-bg-4)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-display)", fontSize: 28, padding: "6px 12px", outline: "none", width: "100%" }}
              />
            ) : (
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-gold)", margin: "4px 0 0", lineHeight: 1.05 }}>
                {recap.title}
              </h1>
            )}
          </div>
          {canEdit(recap) && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setEditingRecap({}); }} className="grim-btn is-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Cancel</button>
                  <button onClick={handleSaveEdit} className="grim-btn is-ember" style={{ padding: "6px 12px", fontSize: 11 }}>Save</button>
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
              <div style={{ marginTop: 16 }}>
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
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--grim-line)" }}>
            <div className="grim-label" style={{ marginBottom: 8 }}>Souls, Places, Errands, Relics, Banners &amp; Divinities</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(recap.tagged_npcs ?? []).map(id => {
                const n = availableNPCs.find(x => x.id === id);
                return n ? <Link key={id} href={`/campaign/npcs/${id}`} className="grim-chip is-ember" style={{ fontSize: 11, textDecoration: "none" }}>{n.name}</Link> : null;
              })}
              {(recap.tagged_locations ?? []).map(id => {
                const l = availableLocations.find(x => x.id === id);
                return l ? <Link key={id} href={`/campaign/locations/${id}`} className="grim-chip is-arcane" style={{ fontSize: 11, textDecoration: "none" }}>{l.name}</Link> : null;
              })}
              {(recap.tagged_quests ?? []).map(id => {
                const qt = availableQuests.find(x => x.id === id);
                return qt ? <Link key={id} href={`/campaign/quests/${id}`} className="grim-chip is-faction" style={{ fontSize: 11, textDecoration: "none" }}>{qt.name}</Link> : null;
              })}
              {(recap.tagged_items ?? []).map(id => {
                const it = availableItems.find(x => x.id === id);
                return it ? <Link key={id} href={`/campaign/items/${id}`} className="grim-chip" style={{ fontSize: 11, textDecoration: "none", background: "oklch(0.55 0.090 145 / 0.18)", border: "1px solid oklch(0.55 0.090 145 / 0.45)", color: "var(--grim-moss)" }}>⚔ {it.name}</Link> : null;
              })}
              {(recap.tagged_factions ?? []).map(id => {
                const f = availableFactions.find(x => x.id === id);
                return f ? <Link key={id} href={`/campaign/factions/${id}`} className="grim-chip" style={{ fontSize: 11, textDecoration: "none", background: "oklch(0.50 0.14 285 / 0.18)", border: "1px solid oklch(0.50 0.14 285 / 0.45)", color: "var(--grim-arcane)" }}>⚑ {f.name}</Link> : null;
              })}
              {(recap.tagged_deities ?? []).map(id => {
                const d = availableDeities.find(x => x.id === id);
                return d ? <Link key={id} href={`/campaign/deities/${id}`} className="grim-chip" style={{ fontSize: 11, textDecoration: "none", background: "oklch(0.55 0.10 60 / 0.18)", border: "1px solid oklch(0.55 0.10 60 / 0.45)", color: "var(--grim-gold)" }}>✦ {d.name}</Link> : null;
              })}
            </div>
          </div>
        )}

        <div className="grim-rule" />
        <div>
          <div className="grim-label" style={{ marginBottom: 10 }}>Marginalia</div>
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
