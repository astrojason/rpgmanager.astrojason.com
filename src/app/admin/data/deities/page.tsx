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
  fontSize: "1.6667rem",
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "1.7778rem", color: "var(--grim-ink-3)" }}>Consulting the divine compendium…</span>
      </div>
    );
  }

  const linkEntities = [
    ...npcs.map(n => ({ id: n.id, name: n.name, type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...pcs.map(p => ({ id: p.id, name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...deities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <div style={{ padding: "36px 48px 80px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Pantheon</div>
          <h1 className="grim-page-title" style={{ fontSize: "6.4444rem" }}>The Divine Compendium</h1>
          <p className="grim-page-sub">Manage the gods, ancient powers, and divine forces of the campaign.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ New Deity</button>
      </header>

      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ borderBottom: "1px solid var(--grim-line)" }}>
            <input type="text" placeholder="Search deities…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid var(--grim-line)" }}>
            <span className="grim-mono" style={{ fontSize: "1.1111rem", letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>
              {filtered.length} {filtered.length === 1 ? "deity" : "deities"}
            </span>
          </div>
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filtered.map(d => {
              const isSel = selected?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleView(d)}
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    borderLeft: isSel ? "2px solid var(--grim-gold)" : "2px solid transparent",
                    background: isSel ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), transparent)" : "transparent",
                    padding: "12px 16px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: "1.5556rem", color: isSel ? "var(--grim-gold)" : "var(--grim-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.name}
                    </div>
                    {d.domain && (
                      <div className="grim-mono" style={{ fontSize: "1rem", color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 2 }}>{d.domain}</div>
                    )}
                    {d.hidden && <span className="grim-chip is-dead" style={{ fontSize: "1rem", marginTop: 4 }}>hidden</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); handleEdit(d); }} className="grim-btn is-ghost" style={{ padding: "3px 8px", fontSize: "1.2222rem" }}>✎</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(d); }} className="grim-btn is-blood" style={{ padding: "3px 8px", fontSize: "1.2222rem" }}>✕</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: "1.5556rem" }}>No deities found</div>
            )}
          </div>
        </div>

        {/* Detail / edit */}
        <div>
          {(creating || editing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head" style={{ padding: "16px 24px" }}>
                <div className="grim-tome-title">{creating ? "New Deity" : "Edit Deity"}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${creating ? "Create Deity" : "Save Changes"}`}</button>
                </div>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <form onSubmit={e => { e.preventDefault(); handleSave(); }}>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Name *</label>
                      <input type="text" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                    </div>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Pronunciation</label>
                      <input type="text" value={form.pronunciation || ""} onChange={e => setForm(f => ({ ...f, pronunciation: e.target.value }))} style={inputStyle} placeholder="e.g. sel-oo-NAY" />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Domain</label>
                      <input type="text" value={form.domain || ""} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} style={inputStyle} placeholder="e.g. War, Storms, Death" />
                    </div>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Alignment</label>
                      <select value={form.alignment || ""} onChange={e => setForm(f => ({ ...f, alignment: e.target.value }))} style={inputStyle}>
                        <option value="">— Unknown —</option>
                        {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Status</label>
                      <select value={form.status || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                        <option value="active">Active</option>
                        <option value="forgotten">Forgotten</option>
                        <option value="dead">Dead</option>
                        <option value="ascendant">Ascendant</option>
                      </select>
                    </div>
                    <div>
                      <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Image URL</label>
                      <input type="text" value={form.image || ""} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} style={inputStyle} placeholder="https://…" />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Description</label>
                    <MarkdownEditor value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} rows={4} label="Description" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Symbol</label>
                    <input type="text" value={form.symbol || ""} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} style={inputStyle} placeholder="e.g. An open eye above a flame" />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Church</label>
                    <MarkdownEditor value={form.church || ""} onChange={v => setForm(f => ({ ...f, church: v }))} rows={3} label="Church" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Garments</label>
                    <MarkdownEditor value={form.garments || ""} onChange={v => setForm(f => ({ ...f, garments: v }))} rows={3} label="Garments" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Tenets</label>
                    <MarkdownEditor value={form.tenets || ""} onChange={v => setForm(f => ({ ...f, tenets: v }))} rows={4} label="Tenets" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Lore</label>
                    <MarkdownEditor value={form.lore || ""} onChange={v => setForm(f => ({ ...f, lore: v }))} rows={5} label="Lore" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Notable Followers</label>
                    <EntityTagPicker
                      npcs={npcs}
                      pcs={pcs}
                      selectedNpcs={form.follower_npcs ?? []}
                      selectedPcs={form.follower_pcs ?? []}
                      onNpcsChange={ids => setForm(f => ({ ...f, follower_npcs: ids }))}
                      onPcsChange={ids => setForm(f => ({ ...f, follower_pcs: ids }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>GM Notes</label>
                    <MarkdownEditor value={form.gm_notes || ""} onChange={v => setForm(f => ({ ...f, gm_notes: v }))} rows={4} label="GM Notes" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <UserNotesEditor notes={(form.notes as UserNote[]) ?? []} onChange={notes => setForm(f => ({ ...f, notes }))} currentUser={user} linkEntities={linkEntities} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "1.5556rem", color: "var(--grim-ink-2)" }}>
                      <input type="checkbox" checked={!!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))} style={{ accentColor: "var(--grim-blood)" }} />
                      Hidden from players
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : (creating ? "Create Deity" : "Save Changes")}</button>
                  </div>
                </form>
              </div>
            </div>
          ) : selected ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", overflow: "hidden" }}>
                <div style={{ width: 6, flexShrink: 0, background: "var(--grim-gold)", boxShadow: "0 0 12px var(--grim-gold)" }} />
                <div style={{ flex: 1, padding: "22px 26px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      {safeImageSrc(selected.image) && (
                        <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--grim-line)", flexShrink: 0, position: "relative" }}>
                          <Image src={safeImageSrc(selected.image)!} alt={selected.name} fill style={{ objectFit: "cover" }} />
                        </div>
                      )}
                      <div>
                        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "3.5556rem", color: "var(--grim-gold)", margin: 0, lineHeight: 1.1 }}>{selected.name}</h2>
                        {selected.pronunciation && <div style={{ fontFamily: "var(--font-body)", fontSize: "1.4444rem", color: "var(--grim-ink-4)", fontStyle: "italic", marginTop: 2 }}>{selected.pronunciation}</div>}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {selected.domain && <span className="grim-chip">{selected.domain}</span>}
                          {selected.alignment && <span className="grim-chip is-unknown">{selected.alignment}</span>}
                          {selected.status && <span className="grim-chip">{selected.status}</span>}
                          {selected.hidden && <span className="grim-chip is-dead">hidden</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="grim-btn is-ghost" onClick={() => handleEdit(selected)}>✎ Edit</button>
                      <button className="grim-btn is-blood" onClick={() => handleDelete(selected)}>✕ Delete</button>
                    </div>
                  </div>

                  {selected.description && (
                    <div style={{ marginBottom: 16, fontSize: "1.5556rem", color: "var(--grim-ink-2)", lineHeight: 1.6 }}>{selected.description}</div>
                  )}
                  {selected.gm_notes && (
                    <div style={{ padding: "12px 14px", background: "oklch(0.20 0.06 285 / 0.5)", border: "1px solid var(--grim-arcane)", marginBottom: 16 }}>
                      <div className="grim-label" style={{ marginBottom: 6, color: "var(--grim-arcane)" }}>GM Notes</div>
                      <div style={{ fontSize: "1.4444rem", color: "var(--grim-ink-2)", lineHeight: 1.55 }}>{selected.gm_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grim-tome" style={{ padding: "60px 40px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "5.3333rem", color: "var(--grim-ink-4)", marginBottom: 16 }}>✦</div>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: "2.2222rem", color: "var(--grim-ink-2)", margin: "0 0 10px", letterSpacing: ".06em" }}>No deity selected</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "1.6667rem", color: "var(--grim-ink-4)", maxWidth: 320, margin: "0 auto" }}>
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
