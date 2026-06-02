"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { Item, UserNote } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import UserNotesEditor from "@/components/UserNotesEditor";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "Magic Item", label: "Magic" },
  { id: "Artifact", label: "Artifacts" },
  { id: "Stolen Journal", label: "Journals" },
  { id: "Weapon", label: "Weapons" },
  { id: "Armor", label: "Armor" },
  { id: "Consumable", label: "Consumables" },
  { id: "Other", label: "Other" },
];

function categoryChipStyle(category: string): React.CSSProperties {
  const c = (category || "").toLowerCase();
  if (c.includes("magic")) return { background: "oklch(0.55 0.150 285 / 0.18)", border: "1px solid oklch(0.55 0.150 285 / 0.45)", color: "var(--grim-arcane)" };
  if (c.includes("artifact")) return { background: "oklch(0.72 0.165 48 / 0.14)", border: "1px solid oklch(0.72 0.165 48 / 0.45)", color: "var(--grim-ember-2)" };
  if (c.includes("journal")) return { background: "oklch(0.55 0.090 145 / 0.14)", border: "1px solid oklch(0.55 0.090 145 / 0.45)", color: "var(--grim-moss)" };
  return { background: "oklch(0.72 0.12 78 / 0.12)", border: "1px solid oklch(0.72 0.12 78 / 0.35)", color: "var(--grim-gold)" };
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item>>({});

  const router = useRouter();
  const isAdmin = useIsAdmin();
  const userId = useEffectiveUserId();

  usePageTracking();

  const loadItems = async () => {
    try {
      const res = await authFetch("/api/data/items");
      if (res.ok) {
        const data: Item[] = await res.json();
        setItems(data);
      }
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const visibleItems = items.filter(it => isAdmin || !it.hidden);

  const filteredItems = visibleItems.filter(it => {
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = term === "" ||
      it.name.toLowerCase().includes(term) ||
      (it.type_tag ?? "").toLowerCase().includes(term) ||
      (it.description ?? "").toLowerCase().includes(term) ||
      (it.category ?? "").toLowerCase().includes(term);
    const matchCategory = categoryFilter === "all" || it.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const sortedItems = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddItem = async (data: Partial<Item>) => {
    try {
      const res = await authFetch("/api/data/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await loadItems();
        setShowAddForm(false);
        setEditingItem({});
      }
    } catch { /* noop */ }
  };

  const handleUpdateNotes = async (item: Item, notes: UserNote[]) => {
    try {
      await authFetch("/api/data/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, notes }),
      });
      await loadItems();
    } catch { /* noop */ }
  };

  const startAdding = () => {
    setEditingItem({ name: "", category: "Magic Item", pronunciation: "", type_tag: "", description: "", properties: "", image: "", hidden: false, notes: [] });
    setShowAddForm(true);
  };

  const previewItem = selectedItem || sortedItems[0] || null;

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the armoury&hellip;
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Admin add modal */}
      {showAddForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowAddForm(false); setEditingItem({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Catalogue New Relic
            </h2>
            <form onSubmit={e => { e.preventDefault(); handleAddItem(editingItem); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { label: "Name", field: "name" as keyof Item, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Item, full: false },
                  { label: "Type Tag (e.g. Wondrous Item, requires attunement)", field: "type_tag" as keyof Item, full: true },
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
                    {CATEGORIES.filter(c => c.id !== "all").map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Description</label>
                <MarkdownEditor value={editingItem.description || ""} onChange={v => setEditingItem({ ...editingItem, description: v })} rows={4} label="Description" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Properties / Stats</label>
                <MarkdownEditor value={editingItem.properties || ""} onChange={v => setEditingItem({ ...editingItem, properties: v })} rows={5} label="Properties" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>GM Notes</label>
                <MarkdownEditor value={editingItem.gm_notes || ""} onChange={v => setEditingItem({ ...editingItem, gm_notes: v })} rows={4} label="GM Notes" />
              </div>
              <div>
                <UserNotesEditor notes={editingItem.notes || []} onChange={notes => setEditingItem({ ...editingItem, notes })} currentUser={userId} isAdmin={isAdmin} className="mt-2" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink-2)", letterSpacing: ".04em" }}>
                <input type="checkbox" checked={Boolean(editingItem.hidden)} onChange={e => setEditingItem({ ...editingItem, hidden: e.target.checked })} style={{ accentColor: "var(--grim-ember)" }} />
                Hidden from players
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--grim-line)" }}>
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingItem({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Catalogue Relic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <div className="grim-page-eyebrow">Volume the Sixth</div>
            <h1 className="grim-page-title">The Armoury &amp; Reliquary</h1>
            <p className="grim-page-sub">{visibleItems.length} relic{visibleItems.length !== 1 ? "s" : ""} catalogued; every blade, shard, and secret the party carries.</p>
          </div>
          {isAdmin && (
            <button className="grim-btn is-ember" onClick={startAdding}>+ Catalogue New</button>
          )}
        </div>

        {/* Search + category filters */}
        <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Seek a relic, a power, a name…"
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16, padding: "12px 16px 12px 42px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18 }}>⚔</span>
          </div>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)", overflow: "hidden", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`grim-btn ${categoryFilter === cat.id ? "is-ember" : "is-ghost"}`}
                style={{ padding: "6px 12px", border: `1px solid ${categoryFilter === cat.id ? "var(--grim-ember)" : "transparent"}`, background: categoryFilter === cat.id ? undefined : "transparent" }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Two-pane: grid + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22 }}>

          {/* Item grid */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 className="grim-h-section">Of what was found and taken</h2>
              <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
                {sortedItems.length} of {visibleItems.length} shown
              </div>
            </div>

            {sortedItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ the vaults are empty ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>Adjust thy search or filters</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {sortedItems.map(item => (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => router.push(`/campaign/items/${item.id}`)}
                    className="grim-tome"
                    style={{
                      padding: "16px 18px",
                      cursor: "pointer",
                      border: `1px solid ${selectedItem?.id === item.id ? "var(--grim-ember)" : hoveredItem?.id === item.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                      transform: hoveredItem?.id === item.id ? "translateY(-2px)" : "none",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                      position: "relative",
                    }}
                  >
                    {item.hidden && isAdmin && (
                      <span className="grim-mono" style={{ position: "absolute", top: 8, right: 10, fontSize: 9, letterSpacing: ".14em", color: "var(--grim-blood-2)", textTransform: "uppercase" }}>hidden</span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="grim-chip" style={{ fontSize: 9, padding: "2px 7px", ...categoryChipStyle(item.category) }}>
                        {item.category || "Item"}
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em" }}>
                      {item.name}
                    </div>
                    {item.pronunciation && (
                      <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", marginTop: 2 }}>
                        ({item.pronunciation})
                      </div>
                    )}
                    {item.type_tag && (
                      <div style={{ fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 12, color: "var(--grim-ink-3)", marginTop: 4 }}>
                        {item.type_tag}
                      </div>
                    )}
                    {item.description && (
                      <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.45, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside style={{ position: "sticky", top: 0, alignSelf: "flex-start" }}>
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
              {/* Preview header icon */}
              <div style={{ height: 120, background: "linear-gradient(180deg, var(--grim-bg-3), var(--grim-bg-2))", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--grim-line)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 72, color: "var(--grim-gold-2)", opacity: 0.4 }}>⚔</span>
              </div>
              <div style={{ padding: 16 }}>
                {(hoveredItem || previewItem) ? (() => {
                  const it = hoveredItem || previewItem!;
                  return (
                    <>
                      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>Relic Ledger</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-gold)", lineHeight: 1, marginTop: 2 }}>{it.name}</div>
                      {it.pronunciation && (
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)", letterSpacing: ".14em", marginTop: 2 }}>({it.pronunciation})</div>
                      )}
                      <hr className="grim-rule" />
                      <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
                        {[["Category", it.category], ["Type", it.type_tag || "—"]].map(([k, v], i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 4, borderBottom: "1px dotted var(--grim-line)" }}>
                            <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                          </div>
                        ))}
                      </div>
                      <hr className="grim-rule" />
                      <button
                        className="grim-btn is-ember"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() => router.push(`/campaign/items/${it.id}`)}
                      >
                        Open Ledger Entry ›
                      </button>
                    </>
                  );
                })() : (
                  <div style={{ textAlign: "center", padding: "12px 0", color: "var(--grim-ink-4)" }}>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>Hover to preview</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tally */}
            <div className="grim-tome">
              <h3 className="grim-tome-title" style={{ fontSize: 13, marginBottom: 0 }}>Tally of the Armoury</h3>
              <hr className="grim-rule" style={{ margin: "10px 0 12px" }} />
              <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
                {CATEGORIES.filter(c => c.id !== "all").map(cat => {
                  const count = visibleItems.filter(it => it.category === cat.id).length;
                  if (!count) return null;
                  return (
                    <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--grim-ink-2)" }}>
                      <span>{cat.label}</span>
                      <span style={{ fontFamily: "var(--font-display)", color: "var(--grim-gold)", fontSize: 16 }}>{count}</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--grim-ink-2)", paddingTop: 6, borderTop: "1px dashed var(--grim-line)" }}>
                  <span>Total</span>
                  <span style={{ fontFamily: "var(--font-display)", color: "var(--grim-gold)", fontSize: 16 }}>{visibleItems.length}</span>
                </div>
              </div>
            </div>

            {/* User notes on selected item */}
            {selectedItem && (
              <div className="grim-tome" style={{ marginTop: 14 }}>
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Party Notes</h3>
                  <span className="grim-tome-sub">field observations</span>
                </div>
                <UserNotesEditor
                  notes={selectedItem.notes || []}
                  onChange={notes => handleUpdateNotes(selectedItem, notes)}
                  currentUser={userId}
                  isAdmin={isAdmin}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
