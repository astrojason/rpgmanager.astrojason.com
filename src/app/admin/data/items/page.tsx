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

const fieldClass =
  "w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none";

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
      <div className="pt-9 px-12 pb-20">
        <div className="flex items-center justify-center h-50">
          <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
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
    <div className="pt-9 px-12 pb-20">
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Relics</div>
          <h1 className="grim-page-title">The Armoury &amp; Reliquary</h1>
          <p className="grim-page-sub">Catalogue weapons, armour, artefacts, and journals.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Catalogue New</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* Left: list */}
        <div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="✦ Search relics…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            />
          </div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase text-grim-ink-4 mb-1.5 pl-0.5">
            {filteredItems.length} {filteredItems.length === 1 ? "relic" : "relics"}
          </div>
          <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`py-3 px-4 cursor-pointer border-b border-grim-line border-l-2 ${selectedItem?.id === item.id ? "border-l-grim-ember" : "border-l-transparent"}`}
                  style={{
                    background: selectedItem?.id === item.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                  }}
                  onClick={() => handleView(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-head text-lg flex items-center gap-1.5 ${selectedItem?.id === item.id ? "text-grim-ember-2" : "text-grim-ink-2"}`} style={{ lineHeight: 1.2 }}>
                        <span>{item.name}</span>
                        {item.hidden && <span className="text-sm text-grim-blood-2 font-mono tracking-widest">HIDDEN</span>}
                      </div>
                      {item.category && (
                        <div className="grim-mono text-sm text-grim-ink-4 mt-0.5">
                          {item.category}{item.type_tag ? ` · ${item.type_tag}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a className="grim-link text-sm font-head tracking-widest uppercase cursor-pointer" onClick={e => { e.stopPropagation(); handleEdit(item); }}>edit</a>
                      <a className="text-sm font-head tracking-widest uppercase cursor-pointer text-grim-blood-2 no-underline border-b border-dotted border-grim-blood-2" onClick={e => { e.stopPropagation(); handleDelete(item); }}>del</a>
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
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Catalogue" : "Save Changes"}`}</button>
                </div>
              </div>
              <form onSubmit={e => { e.preventDefault(); handleSave(); }}>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="grim-label mb-1.5">Name *</div>
                    <input type="text" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} className={fieldClass} required />
                  </div>
                  <div>
                    <div className="grim-label mb-1.5">Category</div>
                    <select value={formData.category || "Magic Item"} onChange={e => setFormData({ ...formData, category: e.target.value })} className={fieldClass}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="grim-label mb-1.5">Pronunciation</div>
                    <input type="text" value={formData.pronunciation || ""} onChange={e => setFormData({ ...formData, pronunciation: e.target.value })} className={fieldClass} placeholder="e.g. VOID-stone" />
                  </div>
                  <div>
                    <div className="grim-label mb-1.5">Type Tag</div>
                    <input type="text" value={formData.type_tag || ""} onChange={e => setFormData({ ...formData, type_tag: e.target.value })} className={fieldClass} placeholder="e.g. Wondrous Item, requires attunement" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Image URL</div>
                  <input type="text" value={formData.image || ""} onChange={e => setFormData({ ...formData, image: e.target.value })} className={fieldClass} placeholder="/images/items/example.png" />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Description</div>
                  <MarkdownEditor value={formData.description || ""} onChange={v => setFormData({ ...formData, description: v })} rows={5} label="Description" linkEntities={linkEntities} />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">Properties / Stats</div>
                  <MarkdownEditor value={formData.properties || ""} onChange={v => setFormData({ ...formData, properties: v })} rows={6} label="Properties" linkEntities={linkEntities} />
                </div>

                <div className="mb-4">
                  <div className="grim-label mb-1.5">GM Notes</div>
                  <MarkdownEditor value={formData.gm_notes || ""} onChange={v => setFormData({ ...formData, gm_notes: v })} rows={5} label="GM Notes" linkEntities={linkEntities} />
                </div>

                {/* Entity tags */}
                <div className="mb-4">
                  <div className="grim-label mb-1.5">Associations</div>
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

                <label className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2 mb-5">
                  <input type="checkbox" checked={formData.hidden || false} onChange={e => setFormData({ ...formData, hidden: e.target.checked })} />
                  <span>Hidden from players</span>
                </label>

                <hr className="grim-rule" />
                <div className="flex items-center justify-end gap-2.5">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="submit" className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Catalogue" : "Save Changes"}`}</button>
                </div>
              </form>
            </div>

          ) : selectedItem ? (
            <div className="grim-tome">
              <div className="grim-tome-head">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-5xl text-grim-gold leading-none mb-1.5">{selectedItem.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.category && <span className="grim-chip">{selectedItem.category}</span>}
                    {selectedItem.hidden && <span className="grim-chip is-blood">Hidden</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(selectedItem)} className="grim-btn">✎ Edit</button>
                  <button onClick={() => handleDelete(selectedItem)} className="grim-btn is-blood">✕ Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  {selectedItem.pronunciation && <div><span className="grim-label">Pronunciation </span><span className="font-mono text-lg text-grim-ink-3">{selectedItem.pronunciation}</span></div>}
                  {selectedItem.type_tag && <div><span className="grim-label">Type </span><span className="font-body text-lg text-grim-ink-2 italic">{selectedItem.type_tag}</span></div>}
                  {(selectedItem.tagged_npcs?.length ?? 0) > 0 && <div><span className="grim-label">NPCs </span><span className="font-body text-lg text-grim-ink-2">{selectedItem.tagged_npcs?.map(id => availableNpcs.find(n => n.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_pcs?.length ?? 0) > 0 && <div><span className="grim-label">PCs </span><span className="font-body text-lg text-grim-ink-2">{selectedItem.tagged_pcs?.map(id => availablePcs.find(p => p.id === id)?.name || id).join(", ")}</span></div>}
                  {(selectedItem.tagged_locations?.length ?? 0) > 0 && <div><span className="grim-label">Locations </span><span className="font-body text-lg text-grim-ink-2">{selectedItem.tagged_locations?.map(id => availableLocations.find(l => l.id === id)?.name || id).join(", ")}</span></div>}
                </div>
              </div>

              {selectedItem.description && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Description</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.description, true) }} />
                </div>
              )}

              {selectedItem.properties && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8 }}>Properties</h3>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.properties, true) }} />
                </div>
              )}

              {selectedItem.gm_notes && (
                <div className="mt-5.5">
                  <h3 className="grim-h-section" style={{ marginBottom: 8, color: "var(--grim-arcane)" }}>★ GM Notes</h3>
                  <div className="grim-flavor border-l-2 border-l-grim-arcane pl-3" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedItem.gm_notes, true) }} />
                </div>
              )}
            </div>

          ) : (
            <div className="grim-tome text-center" style={{ padding: "60px 24px" }}>
              <div className="font-display text-5xl text-grim-ink-3 mb-3">⚔</div>
              <div className="font-head text-xl tracking-wider uppercase text-grim-ink-2 mb-2">No relic selected</div>
              <div className="text-grim-ink-4 text-lg">Select a relic from the register, or catalogue a new one.</div>
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
