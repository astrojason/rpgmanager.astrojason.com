"use client";

import { useState, useEffect } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Item, NPC, PC } from "@/types/interfaces";
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

const CATEGORIES = ["Magic Item", "Artifact", "Stolen Journal", "Weapon", "Armor", "Consumable", "Other"];

interface EntityItem { id: string; name: string; }

export default function ItemsManagementPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Item>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const [availableNpcs, setAvailableNpcs] = useState<EntityItem[]>([]);
  const [availablePcs, setAvailablePcs] = useState<EntityItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<EntityItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, npcsRes, pcsRes, locsRes] = await Promise.all([
        authFetch("/api/data/items"),
        authFetch("/api/data/npcs"),
        authFetch("/api/data/pcs"),
        authFetch("/api/data/locations"),
      ]);
      if (!itemsRes.ok) throw new Error("Failed to load items");
      const itemsData: Item[] = await itemsRes.json();
      setItems(itemsData);

      const npcsData: NPC[] = npcsRes.ok ? await npcsRes.json() : [];
      setAvailableNpcs(npcsData.map(n => ({ id: String(n.id), name: n.name || String(n.aka) || String(n.id) })));

      const pcsData: PC[] = pcsRes.ok ? await pcsRes.json() : [];
      setAvailablePcs(pcsData.map(p => ({ id: String(p.id), name: p.name })));

      const rawLocs = locsRes.ok ? await locsRes.json() : [];
      const flat: EntityItem[] = [];
      for (const loc of rawLocs) {
        flat.push({ id: String(loc.id), name: loc.name });
        for (const sub of loc.locations ?? []) {
          flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
        }
      }
      setAvailableLocations(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredItems = items.filter(it => {
    const term = searchTerm.toLowerCase();
    return (
      it.name.toLowerCase().includes(term) ||
      (it.category ?? "").toLowerCase().includes(term) ||
      (it.type_tag ?? "").toLowerCase().includes(term)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedItem(null);
    setFormData({ name: "", category: "Magic Item", pronunciation: "", type_tag: "", description: "", properties: "", gm_notes: "", image: "", hidden: false, notes: [], tagged_npcs: [], tagged_pcs: [], tagged_locations: [] });
  };

  const handleEdit = (item: Item) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedItem(item);
    setFormData({ ...item });
  };

  const handleView = (item: Item) => {
    setSelectedItem(item);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name) { setError("Name is required"); return; }
      const method = isCreating ? "POST" : "PUT";
      const res = await authFetch("/api/data/items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save item");
      const re = await authFetch("/api/data/items");
      const updated: Item[] = await re.json();
      setItems(updated);
      setSuccess(isCreating ? "Item created!" : "Item updated!");
      setIsCreating(false);
      setIsEditing(false);
      if (formData.id) {
        const fresh = updated.find(it => String(it.id) === String(formData.id));
        setSelectedItem(fresh || null);
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    }
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await authFetch(`/api/data/items?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const re = await authFetch("/api/data/items");
      setItems(await re.json());
      setSelectedItem(null);
      setSuccess("Item deleted.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div style={{ padding: "36px 48px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
            <span className="grim-flame" />
            Consulting the armoury…
          </div>
        </div>
      </div>
    );
  }

  const linkEntities = [
    ...availableNpcs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...availablePcs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...availableLocations.map(l => ({ id: l.id, name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` })),
  ];

  return (
    <div style={{ padding: "36px 48px 80px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Relics</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Armoury &amp; Reliquary</h1>
          <p className="grim-page-sub">Catalogue weapons, armour, artefacts, and journals.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Catalogue New</button>
      </header>

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

        {/* Left: list */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="✦ Search relics…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "10px 14px", outline: "none" }}
            />
          </div>
          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-4)", marginBottom: 6, paddingLeft: 2 }}>
            {filteredItems.length} {filteredItems.length === 1 ? "relic" : "relics"}
          </div>
          <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: selectedItem?.id === item.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                    borderLeft: "2px solid " + (selectedItem?.id === item.id ? "var(--grim-ember)" : "transparent"),
                    borderBottom: "1px solid var(--grim-line)",
                  }}
                  onClick={() => handleView(item)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: selectedItem?.id === item.id ? "var(--grim-ember-2)" : "var(--grim-ink-2)", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{item.name}</span>
                        {item.hidden && <span style={{ fontSize: 10, color: "var(--grim-blood-2)", fontFamily: "var(--font-mono)", letterSpacing: ".10em" }}>HIDDEN</span>}
                      </div>
                      {item.category && (
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 2 }}>
                          {item.category}{item.type_tag ? ` · ${item.type_tag}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <a className="grim-link" style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer" }} onClick={e => { e.stopPropagation(); handleEdit(item); }}>edit</a>
                      <a style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer", color: "var(--grim-blood-2)", textDecoration: "none", borderBottom: "1px dotted var(--grim-blood-2)" }} onClick={e => { e.stopPropagation(); handleDelete(item); }}>del</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: detail/form */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "Catalogue New Relic" : "Amend the Record"}</div>
              </div>
              <form onSubmit={e => { e.preventDefault(); handleSave(); }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Name *</div>
                    <input type="text" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} style={fieldStyle} required />
                  </div>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Category</div>
                    <select value={formData.category || "Magic Item"} onChange={e => setFormData({ ...formData, category: e.target.value })} style={fieldStyle}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Pronunciation</div>
                    <input type="text" value={formData.pronunciation || ""} onChange={e => setFormData({ ...formData, pronunciation: e.target.value })} style={fieldStyle} placeholder="e.g. VOID-stone" />
                  </div>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Type Tag</div>
                    <input type="text" value={formData.type_tag || ""} onChange={e => setFormData({ ...formData, type_tag: e.target.value })} style={fieldStyle} placeholder="e.g. Wondrous Item, requires attunement" />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Image URL</div>
                  <input type="text" value={formData.image || ""} onChange={e => setFormData({ ...formData, image: e.target.value })} style={fieldStyle} placeholder="/images/items/example.png" />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Description</div>
                  <MarkdownEditor value={formData.description || ""} onChange={v => setFormData({ ...formData, description: v })} rows={5} label="Description" linkEntities={linkEntities} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Properties / Stats</div>
                  <MarkdownEditor value={formData.properties || ""} onChange={v => setFormData({ ...formData, properties: v })} rows={6} label="Properties" linkEntities={linkEntities} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>GM Notes</div>
                  <MarkdownEditor value={formData.gm_notes || ""} onChange={v => setFormData({ ...formData, gm_notes: v })} rows={5} label="GM Notes" linkEntities={linkEntities} />
                </div>

                {/* NPC tags */}
                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Associated NPCs</div>
                  <div style={{ maxHeight: 140, overflowY: "auto", padding: "8px 12px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                    {availableNpcs.map(n => {
                      const checked = (formData.tagged_npcs ?? []).includes(n.id);
                      return (
                        <label key={n.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur = new Set(formData.tagged_npcs ?? []);
                            if (e.target.checked) cur.add(n.id); else cur.delete(n.id);
                            setFormData({ ...formData, tagged_npcs: Array.from(cur) });
                          }} />
                          <span>{n.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* PC tags */}
                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Carried By (PCs)</div>
                  <div style={{ maxHeight: 100, overflowY: "auto", padding: "8px 12px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                    {availablePcs.map(p => {
                      const checked = (formData.tagged_pcs ?? []).includes(p.id);
                      return (
                        <label key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur = new Set(formData.tagged_pcs ?? []);
                            if (e.target.checked) cur.add(p.id); else cur.delete(p.id);
                            setFormData({ ...formData, tagged_pcs: Array.from(cur) });
                          }} />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Location tags */}
                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Associated Locations</div>
                  <div style={{ maxHeight: 140, overflowY: "auto", padding: "8px 12px", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                    {availableLocations.map(l => {
                      const checked = (formData.tagged_locations ?? []).includes(l.id);
                      return (
                        <label key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur = new Set(formData.tagged_locations ?? []);
                            if (e.target.checked) cur.add(l.id); else cur.delete(l.id);
                            setFormData({ ...formData, tagged_locations: Array.from(cur) });
                          }} />
                          <span>{l.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)", marginBottom: 20 }}>
                  <input type="checkbox" checked={formData.hidden || false} onChange={e => setFormData({ ...formData, hidden: e.target.checked })} />
                  <span>Hidden from players</span>
                </label>

                <hr className="grim-rule" />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="submit" className="grim-btn is-ember">✓ {isCreating ? "Catalogue" : "Save Changes"}</button>
                </div>
              </form>
            </div>

          ) : selectedItem ? (
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-gold)", lineHeight: 1, marginBottom: 6 }}>{selectedItem.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedItem.category && <span className="grim-chip">{selectedItem.category}</span>}
                    {selectedItem.hidden && <span className="grim-chip is-blood">Hidden</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(selectedItem)} className="grim-btn">✎ Edit</button>
                  <button onClick={() => handleDelete(selectedItem)} className="grim-btn is-blood">✕ Delete</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div className="grim-stack" style={{ gap: 8 }}>
                  {selectedItem.pronunciation && <div><span className="grim-label">Pronunciation </span><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--grim-ink-3)" }}>{selectedItem.pronunciation}</span></div>}
                  {selectedItem.type_tag && <div><span className="grim-label">Type </span><span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)", fontStyle: "italic" }}>{selectedItem.type_tag}</span></div>}
                  {(selectedItem.tagged_npcs?.length ?? 0) > 0 && <div><span className="grim-label">NPCs </span><span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{selectedItem.tagged_npcs?.map(id => availableNpcs.find(n => n.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_pcs?.length ?? 0) > 0 && <div><span className="grim-label">PCs </span><span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{selectedItem.tagged_pcs?.map(id => availablePcs.find(p => p.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_locations?.length ?? 0) > 0 && <div><span className="grim-label">Locations </span><span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{selectedItem.tagged_locations?.map(id => availableLocations.find(l => l.id === id)?.name || id).join(", ")}</span></div>}
                </div>
              </div>

              {selectedItem.description && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Description</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.description, true) }} />
                </div>
              )}

              {selectedItem.properties && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Properties</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.properties, true) }} />
                </div>
              )}

              {selectedItem.gm_notes && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="grim-h-section" style={{ marginBottom: 8, color: "var(--grim-arcane)" }}>★ GM Notes</h3>
                  <div className="grim-flavor" style={{ borderLeft: "2px solid var(--grim-arcane)", paddingLeft: 12 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.gm_notes, true) }} />
                </div>
              )}
            </div>

          ) : (
            <div className="grim-tome" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ink-3)", marginBottom: 12 }}>⚔</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No relic selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: 14 }}>Select a relic from the register, or catalogue a new one.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
