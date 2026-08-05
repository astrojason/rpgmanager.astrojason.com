"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Deity, UserNote } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import MarkdownEditor from "@/components/MarkdownEditor";
import UserNotesEditor from "@/components/UserNotesEditor";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import EntityTagPicker from "@/components/EntityTagPicker";
import Image from "next/image";
import { safeImageSrc } from "@/utils/sanitize";
import { useCrudResource } from "@/hooks/useCrudResource";

const inputStyle: React.CSSProperties = {
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "1.25rem",
  padding: "10px 14px",
  outline: "none",
  width: "100%",
};

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

interface EntityItem { id: string; name: string; }

export default function DeitiesManagementPage() {
  const [user, setUser] = useState<User | null>(null);

  const {
    items: deities,
    loading,
    queryError,
    selected,
    isEditing: editing,
    isCreating: creating,
    isSaving,
    formData: form,
    setFormData: setForm,
    searchTerm: search,
    setSearchTerm: setSearch,
    error,
    setError,
    success,
    confirmState,
    closeConfirm,
    handleCreate: createDeity,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<Deity>({
    endpoint: "/api/data/deities",
    getId: (d) => d.id,
    validate: (f) => (!f.name?.trim() ? "Name is required." : null),
    successMessage: (creating) => (creating ? "Deity created." : "Deity updated."),
    deleteConfirmMessage: (d) => `Delete "${d.name}"?`,
    deleteSuccessMessage: "Deity deleted.",
  });

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  const { data: rawNpcs = [] } = useQuery<{ id: string; name?: string; aka?: string; hidden?: boolean }[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.json()),
  });
  const { data: rawPCs = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.json()),
  });

  const npcs = useMemo<EntityItem[]>(() =>
    rawNpcs.filter(n => !n.hidden).map(n => ({ id: String(n.id), name: n.name || n.aka || String(n.id) })),
    [rawNpcs]
  );
  const pcs = useMemo<EntityItem[]>(() =>
    rawPCs.map(p => ({ id: String(p.id), name: p.name })),
    [rawPCs]
  );

  const filtered = deities.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.domain || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createDeity({ name: "", domain: "", alignment: "", status: "active", description: "", hidden: false, notes: [] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="font-body text-xl text-grim-ink-3">Consulting the divine compendium…</span>
      </div>
    );
  }

  const linkEntities = [
    ...npcs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...pcs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...deities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <div className="pt-9 px-12 pb-20">
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Pantheon</div>
          <h1 className="grim-page-title" style={{ fontSize: "4.8333rem" }}>The Divine Compendium</h1>
          <p className="grim-page-sub">Manage the gods, ancient powers, and divine forces of the campaign.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ New Deity</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          <div className="border-b border-grim-line">
            <input type="text" placeholder="Search deities…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
          </div>
          <div className="pt-2 px-3.5 pb-1.5 border-b border-grim-line">
            <span className="grim-mono text-sm tracking-wider-4 text-grim-ink-4 uppercase">
              {filtered.length} {filtered.length === 1 ? "deity" : "deities"}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filtered.map(d => {
              const isSel = selected?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleView(d)}
                  className={`border-b border-grim-line border-l-2 py-3 px-4 cursor-pointer flex justify-between items-center gap-2 ${isSel ? "border-l-grim-gold" : "border-l-transparent"}`}
                  style={{ background: isSel ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), transparent)" : "transparent" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-head text-lg truncate ${isSel ? "text-grim-gold" : "text-grim-ink-2"}`}>
                      {d.name}
                    </div>
                    {d.domain && (
                      <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 uppercase mt-0.5">{d.domain}</div>
                    )}
                    {d.hidden && <span className="grim-chip is-dead text-xs mt-1">hidden</span>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleEdit(d); }} className="grim-btn is-ghost py-1 px-2 text-sm">✎</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(d); }} className="grim-btn is-blood py-1 px-2 text-sm">✕</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-8 px-4 text-center text-grim-ink-4 font-body text-lg">No deities found</div>
            )}
          </div>
        </div>

        {/* Detail / edit */}
        <div>
          {(creating || editing) ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="grim-tome-head" style={{ padding: "16px 24px" }}>
                <div className="grim-tome-title">{creating ? "New Deity" : "Edit Deity"}</div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${creating ? "Create Deity" : "Save Changes"}`}</button>
                </div>
              </div>
              <div className="py-6 px-7">
                <form onSubmit={e => { e.preventDefault(); handleSave(); }}>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="grim-label block mb-1.5">Name *</label>
                      <input type="text" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                    </div>
                    <div>
                      <label className="grim-label block mb-1.5">Pronunciation</label>
                      <input type="text" value={form.pronunciation || ""} onChange={e => setForm(f => ({ ...f, pronunciation: e.target.value }))} style={inputStyle} placeholder="e.g. sel-oo-NAY" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="grim-label block mb-1.5">Domain</label>
                      <input type="text" value={form.domain || ""} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} style={inputStyle} placeholder="e.g. War, Storms, Death" />
                    </div>
                    <div>
                      <label className="grim-label block mb-1.5">Alignment</label>
                      <select value={form.alignment || ""} onChange={e => setForm(f => ({ ...f, alignment: e.target.value }))} style={inputStyle}>
                        <option value="">— Unknown —</option>
                        {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="grim-label block mb-1.5">Status</label>
                      <select value={form.status || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                        <option value="active">Active</option>
                        <option value="forgotten">Forgotten</option>
                        <option value="dead">Dead</option>
                        <option value="ascendant">Ascendant</option>
                      </select>
                    </div>
                    <div>
                      <label className="grim-label block mb-1.5">Image URL</label>
                      <input type="text" value={form.image || ""} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} style={inputStyle} placeholder="https://…" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Description</label>
                    <MarkdownEditor value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} rows={4} label="Description" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Symbol</label>
                    <input type="text" value={form.symbol || ""} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} style={inputStyle} placeholder="e.g. An open eye above a flame" />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Church</label>
                    <MarkdownEditor value={form.church || ""} onChange={v => setForm(f => ({ ...f, church: v }))} rows={3} label="Church" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Garments</label>
                    <MarkdownEditor value={form.garments || ""} onChange={v => setForm(f => ({ ...f, garments: v }))} rows={3} label="Garments" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Tenets</label>
                    <MarkdownEditor value={form.tenets || ""} onChange={v => setForm(f => ({ ...f, tenets: v }))} rows={4} label="Tenets" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Lore</label>
                    <MarkdownEditor value={form.lore || ""} onChange={v => setForm(f => ({ ...f, lore: v }))} rows={5} label="Lore" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">Notable Followers</label>
                    <EntityTagPicker
                      npcs={npcs}
                      pcs={pcs}
                      selectedNpcs={form.follower_npcs ?? []}
                      selectedPcs={form.follower_pcs ?? []}
                      onNpcsChange={ids => setForm(f => ({ ...f, follower_npcs: ids }))}
                      onPcsChange={ids => setForm(f => ({ ...f, follower_pcs: ids }))}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="grim-label block mb-1.5">GM Notes</label>
                    <MarkdownEditor value={form.gm_notes || ""} onChange={v => setForm(f => ({ ...f, gm_notes: v }))} rows={4} label="GM Notes" linkEntities={linkEntities} />
                  </div>

                  <div className="mb-5">
                    <UserNotesEditor notes={(form.notes as UserNote[]) ?? []} onChange={notes => setForm(f => ({ ...f, notes }))} currentUser={user} linkEntities={linkEntities} />
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <label className="flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                      <input type="checkbox" checked={!!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))} className="accent-grim-blood" />
                      Hidden from players
                    </label>
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : (creating ? "Create Deity" : "Save Changes")}</button>
                  </div>
                </form>
              </div>
            </div>
          ) : selected ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="flex overflow-hidden">
                <div className="w-1.5 shrink-0 bg-grim-gold" style={{ boxShadow: "0 0 12px var(--grim-gold)" }} />
                <div className="flex-1 py-5.5 px-6.5">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex gap-4 items-center">
                      {safeImageSrc(selected.image) && (
                        <div className="w-15 h-15 rounded-full overflow-hidden border border-grim-line shrink-0 relative">
                          <Image src={safeImageSrc(selected.image)!} alt={selected.name} fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <h2 className="font-display text-5xl text-grim-gold m-0" style={{ lineHeight: 1.1 }}>{selected.name}</h2>
                        {selected.pronunciation && <div className="font-body text-lg text-grim-ink-4 italic mt-0.5">{selected.pronunciation}</div>}
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {selected.domain && <span className="grim-chip">{selected.domain}</span>}
                          {selected.alignment && <span className="grim-chip is-unknown">{selected.alignment}</span>}
                          {selected.status && <span className="grim-chip">{selected.status}</span>}
                          {selected.hidden && <span className="grim-chip is-dead">hidden</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="grim-btn is-ghost" onClick={() => handleEdit(selected)}>✎ Edit</button>
                      <button className="grim-btn is-blood" onClick={() => handleDelete(selected)}>✕ Delete</button>
                    </div>
                  </div>

                  {selected.description && (
                    <div className="mb-4 text-lg text-grim-ink-2" style={{ lineHeight: 1.6 }}>{selected.description}</div>
                  )}
                  {selected.gm_notes && (
                    <div className="py-3 px-3.5 border border-grim-arcane mb-4" style={{ background: "oklch(0.20 0.06 285 / 0.5)" }}>
                      <div className="grim-label mb-1.5 text-grim-arcane">GM Notes</div>
                      <div className="text-lg text-grim-ink-2" style={{ lineHeight: 1.55 }}>{selected.gm_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grim-tome text-center" style={{ padding: "60px 40px" }}>
              <div className="font-display text-6xl text-grim-ink-4 mb-4">✦</div>
              <h3 className="font-head text-2xl text-grim-ink-2 m-0 mb-2.5 tracking-wider">No deity selected</h3>
              <p className="font-body text-xl text-grim-ink-4 max-w-80 my-0 mx-auto">
                Choose a deity from the list, or create a new one.
              </p>
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
