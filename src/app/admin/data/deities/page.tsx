"use client";

import { useState, useEffect } from "react";
import { Deity, UserNote } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import MarkdownEditor from "@/components/MarkdownEditor";
import UserNotesEditor from "@/components/UserNotesEditor";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import Image from "next/image";
import { safeImageSrc } from "@/utils/sanitize";

const inputStyle: React.CSSProperties = {
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
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
  const [deities, setDeities] = useState<Deity[]>([]);
  const [npcs, setNpcs] = useState<EntityItem[]>([]);
  const [pcs, setPcs] = useState<EntityItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<Deity | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Deity>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, nRes, pRes] = await Promise.all([
        authFetch("/api/data/deities"),
        authFetch("/api/data/npcs"),
        authFetch("/api/data/pcs"),
      ]);
      if (!dRes.ok) throw new Error(`Failed to load deities (${dRes.status})`);
      setDeities(await dRes.json());
      if (nRes.ok) {
        const raw = await nRes.json();
        setNpcs(raw.filter((n: { hidden?: boolean }) => !n.hidden).map((n: { id: string; name?: string; aka?: string }) => ({ id: String(n.id), name: n.name || n.aka || String(n.id) })));
      }
      if (pRes.ok) {
        const raw = await pRes.json();
        setPcs(raw.map((p: { id: string; name: string }) => ({ id: String(p.id), name: p.name })));
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const filtered = deities.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.domain || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setCreating(true);
    setEditing(false);
    setSelected(null);
    setForm({ name: "", domain: "", alignment: "", status: "active", description: "", hidden: false, notes: [] });
  };

  const handleEdit = (d: Deity) => {
    setEditing(true);
    setCreating(false);
    setSelected(d);
    setForm({ ...d });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    try {
      const method = creating ? "POST" : "PUT";
      const res = await authFetch("/api/data/deities", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      await load();
      setSelected(creating ? result.data : deities.find(d => d.id === form.id) ?? result.data);
      setEditing(false);
      setCreating(false);
      setSuccess(creating ? "Deity created." : "Deity updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleDelete = async (d: Deity) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try {
      const res = await authFetch(`/api/data/deities?id=${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setSelected(null);
      setSuccess("Deity deleted.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--grim-ink-3)" }}>Consulting the divine compendium…</span>
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
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Divine Compendium</h1>
          <p className="grim-page-sub">Manage the gods, ancient powers, and divine forces of the campaign.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ New Deity</button>
      </header>

      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
      {success && (
        <div style={{ background: "oklch(0.25 0.10 145 / 0.4)", border: "1px solid oklch(0.55 0.090 145)", color: "var(--grim-moss)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 14 }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ borderBottom: "1px solid var(--grim-line)" }}>
            <input type="text" placeholder="Search deities…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid var(--grim-line)" }}>
            <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>
              {filtered.length} {filtered.length === 1 ? "deity" : "deities"}
            </span>
          </div>
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filtered.map(d => {
              const isSel = selected?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => { setSelected(d); setEditing(false); setCreating(false); }}
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    borderLeft: isSel ? "2px solid var(--grim-gold)" : "2px solid transparent",
                    background: isSel ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), transparent)" : "transparent",
                    padding: "12px 16px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: isSel ? "var(--grim-gold)" : "var(--grim-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.name}
                    </div>
                    {d.domain && (
                      <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 2 }}>{d.domain}</div>
                    )}
                    {d.hidden && <span className="grim-chip is-dead" style={{ fontSize: 9, marginTop: 4 }}>hidden</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); handleEdit(d); }} className="grim-btn is-ghost" style={{ padding: "3px 8px", fontSize: 11 }}>✎</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(d); }} className="grim-btn is-blood" style={{ padding: "3px 8px", fontSize: 11 }}>✕</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 14 }}>No deities found</div>
            )}
          </div>
        </div>

        {/* Detail / edit */}
        <div>
          {(creating || editing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head" style={{ padding: "16px 24px" }}>
                <div className="grim-tome-title">{creating ? "New Deity" : "Edit Deity"}</div>
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
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Notable Followers — NPCs</label>
                    <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 160, overflowY: "auto", padding: "6px 0" }}>
                      {npcs.map(n => (
                        <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (form.follower_npcs ?? []).includes(n.id) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent" }}>
                          <input type="checkbox" checked={(form.follower_npcs ?? []).includes(n.id)} onChange={e => { const cur = form.follower_npcs ?? []; setForm(f => ({ ...f, follower_npcs: e.target.checked ? [...cur, n.id] : cur.filter(x => x !== n.id) })); }} style={{ accentColor: "var(--grim-ember)" }} />
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{n.name}</span>
                        </label>
                      ))}
                      {npcs.length === 0 && <div style={{ padding: "8px 14px", color: "var(--grim-ink-4)", fontSize: 13 }}>No NPCs found</div>}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>Notable Followers — PCs</label>
                    <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 120, overflowY: "auto", padding: "6px 0" }}>
                      {pcs.map(p => (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (form.follower_pcs ?? []).includes(p.id) ? "oklch(0.55 0.090 145 / 0.12)" : "transparent" }}>
                          <input type="checkbox" checked={(form.follower_pcs ?? []).includes(p.id)} onChange={e => { const cur = form.follower_pcs ?? []; setForm(f => ({ ...f, follower_pcs: e.target.checked ? [...cur, p.id] : cur.filter(x => x !== p.id) })); }} style={{ accentColor: "var(--grim-moss)" }} />
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{p.name}</span>
                        </label>
                      ))}
                      {pcs.length === 0 && <div style={{ padding: "8px 14px", color: "var(--grim-ink-4)", fontSize: 13 }}>No PCs found</div>}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="grim-label" style={{ display: "block", marginBottom: 6 }}>GM Notes</label>
                    <MarkdownEditor value={form.gm_notes || ""} onChange={v => setForm(f => ({ ...f, gm_notes: v }))} rows={4} label="GM Notes" linkEntities={linkEntities} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <UserNotesEditor notes={(form.notes as UserNote[]) ?? []} onChange={notes => setForm(f => ({ ...f, notes }))} currentUser={user} linkEntities={linkEntities} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)" }}>
                      <input type="checkbox" checked={!!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))} style={{ accentColor: "var(--grim-blood)" }} />
                      Hidden from players
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" className="grim-btn is-ghost" onClick={() => { setCreating(false); setEditing(false); }}>Cancel</button>
                    <button type="submit" className="grim-btn is-ember">{creating ? "Create Deity" : "Save Changes"}</button>
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
                        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-gold)", margin: 0, lineHeight: 1.1 }}>{selected.name}</h2>
                        {selected.pronunciation && <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-4)", fontStyle: "italic", marginTop: 2 }}>{selected.pronunciation}</div>}
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
                    <div style={{ marginBottom: 16, fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}>{selected.description}</div>
                  )}
                  {selected.gm_notes && (
                    <div style={{ padding: "12px 14px", background: "oklch(0.20 0.06 285 / 0.5)", border: "1px solid var(--grim-arcane)", marginBottom: 16 }}>
                      <div className="grim-label" style={{ marginBottom: 6, color: "var(--grim-arcane)" }}>GM Notes</div>
                      <div style={{ fontSize: 13, color: "var(--grim-ink-2)", lineHeight: 1.55 }}>{selected.gm_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grim-tome" style={{ padding: "60px 40px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-ink-4)", marginBottom: 16 }}>✦</div>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-ink-2)", margin: "0 0 10px", letterSpacing: ".06em" }}>No deity selected</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-4)", maxWidth: 320, margin: "0 auto" }}>
                Choose a deity from the list, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
