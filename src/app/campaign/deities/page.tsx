"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import Image from "next/image";
import { Deity } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

function alignmentChipClass(alignment?: string): string {
  const a = (alignment || "").toLowerCase();
  if (a.includes("good")) return "grim-chip is-alive";
  if (a.includes("evil")) return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function DeitiesPage() {
  const [deities, setDeities] = useState<Deity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredDeity, setHoveredDeity] = useState<Deity | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeity, setEditingDeity] = useState<Partial<Deity>>({});

  const router = useRouter();
  const isAdmin = useIsAdmin();

  usePageTracking();

  const loadDeities = async () => {
    try {
      const res = await authFetch("/api/data/deities");
      if (!res.ok) throw new Error(`Failed to load deities (${res.status})`);
      setDeities(await res.json());
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeities(); }, []);

  const visible = deities.filter(d => isAdmin || !d.hidden);

  const filtered = visible.filter(d => {
    const term = searchTerm.trim().toLowerCase();
    return term === "" ||
      d.name.toLowerCase().includes(term) ||
      (d.domain || "").toLowerCase().includes(term) ||
      (d.alignment || "").toLowerCase().includes(term) ||
      (d.description || "").toLowerCase().includes(term);
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddDeity = async (data: Partial<Deity>) => {
    try {
      const res = await authFetch("/api/data/deities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDeities();
      setShowAddForm(false);
      setEditingDeity({});
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const startAdding = () => {
    setEditingDeity({ name: "", pronunciation: "", domain: "", alignment: "", status: "active", description: "", image: "", hidden: false });
    setShowAddForm(true);
  };

  const previewDeity = hoveredDeity || sorted[0] || null;

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the divine compendium&hellip;
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
          onClick={() => { setShowAddForm(false); setEditingDeity({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Record New Divinity
            </h2>
            <form
              onSubmit={e => { e.preventDefault(); handleAddDeity(editingDeity); }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { label: "Name", field: "name" as keyof Deity, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Deity, full: false },
                  { label: "Domain", field: "domain" as keyof Deity, full: false },
                  { label: "Image URL", field: "image" as keyof Deity, full: true },
                ] as { label: string; field: keyof Deity; full: boolean }[]).map(({ label, field, full }) => (
                  <div key={field} style={full ? { gridColumn: "1 / -1" } : {}}>
                    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>{label}</label>
                    <input
                      type="text"
                      value={(editingDeity[field] as string) || ""}
                      onChange={e => setEditingDeity({ ...editingDeity, [field]: e.target.value })}
                      style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Alignment</label>
                  <select
                    value={editingDeity.alignment || ""}
                    onChange={e => setEditingDeity({ ...editingDeity, alignment: e.target.value })}
                    style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                  >
                    <option value="">— Unknown —</option>
                    {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Status</label>
                  <select
                    value={editingDeity.status || "active"}
                    onChange={e => setEditingDeity({ ...editingDeity, status: e.target.value })}
                    style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                  >
                    <option value="active">Active</option>
                    <option value="forgotten">Forgotten</option>
                    <option value="dead">Dead</option>
                    <option value="ascendant">Ascendant</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Description</label>
                <MarkdownEditor value={editingDeity.description || ""} onChange={v => setEditingDeity({ ...editingDeity, description: v })} rows={4} label="Description" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>GM Notes</label>
                <MarkdownEditor value={editingDeity.gm_notes || ""} onChange={v => setEditingDeity({ ...editingDeity, gm_notes: v })} rows={4} label="GM Notes" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink-2)", letterSpacing: ".04em" }}>
                <input type="checkbox" checked={Boolean(editingDeity.hidden)} onChange={e => setEditingDeity({ ...editingDeity, hidden: e.target.checked })} style={{ accentColor: "var(--grim-ember)" }} />
                Hidden from players
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--grim-line)" }}>
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingDeity({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Record Divinity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEITY LIST */}
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <div className="grim-page-eyebrow">Volume the Seventh</div>
            <h1 className="grim-page-title">The Divine Compendium</h1>
            <p className="grim-page-sub">{visible.length} {visible.length === 1 ? "divinity" : "divinities"} recorded; gods, powers, and ancient forces that shape the world.</p>
          </div>
          {isAdmin && (
            <button className="grim-btn is-ember" onClick={startAdding}>+ Record New</button>
          )}
        </div>

        {/* Search */}
        <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Seek a name, a domain, a power…"
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16, padding: "12px 16px 12px 42px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18 }}>✦</span>
          </div>
        </section>

        {/* Two-pane: card grid + sticky sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22 }}>

          {/* Deity card grid */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 className="grim-h-section">Of the gods and divine powers</h2>
              <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
                sorted alphabetical · {sorted.length} of {visible.length}
              </div>
            </div>

            {sorted.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ no divinities found ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>Adjust thy search</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {sorted.map(deity => (
                  <div
                    key={deity.id}
                    onMouseEnter={() => setHoveredDeity(deity)}
                    onMouseLeave={() => setHoveredDeity(null)}
                    onClick={() => router.push(`/campaign/deities/${deity.id}`)}
                    className="grim-tome"
                    style={{
                      padding: "16px 18px",
                      cursor: "pointer",
                      border: `1px solid ${hoveredDeity?.id === deity.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                      transform: hoveredDeity?.id === deity.id ? "translateY(-2px)" : "none",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      position: "relative",
                    }}
                  >
                    {deity.hidden && isAdmin && (
                      <span className="grim-mono" style={{ position: "absolute", top: 8, right: 10, fontSize: 9, letterSpacing: ".14em", color: "var(--grim-blood-2)", textTransform: "uppercase" }}>hidden</span>
                    )}
                    {/* Avatar */}
                    <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--grim-gold-2)", flexShrink: 0, position: "relative", background: "var(--grim-bg-3)" }}>
                      {safeImageSrc(deity.image) ? (
                        <Image src={safeImageSrc(deity.image)!} alt={deity.name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold-2)" }}>✦</div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {deity.name}
                      </div>
                      {deity.domain && (
                        <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-gold-2)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 3 }}>
                          {deity.domain}
                        </div>
                      )}
                      {deity.alignment && (
                        <div style={{ marginTop: 6 }}>
                          <span className={alignmentChipClass(deity.alignment)} style={{ fontSize: 9, padding: "2px 6px" }}>{deity.alignment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right sidebar: hover preview + tally */}
          <aside style={{ position: "sticky", top: 0, alignSelf: "flex-start" }}>
            {/* Hover preview */}
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ height: 120, background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.30 0.10 60) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {previewDeity && safeImageSrc(previewDeity.image) ? (
                  <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--grim-gold-2)", position: "relative" }}>
                    <Image src={safeImageSrc(previewDeity.image)!} alt={previewDeity.name} fill style={{ objectFit: "cover" }} />
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 64, color: "var(--grim-gold-2)", opacity: 0.4 }}>✦</span>
                )}
              </div>
              <div style={{ padding: 16 }}>
                {previewDeity ? (
                  <>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>Compendium Entry</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-gold)", lineHeight: 1, marginTop: 2 }}>{previewDeity.name}</div>
                    {previewDeity.pronunciation && (
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)", letterSpacing: ".14em", marginTop: 3 }}>({previewDeity.pronunciation})</div>
                    )}
                    <hr className="grim-rule" />
                    <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
                      {[["Domain", previewDeity.domain || "—"], ["Alignment", previewDeity.alignment || "—"], ["Status", previewDeity.status || "—"]].map(([k, v], i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 4, borderBottom: i < 2 ? "1px dotted var(--grim-line)" : "none" }}>
                          <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--grim-ink)", textAlign: "right" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <hr className="grim-rule" />
                    <button
                      className="grim-btn is-ember"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => router.push(`/campaign/deities/${previewDeity.id}`)}
                    >
                      Open Compendium ›
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "12px 0", color: "var(--grim-ink-4)" }}>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>Hover to preview</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tally */}
            <div className="grim-tome">
              <h3 className="grim-tome-title" style={{ fontSize: 13, marginBottom: 0 }}>Tally of the Pantheon</h3>
              <hr className="grim-rule" style={{ margin: "10px 0 12px" }} />
              <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
                {[
                  ["Divinities recorded", String(visible.length)],
                  ["Good-aligned", String(visible.filter(d => (d.alignment || "").toLowerCase().includes("good")).length)],
                  ["Evil-aligned", String(visible.filter(d => (d.alignment || "").toLowerCase().includes("evil")).length)],
                  ["Neutral", String(visible.filter(d => { const a = (d.alignment || "").toLowerCase(); return !a.includes("good") && !a.includes("evil") && a !== ""; }).length)],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--grim-ink-2)" }}>
                    <span>{k}</span>
                    <span style={{ fontFamily: "var(--font-display)", color: "var(--grim-gold)", fontSize: 16 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
