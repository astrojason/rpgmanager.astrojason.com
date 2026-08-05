"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Item, NPC, PC } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import EntityTagPicker from "@/components/EntityTagPicker";
import { useCrudResource } from "@/hooks/useCrudResource";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "1.25rem",
  padding: "9px 14px",
  outline: "none",
};

const CATEGORIES = ["Magic Item", "Artifact", "Stolen Journal", "Weapon", "Armor", "Consumable", "Other"];

interface EntityItem { id: string; name: string; }

export default function ItemsManagementPage() {
  const {
    items,
    loading,
    queryError,
    selected: selectedItem,
    isEditing,
    isCreating,
    isSaving,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    error,
    setError,
    success,
    confirmState,
    closeConfirm,
    handleCreate: createItem,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<Item>({
    endpoint: "/api/data/items",
    getId: (it) => it.id,
    validate: (f) => (!f.name ? "Name is required" : null),
    selectAfterSave: false,
    successMessage: (creating) => (creating ? "Item created!" : "Item updated!"),
    deleteConfirmMessage: (it) => `Delete "${it.name}"?`,
    deleteSuccessMessage: "Item deleted.",
  });

  const { data: rawNpcs = [] } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.json()),
  });
  const { data: rawPCs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.json()),
  });
  const { data: rawLocations = [] } = useQuery<{ id: string; name: string; locations?: { id: string; name: string }[] }[]>({
    queryKey: ['/api/data/locations'],
    queryFn: () => authFetch('/api/data/locations').then(r => r.json()),
  });

  const availableNpcs = useMemo<EntityItem[]>(() =>
    rawNpcs.map(n => ({ id: String(n.id), name: n.name || String(n.aka) || String(n.id) })),
    [rawNpcs]
  );
  const availablePcs = useMemo<EntityItem[]>(() =>
    rawPCs.map(p => ({ id: String(p.id), name: p.name })),
    [rawPCs]
  );
  const availableLocations = useMemo<EntityItem[]>(() => {
    const flat: EntityItem[] = [];
    for (const loc of rawLocations) {
      flat.push({ id: String(loc.id), name: loc.name });
      for (const sub of loc.locations ?? []) flat.push({ id: String(sub.id), name: `${loc.name} · ${sub.name}` });
    }
    return flat;
  }, [rawLocations]);

  const filteredItems = items.filter(it => {
    const term = searchTerm.toLowerCase();
    return (
      it.name.toLowerCase().includes(term) ||
      (it.category ?? "").toLowerCase().includes(term) ||
      (it.type_tag ?? "").toLowerCase().includes(term)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleCreate = () => {
    createItem({ name: "", category: "Magic Item", pronunciation: "", type_tag: "", description: "", properties: "", gm_notes: "", image: "", hidden: false, notes: [], tagged_npcs: [], tagged_pcs: [], tagged_locations: [] });
  };

  if (loading) {
    return (
      <div style={{ padding: "36px 48px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: "1rem", letterSpacing: ".18em", textTransform: "uppercase" }}>
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
          <h1 className="grim-page-title" style={{ fontSize: "4.8333rem" }}>The Armoury &amp; Reliquary</h1>
          <p className="grim-page-sub">Catalogue weapons, armour, artefacts, and journals.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Catalogue New</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* Left: list */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="✦ Search relics…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: "1.25rem", padding: "10px 14px", outline: "none" }}
            />
          </div>
          <div className="grim-mono" style={{ fontSize: "0.8333rem", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-4)", marginBottom: 6, paddingLeft: 2 }}>
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
                      <div style={{ fontFamily: "var(--font-head)", fontSize: "1.1667rem", color: selectedItem?.id === item.id ? "var(--grim-ember-2)" : "var(--grim-ink-2)", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{item.name}</span>
                        {item.hidden && <span style={{ fontSize: "0.8333rem", color: "var(--grim-blood-2)", fontFamily: "var(--font-mono)", letterSpacing: ".10em" }}>HIDDEN</span>}
                      </div>
                      {item.category && (
                        <div className="grim-mono" style={{ fontSize: "0.8333rem", color: "var(--grim-ink-4)", marginTop: 2 }}>
                          {item.category}{item.type_tag ? ` · ${item.type_tag}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <a className="grim-link" style={{ fontSize: "0.9166rem", fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer" }} onClick={e => { e.stopPropagation(); handleEdit(item); }}>edit</a>
                      <a style={{ fontSize: "0.9166rem", fontFamily: "var(--font-head)", letterSpacing: ".10em", textTransform: "uppercase", cursor: "pointer", color: "var(--grim-blood-2)", textDecoration: "none", borderBottom: "1px dotted var(--grim-blood-2)" }} onClick={e => { e.stopPropagation(); handleDelete(item); }}>del</a>
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
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Catalogue" : "Save Changes"}`}</button>
                </div>
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

                {/* Entity tags */}
                <div style={{ marginBottom: 16 }}>
                  <div className="grim-label" style={{ marginBottom: 6 }}>Associations</div>
                  <EntityTagPicker
                    npcs={availableNpcs}
                    pcs={availablePcs}
                    locations={availableLocations}
                    selectedNpcs={formData.tagged_npcs ?? []}
                    selectedPcs={formData.tagged_pcs ?? []}
                    selectedLocations={formData.tagged_locations ?? []}
                    onNpcsChange={ids => setFormData({ ...formData, tagged_npcs: ids })}
                    onPcsChange={ids => setFormData({ ...formData, tagged_pcs: ids })}
                    onLocationsChange={ids => setFormData({ ...formData, tagged_locations: ids })}
                  />
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "1.1667rem", color: "var(--grim-ink-2)", marginBottom: 20 }}>
                  <input type="checkbox" checked={formData.hidden || false} onChange={e => setFormData({ ...formData, hidden: e.target.checked })} />
                  <span>Hidden from players</span>
                </label>

                <hr className="grim-rule" />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="submit" className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Catalogue" : "Save Changes"}`}</button>
                </div>
              </form>
            </div>

          ) : selectedItem ? (
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--grim-gold)", lineHeight: 1, marginBottom: 6 }}>{selectedItem.name}</div>
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
                  {selectedItem.pronunciation && <div><span className="grim-label">Pronunciation </span><span style={{ fontFamily: "var(--font-mono)", fontSize: "1.0833rem", color: "var(--grim-ink-3)" }}>{selectedItem.pronunciation}</span></div>}
                  {selectedItem.type_tag && <div><span className="grim-label">Type </span><span style={{ fontFamily: "var(--font-body)", fontSize: "1.1667rem", color: "var(--grim-ink-2)", fontStyle: "italic" }}>{selectedItem.type_tag}</span></div>}
                  {(selectedItem.tagged_npcs?.length ?? 0) > 0 && <div><span className="grim-label">NPCs </span><span style={{ fontFamily: "var(--font-body)", fontSize: "1.0833rem", color: "var(--grim-ink-2)" }}>{selectedItem.tagged_npcs?.map(id => availableNpcs.find(n => n.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_pcs?.length ?? 0) > 0 && <div><span className="grim-label">PCs </span><span style={{ fontFamily: "var(--font-body)", fontSize: "1.0833rem", color: "var(--grim-ink-2)" }}>{selectedItem.tagged_pcs?.map(id => availablePcs.find(p => p.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_locations?.length ?? 0) > 0 && <div><span className="grim-label">Locations </span><span style={{ fontFamily: "var(--font-body)", fontSize: "1.0833rem", color: "var(--grim-ink-2)" }}>{selectedItem.tagged_locations?.map(id => availableLocations.find(l => l.id === id)?.name || id).join(", ")}</span></div>}
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
              <div style={{ fontFamily: "var(--font-display)", fontSize: "3.3333rem", color: "var(--grim-ink-3)", marginBottom: 12 }}>⚔</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: "1.3334rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No relic selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: "1.1667rem" }}>Select a relic from the register, or catalogue a new one.</div>
            </div>
          )}
        </div>
      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
