"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { Item } from "@/types/interfaces";
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

function categoryChipStyle(category: string): { className: string; style?: React.CSSProperties } {
  const c = (category || "").toLowerCase();
  if (c.includes("magic")) return { className: "bg-grim-arcane-2/18 border border-grim-arcane-2/45 text-grim-arcane" };
  if (c.includes("artifact")) return { className: "bg-grim-ember/14 border border-grim-ember/45 text-grim-ember-2" };
  if (c.includes("journal")) return { className: "bg-grim-moss/14 border border-grim-moss/45 text-grim-moss" };
  return { className: "text-grim-gold", style: { background: "oklch(0.72 0.12 78 / 0.12)", border: "1px solid oklch(0.72 0.12 78 / 0.35)" } };
}

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item>>({});

  const router = useRouter();
  const isAdmin = useIsAdmin();
  const userId = useEffectiveUserId();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: items = [], isPending: loading } = useQuery<Item[]>({
    queryKey: ['/api/data/items'],
    queryFn: () => authFetch('/api/data/items').then(r => r.ok ? r.json() : []),
  });

  const visibleItems = items.filter(it => isAdmin || !it.hidden);
  const hiddenCount = visibleItems.filter(it => it.hidden).length;

  const filteredItems = visibleItems.filter(it => {
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = term === "" ||
      it.name.toLowerCase().includes(term) ||
      (it.type_tag ?? "").toLowerCase().includes(term) ||
      (it.description ?? "").toLowerCase().includes(term) ||
      (it.category ?? "").toLowerCase().includes(term);
    const matchCategory = categoryFilter === "all" || it.category === categoryFilter;
    const matchHidden = !hiddenOnly || it.hidden;
    return matchSearch && matchCategory && matchHidden;
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
        await queryClient.invalidateQueries({ queryKey: ['/api/data/items'] });
        setShowAddForm(false);
        setEditingItem({});
      }
    } catch { /* noop */ }
  };

  const startAdding = () => {
    setEditingItem({ name: "", category: "Magic Item", pronunciation: "", type_tag: "", description: "", properties: "", image: "", hidden: false, notes: [] });
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowAddForm(false); setEditingItem({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 w-full overflow-y-auto m-4 p-8"
            style={{ maxWidth: 640, maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Catalogue New Relic
            </h2>
            <form onSubmit={e => { e.preventDefault(); handleAddItem(editingItem); }} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Name", field: "name" as keyof Item, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Item, full: false },
                  { label: "Type Tag (e.g. Wondrous Item, requires attunement)", field: "type_tag" as keyof Item, full: true },
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
                    {CATEGORIES.filter(c => c.id !== "all").map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Description</label>
                <MarkdownEditor value={editingItem.description || ""} onChange={v => setEditingItem({ ...editingItem, description: v })} rows={4} label="Description" linkEntities={items.map(it => ({ id: String(it.id), name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` }))} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Properties / Stats</label>
                <MarkdownEditor value={editingItem.properties || ""} onChange={v => setEditingItem({ ...editingItem, properties: v })} rows={5} label="Properties" linkEntities={items.map(it => ({ id: String(it.id), name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` }))} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">GM Notes</label>
                <MarkdownEditor value={editingItem.gm_notes || ""} onChange={v => setEditingItem({ ...editingItem, gm_notes: v })} rows={4} label="GM Notes" linkEntities={items.map(it => ({ id: String(it.id), name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` }))} />
              </div>
              <div>
                <UserNotesEditor notes={editingItem.notes || []} onChange={notes => setEditingItem({ ...editingItem, notes })} currentUser={userId} isAdmin={isAdmin} className="mt-2" linkEntities={items.map(it => ({ id: String(it.id), name: it.name, type: 'item' as const, url: `/campaign/items/${it.id}` }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-head text-lg text-grim-ink-2 tracking-wider">
                <input type="checkbox" checked={Boolean(editingItem.hidden)} onChange={e => setEditingItem({ ...editingItem, hidden: e.target.checked })} className="accent-grim-ember" />
                Hidden from players
              </label>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingItem({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Catalogue Relic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

        {/* Page header */}
        <div className="flex justify-between items-end mb-5.5">
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
        <section className="flex gap-3 items-stretch mb-5.5 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Seek a relic, a power, a name…"
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
            />
            <span
              className="absolute left-3.5 text-grim-gold-2 text-2xl"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >⚔</span>
          </div>
          <div className="flex gap-1 p-1 bg-grim-bg-3 border border-grim-line overflow-hidden flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`grim-btn ${categoryFilter === cat.id ? "is-ember" : "is-ghost"} py-1.5 px-3 border ${categoryFilter === cat.id ? "border-grim-ember" : "border-transparent"} ${categoryFilter === cat.id ? "" : "bg-transparent"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={() => setHiddenOnly(v => !v)}
              className={`grim-btn ${hiddenOnly ? "is-blood" : "is-ghost"} py-1.5 px-3 border ${hiddenOnly ? "border-grim-blood-2" : "border-grim-line"} ${hiddenOnly ? "" : "bg-transparent"}`}
            >
              Hidden Only
              <span className="grim-mono text-sm opacity-70 ml-1.5">{hiddenCount}</span>
            </button>
          )}
        </section>

        {/* Item grid */}
        <section>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="grim-h-section">Of what was found and taken</h2>
            <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
              {sortedItems.length} of {visibleItems.length} shown
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <div className="text-center py-12 px-6 text-grim-ink-4">
              <div className="font-display text-5xl text-grim-ink-3">~ the vaults are empty ~</div>
              <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">Adjust thy search or filters</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {sortedItems.map(item => {
                const chip = categoryChipStyle(item.category);
                return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/campaign/items/${item.id}`)}
                  className="grim-tome py-4 px-4.5 cursor-pointer border border-grim-line relative"
                  style={{ transition: "transform 0.15s ease, border-color 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
                >
                  {item.hidden && isAdmin && (
                    <span className="grim-mono absolute top-2 right-2.5 text-xs tracking-wider-3 text-grim-blood-2 uppercase">hidden</span>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`grim-chip text-xs py-0.5 px-1.75 ${chip.className}`} style={chip.style}>
                      {item.category || "Item"}
                    </span>
                  </div>
                  <div className="font-display text-3xl text-grim-gold leading-none tracking-normal">
                    {item.name}
                  </div>
                  {item.pronunciation && (
                    <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 mt-0.5">
                      ({item.pronunciation})
                    </div>
                  )}
                  {item.type_tag && (
                    <div className="font-body italic text-base text-grim-ink-3 mt-1">
                      {item.type_tag}
                    </div>
                  )}
                  {item.description && (
                    <div className="text-base text-grim-ink-2 mt-2 line-clamp-3" style={{ lineHeight: 1.45 }}>
                      {item.description}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
