"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const userId = useEffectiveUserId();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: npcData = [], isPending: loading } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.json()),
  });
  const { data: factionData = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
  });
  const { data: pcData = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.ok ? r.json() : []),
  });

  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden || isDM || isAdmin);

  const isNameHidden = (npc: NPC) => Boolean(npc.nameHidden || npc.hide_name);
  const displayName = (npc: NPC) => {
    const clean = (v?: string | null) => sanitizeOptionalText(v) ?? "";
    const showRealName = !isNameHidden(npc) || isDM || isAdmin;
    return showRealName
      ? clean(npc.name) || clean(npc.aka)
      : clean(npc.display_name) || clean(npc.aka);
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
        await queryClient.invalidateQueries({ queryKey: ['/api/data/npcs'] });
        setShowAddForm(false);
        setEditingNPC({});
      }
    } catch {
      /* noop */
    }
  };

  const startAdding = () => {
    setEditingNPC({ name: "", aka: "", pronunciation: "", race: "", gender: "", description: "", location: "", status: "Alive", background: "", roleplaying_notes: "", image: "", factions: [], hidden: false, nameHidden: false, notes: [] });
    setShowAddForm(true);
  };


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
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Roleplaying Notes</label>
                <MarkdownEditor value={editingNPC.roleplaying_notes || ""} onChange={(v) => setEditingNPC({ ...editingNPC, roleplaying_notes: v })} rows={4} label="Roleplaying Notes" linkEntities={linkEntities} />
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

        {/* Card grid */}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {sortedNPCs.map((npc) => (
                <div
                  key={npc.id}
                  onClick={() => router.push(`/campaign/npcs/${npc.id}`)}
                  className="grim-tome"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "38% 1fr",
                    border: "1px solid var(--grim-line)",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
                >
                  {/* Portrait */}
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
                    <div style={{ position: "absolute", top: 7, left: 7, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span className={statusChipClass(npc.status)} style={{ fontSize: 9, padding: "2px 6px" }}>{npc.status || "Unknown"}</span>
                      {npc.hidden && (isDM || isAdmin) && (
                        <span className="grim-chip" style={{ fontSize: 9, padding: "2px 6px", background: "oklch(0.25 0.06 285 / 0.85)", color: "var(--grim-arcane)", border: "1px solid var(--grim-arcane)" }}>hidden</span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                    {npc.location && (
                      <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".10em", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        ⌖ {npc.location}
                      </div>
                    )}
                    {npc.description && (
                      <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.4, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        &ldquo;{npc.description}&rdquo;
                      </div>
                    )}
                    {npc.factions && npc.factions.length > 0 && (
                      <div style={{ marginTop: "auto", paddingTop: 7, borderTop: "1px dashed var(--grim-line)" }}>
                        <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ⚑ {getFactionName(npc.factions[0])}
                        </div>
                      </div>
                    )}
                    {(isDM || isAdmin) && npc.roleplaying_notes && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed oklch(0.65 0.150 285 / 0.25)" }}>
                        <div style={{ fontSize: 11, color: "oklch(0.70 0.12 285)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {npc.roleplaying_notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
