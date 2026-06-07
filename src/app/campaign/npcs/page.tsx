"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import Image from "next/image";
import { NPC, Faction, PC } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import UserNotesEditor from "@/components/UserNotesEditor";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc, sanitizeOptionalText } from "@/utils/sanitize";

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "alive") return "grim-chip is-alive";
  if (s === "deceased" || s === "dead") return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function NPCsPage() {
  const [hoveredNPC, setHoveredNPC] = useState<NPC | null>(null);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [npcData, setNpcData] = useState<NPC[]>([]);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [pcData, setPcData] = useState<PC[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const userId = useEffectiveUserId();
  const router = useRouter();
  const isAdmin = useIsAdmin();

  usePageTracking();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [npcsResponse, factionsResponse, pcsResponse] = await Promise.all([
          authFetch("/api/data/npcs"),
          authFetch("/api/data/factions"),
          authFetch("/api/data/pcs"),
        ]);
        const npcs = await npcsResponse.json();
        const factions = await factionsResponse.json();
        const pcs = pcsResponse.ok ? await pcsResponse.json() : [];
        setNpcData(npcs);
        setFactionData(factions);
        setPcData(Array.isArray(pcs) ? pcs : []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden);

  const isNameHidden = (npc: NPC) => Boolean(npc.nameHidden || npc.hide_name);
  const displayName = (npc: NPC) => {
    const clean = (v?: string | null) => sanitizeOptionalText(v) ?? "";
    return isNameHidden(npc)
      ? clean(npc.display_name) || clean(npc.aka)
      : clean(npc.name) || clean(npc.aka);
  };
  const hasValidImage = (src?: string | null) => Boolean(safeImageSrc(src));

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const filteredNPCs = visibleNPCs.filter((npc) => {
    const term = searchTerm.trim().toLowerCase();
    if (term !== "" && npc.hidden) return false;
    const allowRealName = !isNameHidden(npc);
    const matchesSearch =
      term === "" ||
      (allowRealName && Boolean(npc.name) && npc.name!.toLowerCase().includes(term)) ||
      (isNameHidden(npc) && Boolean(npc.display_name) && (npc.display_name as string).toLowerCase().includes(term)) ||
      (Boolean(npc.aka) && (npc.aka as string).toLowerCase().includes(term)) ||
      (Boolean(npc.race) && npc.race!.toLowerCase().includes(term)) ||
      (Boolean(npc.location) && npc.location!.toLowerCase().includes(term)) ||
      (Boolean(npc.description) && npc.description!.toLowerCase().includes(term));
    const s = (npc.status || "").toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "alive" && s === "alive") ||
      (statusFilter === "unknown" && s === "unknown") ||
      (statusFilter === "deceased" && (s === "deceased" || s === "dead"));
    return matchesSearch && matchesStatus;
  });

  const sortedNPCs = [...filteredNPCs].sort((a, b) => {
    const la = displayName(a).toLowerCase() || (a.id || "").toLowerCase();
    const lb = displayName(b).toLowerCase() || (b.id || "").toLowerCase();
    return la.localeCompare(lb);
  });

  const aliveCount = visibleNPCs.filter((n) => (n.status || "").toLowerCase() === "alive").length;
  const unknownCount = visibleNPCs.filter((n) => (n.status || "").toLowerCase() === "unknown").length;
  const deceasedCount = visibleNPCs.filter((n) => {
    const s = (n.status || "").toLowerCase();
    return s === "deceased" || s === "dead";
  }).length;

  const FILTERS = [
    { id: "all", label: "All Souls", count: visibleNPCs.length },
    { id: "alive", label: "Alive", count: aliveCount },
    { id: "unknown", label: "Unknown", count: unknownCount },
    { id: "deceased", label: "Departed", count: deceasedCount },
  ];

  const handleAddNPC = async (data: Partial<NPC>) => {
    try {
      const response = await authFetch("/api/data/npcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const npcsResponse = await authFetch("/api/data/npcs");
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        setShowAddForm(false);
        setEditingNPC({});
      }
    } catch {
      /* noop */
    }
  };

  const startAdding = () => {
    setEditingNPC({ name: "", aka: "", pronunciation: "", race: "", gender: "", description: "", location: "", status: "Alive", background: "", personality: "", image: "", factions: [], hidden: false, nameHidden: false, notes: [] });
    setShowAddForm(true);
  };

  const previewNPC = selectedNPC || sortedNPCs[0] || null;

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  const linkEntities = [
    ...npcData.map(n => ({ id: String(n.id), name: n.name || n.aka || String(n.id), type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...pcData.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...factionData.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
  ];

  return (
    <>
      {/* Admin add modal */}
      {showAddForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowAddForm(false); setEditingNPC({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Inscribe New Soul
            </h2>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddNPC(editingNPC); }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Name", field: "name" as keyof NPC },
                  { label: "AKA / Alias", field: "aka" as keyof NPC },
                  { label: "Pronunciation", field: "pronunciation" as keyof NPC },
                  { label: "Race", field: "race" as keyof NPC },
                  { label: "Location", field: "location" as keyof NPC },
                  { label: "Display Name (when name hidden)", field: "display_name" as keyof NPC },
                  { label: "Image URL", field: "image" as keyof NPC },
                ].map(({ label, field }) => (
                  <div key={field} style={field === "image" || field === "display_name" ? { gridColumn: "1 / -1" } : {}}>
                    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>{label}</label>
                    <input
                      type="text"
                      value={(editingNPC[field] as string) || ""}
                      onChange={(e) => setEditingNPC({ ...editingNPC, [field]: e.target.value })}
                      style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Gender</label>
                  <select
                    value={editingNPC.gender || ""}
                    onChange={(e) => setEditingNPC({ ...editingNPC, gender: e.target.value })}
                    style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Status</label>
                  <select
                    value={editingNPC.status || "Alive"}
                    onChange={(e) => setEditingNPC({ ...editingNPC, status: e.target.value as "Alive" | "Deceased" | "Unknown" })}
                    style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }}
                  >
                    <option value="Alive">Alive</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Description</label>
                <MarkdownEditor value={editingNPC.description || ""} onChange={(v) => setEditingNPC({ ...editingNPC, description: v })} rows={4} label="Description" linkEntities={linkEntities} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Background</label>
                <MarkdownEditor value={editingNPC.background || ""} onChange={(v) => setEditingNPC({ ...editingNPC, background: v })} rows={5} label="Background" linkEntities={linkEntities} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Personality</label>
                <MarkdownEditor value={editingNPC.personality || ""} onChange={(v) => setEditingNPC({ ...editingNPC, personality: v })} rows={4} label="Personality" linkEntities={linkEntities} />
              </div>
              <div>
                <UserNotesEditor notes={editingNPC.notes || []} onChange={(notes) => setEditingNPC({ ...editingNPC, notes })} currentUser={userId} isAdmin={isAdmin} className="mt-2" linkEntities={linkEntities} />
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { label: "Hidden from players", field: "hidden" as keyof NPC },
                  { label: "Name hidden", field: "nameHidden" as keyof NPC },
                ].map(({ label, field }) => (
                  <label key={field} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink-2)", letterSpacing: ".04em" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingNPC[field])}
                      onChange={(e) => setEditingNPC({ ...editingNPC, [field]: e.target.checked })}
                      style={{ accentColor: "var(--grim-ember)" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--grim-line)" }}>
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingNPC({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Inscribe Soul</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NPC LIST */}
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <div className="grim-page-eyebrow">Volume the Second</div>
            <h1 className="grim-page-title">The Bestiary of Souls</h1>
            <p className="grim-page-sub">{visibleNPCs.length} souls; every face the party has dared remember.</p>
          </div>
          {isAdmin && (
            <div className="grim-row" style={{ gap: 8 }}>
              <button className="grim-btn is-ember" onClick={startAdding}>+ Inscribe New</button>
            </div>
          )}
        </div>

        {/* Search + status filters */}
        <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Seek a name, a face, a deed…"
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16, padding: "12px 16px 12px 42px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18 }}>✦</span>
          </div>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)", overflow: "hidden" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`grim-btn ${statusFilter === f.id ? "is-ember" : "is-ghost"}`}
                style={{ padding: "6px 12px", border: `1px solid ${statusFilter === f.id ? "var(--grim-ember)" : "transparent"}`, background: statusFilter === f.id ? undefined : "transparent" }}
              >
                {f.label}
                <span className="grim-mono" style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>{f.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Two-pane: card grid + sticky sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22 }}>

          {/* NPC card grid */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 className="grim-h-section">Of those who walk the Bounty</h2>
              <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
                sorted alphabetical · {sortedNPCs.length} of {visibleNPCs.length}
              </div>
            </div>

            {sortedNPCs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ no souls found ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>
                  Adjust thy search or filters
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {sortedNPCs.map((npc) => (
                  <div
                    key={npc.id}
                    onMouseEnter={() => setHoveredNPC(npc)}
                    onMouseLeave={() => setHoveredNPC(null)}
                    onClick={() => setSelectedNPC(npc)}
                    className="grim-tome"
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: "40% 1fr",
                      border: `1px solid ${selectedNPC?.id === npc.id ? "var(--grim-ember)" : hoveredNPC?.id === npc.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                      transform: hoveredNPC?.id === npc.id ? "translateY(-2px)" : "none",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {/* Left: portrait at 1:1 */}
                    <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
                      {hasValidImage(npc.image) ? (
                        <Image
                          src={safeImageSrc(npc.image)!}
                          alt={displayName(npc) || ""}
                          fill
                          style={{ objectFit: "cover", objectPosition: "center top", filter: npc.status?.toLowerCase() === "deceased" ? "grayscale(0.7)" : "none" }}
                        />
                      ) : (
                        <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%" }} />
                      )}
                      <div style={{ position: "absolute", top: 7, left: 7 }}>
                        <span className={statusChipClass(npc.status)} style={{ fontSize: 9, padding: "2px 6px" }}>{npc.status || "Unknown"}</span>
                      </div>
                    </div>

                    {/* Right: card body */}
                    <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName(npc) || "Unknown"}
                      </div>
                      {npc.pronunciation && !isNameHidden(npc) && (
                        <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", marginTop: 2 }}>
                          ({npc.pronunciation})
                        </div>
                      )}
                      <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-3)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {npc.race}{npc.gender ? ` · ${npc.gender}` : ""}
                      </div>
                      {npc.description && (
                        <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.4, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          &ldquo;{npc.description}&rdquo;
                        </div>
                      )}
                      {npc.factions && npc.factions.length > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px dashed var(--grim-line)" }}>
                          <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            ⚑ {getFactionName(npc.factions[0])}
                          </div>
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
              <div style={{ position: "relative", height: 200 }}>
                {previewNPC && hasValidImage(previewNPC.image) ? (
                  <Image
                    src={safeImageSrc(previewNPC.image)!}
                    alt={displayName(previewNPC) || ""}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center top", filter: previewNPC.status?.toLowerCase() === "deceased" ? "grayscale(0.6)" : "none" }}
                  />
                ) : (
                  <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%" }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, oklch(0.10 0.025 290 / 0.85))" }} />
              </div>
              <div style={{ padding: 16 }}>
                {previewNPC ? (
                  <>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>Ledger Entry</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-gold)", lineHeight: 1, marginTop: 2 }}>{displayName(previewNPC)}</div>
                    {previewNPC.pronunciation && !isNameHidden(previewNPC) && (
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)", letterSpacing: ".14em", marginTop: 3 }}>
                        ({previewNPC.pronunciation})
                      </div>
                    )}
                    <hr className="grim-rule" />
                    <div className="grim-stack" style={{ gap: 7, fontSize: 12 }}>
                      {[
                        ["Race", previewNPC.race],
                        ["Status", previewNPC.status],
                        ["Location", previewNPC.location],
                        ["Faction", previewNPC.factions?.[0] ? getFactionName(previewNPC.factions[0]) : "—"],
                      ].map(([k, v], i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 4, borderBottom: i < 3 ? "1px dotted var(--grim-line)" : "none" }}>
                          <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                        </div>
                      ))}
                    </div>
                    <hr className="grim-rule" />
                    <button
                      className="grim-btn is-ember"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => router.push(`/campaign/npcs/${previewNPC.id}`)}
                    >
                      Open Dossier ›
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
              <h3 className="grim-tome-title" style={{ fontSize: 13, marginBottom: 0 }}>Tally of the Codex</h3>
              <hr className="grim-rule" style={{ margin: "10px 0 12px" }} />
              <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
                {[
                  ["Souls inscribed", String(visibleNPCs.length)],
                  ["Living", String(aliveCount)],
                  ["Unknown", String(unknownCount)],
                  ["Departed", String(deceasedCount)],
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
