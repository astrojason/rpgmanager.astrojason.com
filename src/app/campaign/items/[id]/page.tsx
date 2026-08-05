"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { Item, NPC, PC, Location, SessionRecap, UserNote } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import UserNotesEditor from "@/components/UserNotesEditor";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import ConfirmModal from "@/components/ConfirmModal";
import EntityTagPicker from "@/components/EntityTagPicker";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import Link from "next/link";

interface EntityItem { id: string; name: string; }

function categoryChipStyle(category: string): { className: string; style?: React.CSSProperties } {
  const c = (category || "").toLowerCase();
  if (c.includes("magic")) return { className: "bg-grim-arcane-2/18 border border-grim-arcane-2/45 text-grim-arcane" };
  if (c.includes("artifact")) return { className: "bg-grim-ember/14 border border-grim-ember/45 text-grim-ember-2" };
  if (c.includes("journal")) return { className: "bg-grim-moss/14 border border-grim-moss/45 text-grim-moss" };
  return { className: "text-grim-gold", style: { background: "oklch(0.72 0.12 78 / 0.12)", border: "1px solid oklch(0.72 0.12 78 / 0.35)" } };
}

const CATEGORIES = ["Magic Item", "Artifact", "Stolen Journal", "Weapon", "Armor", "Consumable", "Other"];

export default function ItemDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item>>({});
  const [dmMode, setDmMode] = useState(false);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: allItems = [], isPending: loading } = useQuery<Item[]>({
    queryKey: ['/api/data/items'],
    queryFn: async () => { const r = await authFetch("/api/data/items"); if (!r.ok) throw new Error("Failed to load items"); return r.json(); },
  });
  const { data: recaps = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });
  const { data: npcs = [] } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => { const r = await authFetch("/api/data/npcs"); if (!r.ok) throw new Error("Failed to load NPCs"); return r.json(); },
  });
  const { data: pcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });
  const { data: rawLocs = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: async () => { const r = await authFetch("/api/data/locations"); if (!r.ok) throw new Error("Failed to load locations"); return r.json(); },
  });

  const item = useMemo(() => allItems.find(it => String(it.id) === id) ?? null, [allItems, id]);
  const notFound = !loading && !item;
  const locations = useMemo(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocs) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
    }
    return flat;
  }, [rawLocs]);

  useEffect(() => { setDmMode(isDM || isAdmin); }, [isDM, isAdmin]);

  const handleSave = async (data: Partial<Item>) => {
    setIsSaving(true);
    setError("");
    try {
      const res = await authFetch("/api/data/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/data/items'] });
      setShowEditForm(false);
      setEditingItem({});
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    setConfirmState({
      message: "Are you sure you want to delete this item?",
      onConfirm: async () => {
        setConfirmState(null);
        setError("");
        try {
          const res = await authFetch(`/api/data/items?id=${item.id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Server error ${res.status}`);
          }
          router.push("/campaign/items");
        } catch (e) {
          setError(toErrorMessage(e));
        }
      },
    });
  };

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!item) return;
    setError("");
    try {
      const res = await authFetch("/api/data/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/data/items'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const startEditing = () => {
    if (!item) return;
    setEditingItem({ ...item });
    setShowEditForm(true);
  };

  if (loading) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the reliquary&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="pt-9 px-14 pb-20">
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/items")}>‹ Back to the Armoury</button>
        <div className="mt-8 text-center text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3">~ relic not found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">No record of this artefact in the ledger</div>
        </div>
      </div>
    );
  }

  // Backlinks
  const linkedRecaps = recaps.filter(r => (r.tagged_items ?? []).includes(id));
  const linkedNpcs = npcs.filter(n => (item.tagged_npcs ?? []).includes(String(n.id)) && (!n.hidden || isAdmin || isDM));
  const linkedPcs = pcs.filter(p => (item.tagged_pcs ?? []).includes(String(p.id)));
  const linkedLocations = locations.filter(l => (item.tagged_locations ?? []).includes(l.id));

  const availableNpcs: EntityItem[] = npcs.map(n => ({ id: String(n.id), name: n.name || n.aka || String(n.id) }));
  const availablePcs: EntityItem[] = pcs.map(p => ({ id: String(p.id), name: p.name }));

  const linkEntities = [
    ...availableNpcs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availablePcs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...locations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
  ];

  return (
    <>
      {/* Edit modal */}
      {showEditForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowEditForm(false); setEditingItem({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 max-w-170 w-full overflow-y-auto m-4 p-8"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Amend the Ledger Entry
            </h2>
            <form onSubmit={e => { e.preventDefault(); handleSave(editingItem); }} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Name", field: "name" as keyof Item, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Item, full: false },
                  { label: "Type Tag", field: "type_tag" as keyof Item, full: true },
                  { label: "Image URL", field: "image" as keyof Item, full: true },
                ] as { label: string; field: keyof Item; full: boolean }[]).map(({ label, field, full }) => (
                  <div key={field} className={full ? "col-span-full" : ""}>
                    <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(editingItem[field] as string) || ""}
                      onChange={e => setEditingItem({ ...editingItem, [field]: e.target.value })}
                      className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Category</label>
                  <select
                    value={editingItem.category || "Magic Item"}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Description</label>
                <MarkdownEditor value={editingItem.description || ""} onChange={v => setEditingItem({ ...editingItem, description: v })} rows={4} label="Description" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Properties / Stats</label>
                <MarkdownEditor value={editingItem.properties || ""} onChange={v => setEditingItem({ ...editingItem, properties: v })} rows={5} label="Properties" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">GM Notes</label>
                <MarkdownEditor value={editingItem.gm_notes || ""} onChange={v => setEditingItem({ ...editingItem, gm_notes: v })} rows={4} label="GM Notes" linkEntities={linkEntities} />
              </div>

              {/* Tag NPCs, PCs, Locations */}
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Associated NPCs</label>
                <div className="max-h-40 overflow-y-auto border border-grim-line-2 py-1.5 px-0 bg-grim-bg-3">
                  {availableNpcs.map(n => (
                    <label key={n.id} className={`flex items-center gap-2.5 py-1 px-3.5 cursor-pointer ${(editingItem.tagged_npcs ?? []).includes(n.id) ? "bg-grim-ember/12" : "bg-transparent"}`}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_npcs ?? []).includes(n.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_npcs ?? [];
                          setEditingItem({ ...editingItem, tagged_npcs: e.target.checked ? [...cur, n.id] : cur.filter(x => x !== n.id) });
                        }}
                        className="accent-grim-ember"
                      />
                      <span className="font-body text-lg text-grim-ink-2">{n.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Associated PCs</label>
                <div className="max-h-30 overflow-y-auto border border-grim-line-2 py-1.5 px-0 bg-grim-bg-3">
                  {availablePcs.map(p => (
                    <label key={p.id} className={`flex items-center gap-2.5 py-1 px-3.5 cursor-pointer ${(editingItem.tagged_pcs ?? []).includes(p.id) ? "bg-grim-moss/12" : "bg-transparent"}`}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_pcs ?? []).includes(p.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_pcs ?? [];
                          setEditingItem({ ...editingItem, tagged_pcs: e.target.checked ? [...cur, p.id] : cur.filter(x => x !== p.id) });
                        }}
                        className="accent-grim-moss"
                      />
                      <span className="font-body text-lg text-grim-ink-2">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Associated Locations</label>
                <div className="max-h-40 overflow-y-auto border border-grim-line-2 py-1.5 px-0 bg-grim-bg-3">
                  {locations.map(l => (
                    <label key={l.id} className={`flex items-center gap-2.5 py-1 px-3.5 cursor-pointer ${(editingItem.tagged_locations ?? []).includes(l.id) ? "bg-grim-arcane-2/12" : "bg-transparent"}`}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_locations ?? []).includes(l.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_locations ?? [];
                          setEditingItem({ ...editingItem, tagged_locations: e.target.checked ? [...cur, l.id] : cur.filter(x => x !== l.id) });
                        }}
                        className="accent-grim-arcane"
                      />
                      <span className="font-body text-lg text-grim-ink-2">{l.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-head text-lg text-grim-ink-2 tracking-wider">
                <input type="checkbox" checked={Boolean(editingItem.hidden)} onChange={e => setEditingItem({ ...editingItem, hidden: e.target.checked })} className="accent-grim-ember" />
                Hidden from players
              </label>
              {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingItem({}); setError(""); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                  {isSaving ? <><span className="grim-flame w-2 h-2" /> Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM DETAIL */}
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-7">
          <div className="grim-row gap-4.5">
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/items")}>
              ‹ Back to the Armoury
            </button>
            <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2">
              reliquary / {item.name.toLowerCase()}
            </div>
          </div>
          <div className="grim-row gap-2">
            {(isDM || isAdmin) && (
              <button
                className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
                onClick={() => setDmMode(!dmMode)}
              >
                <span className="grim-flame w-1.5 h-1.5" />
                {dmMode ? "DM Sight · ON" : "DM Sight · OFF"}
              </button>
            )}
            {isAdmin && (
              <>
                <button className="grim-btn is-ghost" onClick={startEditing}>Edit</button>
                <button className="grim-btn is-blood" onClick={handleDelete}>Destroy</button>
              </>
            )}
          </div>
        </div>

        {/* Hero */}
        <section className="mb-7">
          <div className="grim-page-eyebrow">Ledger Entry — Reliquary</div>
          <h1 className="font-display text-8xl text-grim-gold mt-0.5 mx-0 mb-1.5 tracking-normal" style={{ lineHeight: 0.92, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
            {item.name}
          </h1>
          {item.pronunciation && (
            <div className="font-body text-grim-ink-2 text-2xl">
              pronounced <b className="font-head tracking-widest">{item.pronunciation}</b>
            </div>
          )}
          <div className="flex gap-2 mt-3.5 flex-wrap items-center">
            <span className={`grim-chip text-sm ${categoryChipStyle(item.category).className}`} style={categoryChipStyle(item.category).style}>{item.category || "Item"}</span>
            {item.type_tag && (
              <span className="font-body italic text-lg text-grim-ink-3">
                {item.type_tag}
              </span>
            )}
            {item.hidden && isAdmin && (
              <span className="grim-chip is-blood text-sm">hidden from players</span>
            )}
          </div>
        </section>

        {/* Description parchment */}
        {item.description && (
          <section className="grim-parchment mb-7">
            <div className="prose dark:prose-invert max-w-none prose-sm m-0 text-xl text-grim-parchment-ink-2" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.description, isAdmin) }} />
          </section>
        )}

        {/* Two-column body */}
        <div className="grid gap-5.5" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>

          {/* Left column */}
          <div className="grim-stack gap-5.5">
            {item.properties && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Properties</h3>
                  <span className="grim-tome-sub">mechanics &amp; powers</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.properties, isAdmin) }} />
              </section>
            )}
            {!item.description && !item.properties && (
              <section className="grim-tome border border-dashed border-grim-line-2 text-center py-7 px-6 text-grim-ink-4">
                <div className="font-display text-4xl text-grim-ink-3">~ unwritten ~</div>
                <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">No further record in the reliquary</div>
              </section>
            )}

            {/* Associated NPCs */}
            {linkedNpcs.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Associated Souls</h3>
                  <span className="grim-tome-sub">{linkedNpcs.length} NPC{linkedNpcs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack gap-2">
                  {linkedNpcs.map(n => (
                    <Link key={n.id} href={`/campaign/npcs/${n.id}`} className="no-underline text-inherit block">
                      <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-head text-lg text-grim-ink tracking-wide">{n.name || n.display_name || n.aka || "Unknown"}</span>
                          {n.hidden && (isAdmin || isDM) && <span className="grim-chip is-blood text-xs py-0 px-1.5">hidden</span>}
                          {(n.nameHidden || n.hide_name) && (isAdmin || isDM) && <span className="grim-chip text-xs py-0 px-1.5 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden</span>}
                        </span>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{n.race || "—"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Associated PCs */}
            {linkedPcs.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Carried By</h3>
                  <span className="grim-tome-sub">{linkedPcs.length} PC{linkedPcs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack gap-2">
                  {linkedPcs.map(p => (
                    <Link key={p.id} href={`/campaign/pcs/${p.id}`} className="no-underline text-inherit block">
                      <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="font-head text-lg text-grim-ember-2 tracking-wide">{p.name}</span>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{p.class || "—"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Associated Locations */}
            {linkedLocations.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Associated Places</h3>
                  <span className="grim-tome-sub">{linkedLocations.length} location{linkedLocations.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack gap-2">
                  {linkedLocations.map(l => (
                    <Link key={l.id} href={`/campaign/locations/${l.id}`} className="no-underline text-inherit block">
                      <div className="flex items-center gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="font-head text-lg text-grim-arcane tracking-wide">{l.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="grim-stack gap-5.5">
            {/* GM Notes */}
            {(isDM || isAdmin) && (
              dmMode ? (
                item.gm_notes ? (
                  <section className="grim-tome border border-grim-arcane" style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head border-grim-arcane/30">
                      <h3 className="grim-tome-title text-grim-arcane">★ Master&apos;s Marginalia</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink font-body text-lg" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.gm_notes, true) }} />
                  </section>
                ) : isAdmin ? (
                  <section className="grim-tome border border-dashed border-grim-arcane/50 text-center py-5.5 px-5 text-grim-ink-4">
                    <div className="font-display text-3xl text-grim-arcane/60">~ no marginalia ~</div>
                    <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Edit to add DM notes</div>
                  </section>
                ) : null
              ) : (
                <section className="grim-tome border border-dashed border-grim-line-2 text-center py-5.5 px-5 text-grim-ink-4">
                  <div className="font-display text-3xl text-grim-ink-3">~ sealed ~</div>
                  <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Master&apos;s marginalia hidden</div>
                </section>
              )
            )}

            {/* User notes */}
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Party Notes</h3>
                <span className="grim-tome-sub">field observations</span>
              </div>
              <UserNotesEditor
                notes={item.notes || []}
                onChange={handleUpdateNotes}
                currentUser={userId}
                isAdmin={isAdmin}
                linkEntities={linkEntities}
              />
            </section>

            {/* Session appearances */}
            {linkedRecaps.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Session Appearances</h3>
                  <span className="grim-tome-sub">{linkedRecaps.length} recap{linkedRecaps.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack gap-2">
                  {[...linkedRecaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                    <Link
                      key={r.id ?? r.date}
                      href={`/campaign/recaps/${r.id ?? r.date}`}
                      className="no-underline text-inherit block"
                    >
                      <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="font-head text-lg text-grim-ink tracking-wide">{r.title}</span>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{r.date}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
