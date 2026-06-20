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

function categoryChipStyle(category: string): React.CSSProperties {
  const c = (category || "").toLowerCase();
  if (c.includes("magic")) return { background: "oklch(0.55 0.150 285 / 0.18)", border: "1px solid oklch(0.55 0.150 285 / 0.45)", color: "var(--grim-arcane)" };
  if (c.includes("artifact")) return { background: "oklch(0.72 0.165 48 / 0.14)", border: "1px solid oklch(0.72 0.165 48 / 0.45)", color: "var(--grim-ember-2)" };
  if (c.includes("journal")) return { background: "oklch(0.55 0.090 145 / 0.14)", border: "1px solid oklch(0.55 0.090 145 / 0.45)", color: "var(--grim-moss)" };
  return { background: "oklch(0.72 0.12 78 / 0.12)", border: "1px solid oklch(0.72 0.12 78 / 0.35)", color: "var(--grim-gold)" };
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
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the reliquary&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ padding: "36px 56px 80px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/items")}>‹ Back to the Armoury</button>
        <div style={{ marginTop: 32, textAlign: "center", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ relic not found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>No record of this artefact in the ledger</div>
        </div>
      </div>
    );
  }

  // Backlinks
  const linkedRecaps = recaps.filter(r => (r.tagged_items ?? []).includes(id));
  const linkedNpcs = npcs.filter(n => (item.tagged_npcs ?? []).includes(String(n.id)));
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowEditForm(false); setEditingItem({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Amend the Ledger Entry
            </h2>
            <form onSubmit={e => { e.preventDefault(); handleSave(editingItem); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { label: "Name", field: "name" as keyof Item, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Item, full: false },
                  { label: "Type Tag", field: "type_tag" as keyof Item, full: true },
                  { label: "Image URL", field: "image" as keyof Item, full: true },
                ] as { label: string; field: keyof Item; full: boolean }[]).map(({ label, field, full }) => (
                  <div key={field} style={full ? { gridColumn: "1 / -1" } : {}}>
                    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>{label}</label>
                    <input
                      type="text"
                      value={(editingItem[field] as string) || ""}
                      onChange={e => setEditingItem({ ...editingItem, [field]: e.target.value })}
                      style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Category</label>
                  <select
                    value={editingItem.category || "Magic Item"}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Description</label>
                <MarkdownEditor value={editingItem.description || ""} onChange={v => setEditingItem({ ...editingItem, description: v })} rows={4} label="Description" linkEntities={linkEntities} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Properties / Stats</label>
                <MarkdownEditor value={editingItem.properties || ""} onChange={v => setEditingItem({ ...editingItem, properties: v })} rows={5} label="Properties" linkEntities={linkEntities} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>GM Notes</label>
                <MarkdownEditor value={editingItem.gm_notes || ""} onChange={v => setEditingItem({ ...editingItem, gm_notes: v })} rows={4} label="GM Notes" linkEntities={linkEntities} />
              </div>

              {/* Tag NPCs, PCs, Locations */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Associated NPCs</label>
                <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 160, overflowY: "auto", padding: "6px 0" }}>
                  {availableNpcs.map(n => (
                    <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (editingItem.tagged_npcs ?? []).includes(n.id) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent" }}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_npcs ?? []).includes(n.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_npcs ?? [];
                          setEditingItem({ ...editingItem, tagged_npcs: e.target.checked ? [...cur, n.id] : cur.filter(x => x !== n.id) });
                        }}
                        style={{ accentColor: "var(--grim-ember)" }}
                      />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{n.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Associated PCs</label>
                <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 120, overflowY: "auto", padding: "6px 0" }}>
                  {availablePcs.map(p => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (editingItem.tagged_pcs ?? []).includes(p.id) ? "oklch(0.55 0.090 145 / 0.12)" : "transparent" }}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_pcs ?? []).includes(p.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_pcs ?? [];
                          setEditingItem({ ...editingItem, tagged_pcs: e.target.checked ? [...cur, p.id] : cur.filter(x => x !== p.id) });
                        }}
                        style={{ accentColor: "var(--grim-moss)" }}
                      />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Associated Locations</label>
                <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 160, overflowY: "auto", padding: "6px 0" }}>
                  {locations.map(l => (
                    <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (editingItem.tagged_locations ?? []).includes(l.id) ? "oklch(0.55 0.150 285 / 0.12)" : "transparent" }}>
                      <input
                        type="checkbox"
                        checked={(editingItem.tagged_locations ?? []).includes(l.id)}
                        onChange={e => {
                          const cur = editingItem.tagged_locations ?? [];
                          setEditingItem({ ...editingItem, tagged_locations: e.target.checked ? [...cur, l.id] : cur.filter(x => x !== l.id) });
                        }}
                        style={{ accentColor: "var(--grim-arcane)" }}
                      />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{l.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink-2)", letterSpacing: ".04em" }}>
                <input type="checkbox" checked={Boolean(editingItem.hidden)} onChange={e => setEditingItem({ ...editingItem, hidden: e.target.checked })} style={{ accentColor: "var(--grim-ember)" }} />
                Hidden from players
              </label>
              {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--grim-line)" }}>
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingItem({}); setError(""); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                  {isSaving ? <><span className="grim-flame" style={{ width: 8, height: 8 }} /> Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM DETAIL */}
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div className="grim-row" style={{ gap: 18 }}>
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/items")}>
              ‹ Back to the Armoury
            </button>
            <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
              reliquary / {item.name.toLowerCase()}
            </div>
          </div>
          <div className="grim-row" style={{ gap: 8 }}>
            {(isDM || isAdmin) && (
              <button
                className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
                onClick={() => setDmMode(!dmMode)}
              >
                <span className="grim-flame" style={{ width: 6, height: 6 }} />
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
        <section style={{ marginBottom: 28 }}>
          <div className="grim-page-eyebrow">Ledger Entry — Reliquary</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 68, color: "var(--grim-gold)", margin: "2px 0 6px", lineHeight: 0.92, letterSpacing: ".01em", textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
            {item.name}
          </h1>
          {item.pronunciation && (
            <div style={{ fontFamily: "var(--font-body)", color: "var(--grim-ink-2)", fontSize: 17 }}>
              pronounced <b style={{ fontFamily: "var(--font-head)", letterSpacing: ".10em" }}>{item.pronunciation}</b>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span className="grim-chip" style={{ fontSize: 10, ...categoryChipStyle(item.category) }}>{item.category || "Item"}</span>
            {item.type_tag && (
              <span style={{ fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 14, color: "var(--grim-ink-3)" }}>
                {item.type_tag}
              </span>
            )}
            {item.hidden && isAdmin && (
              <span className="grim-chip is-blood" style={{ fontSize: 10 }}>hidden from players</span>
            )}
          </div>
        </section>

        {/* Description parchment */}
        {item.description && (
          <section className="grim-parchment" style={{ marginBottom: 28 }}>
            <div className="prose dark:prose-invert max-w-none prose-sm" style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "oklch(0.25 0.03 50)" }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.description, isAdmin) }} />
          </section>
        )}

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 22 }}>

          {/* Left column */}
          <div className="grim-stack" style={{ gap: 22 }}>
            {item.properties && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Properties</h3>
                  <span className="grim-tome-sub">mechanics &amp; powers</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.properties, isAdmin) }} />
              </section>
            )}
            {!item.description && !item.properties && (
              <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "28px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-ink-3)" }}>~ unwritten ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>No further record in the reliquary</div>
              </section>
            )}

            {/* Associated NPCs */}
            {linkedNpcs.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Associated Souls</h3>
                  <span className="grim-tome-sub">{linkedNpcs.length} NPC{linkedNpcs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack" style={{ gap: 8 }}>
                  {linkedNpcs.map(n => (
                    <Link key={n.id} href={`/campaign/npcs/${n.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{n.name || n.aka || "Unknown"}</span>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{n.race || "—"}</span>
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
                <div className="grim-stack" style={{ gap: 8 }}>
                  {linkedPcs.map(p => (
                    <Link key={p.id} href={`/campaign/pcs/${p.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ember-2)", letterSpacing: ".03em" }}>{p.name}</span>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{p.class || "—"}</span>
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
                <div className="grim-stack" style={{ gap: 8 }}>
                  {linkedLocations.map(l => (
                    <Link key={l.id} href={`/campaign/locations/${l.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-arcane)", letterSpacing: ".03em" }}>{l.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="grim-stack" style={{ gap: 22 }}>
            {/* GM Notes */}
            {(isDM || isAdmin) && (
              dmMode ? (
                item.gm_notes ? (
                  <section className="grim-tome" style={{ border: "1px solid var(--grim-arcane)", background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head" style={{ borderColor: "oklch(0.65 0.150 285 / 0.30)" }}>
                      <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>★ Master&apos;s Marginalia</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(item.gm_notes, true) }} />
                  </section>
                ) : isAdmin ? (
                  <section className="grim-tome" style={{ border: "1px dashed oklch(0.65 0.150 285 / 0.5)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "oklch(0.65 0.150 285 / 0.6)" }}>~ no marginalia ~</div>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Edit to add DM notes</div>
                  </section>
                ) : null
              ) : (
                <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--grim-ink-3)" }}>~ sealed ~</div>
                  <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Master&apos;s marginalia hidden</div>
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
                <div className="grim-stack" style={{ gap: 8 }}>
                  {[...linkedRecaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                    <Link
                      key={r.id ?? r.date}
                      href={`/campaign/recaps/${r.id ?? r.date}`}
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{r.title}</span>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{r.date}</span>
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
