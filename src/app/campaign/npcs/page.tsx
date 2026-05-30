"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReferrerInfo, usePageTracking, getDefaultBackInfo } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { NPC, Faction, UserNote } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
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
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [hoveredNPC, setHoveredNPC] = useState<NPC | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [npcData, setNpcData] = useState<NPC[]>([]);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [dmMode, setDmMode] = useState(false);

  const userId = useEffectiveUserId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerInfo = useReferrerInfo();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [npcsResponse, factionsResponse] = await Promise.all([
          authFetch("/api/data/npcs"),
          authFetch("/api/data/factions"),
        ]);
        const npcs = await npcsResponse.json();
        const factions = await factionsResponse.json();
        setNpcData(npcs);
        setFactionData(factions);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setDmMode(isDM || isAdmin);
  }, [isDM, isAdmin]);

  const visibleNPCs = npcData.filter((npc: NPC) => !npc.hidden);

  const backInfo = selectedNPC
    ? referrerInfo.label !== "NPCs"
      ? referrerInfo
      : getDefaultBackInfo("npcs")
    : getDefaultBackInfo("npcs");

  const cleanText = (value?: string | null) => sanitizeOptionalText(value) ?? "";
  const isNameHidden = (npc: NPC) => Boolean(npc.nameHidden || npc.hide_name);
  const displayName = (npc: NPC) =>
    isNameHidden(npc)
      ? cleanText(npc.display_name) || cleanText(npc.aka)
      : cleanText(npc.name) || cleanText(npc.aka);
  const hasValidImage = (src?: string | null) => Boolean(safeImageSrc(src));
  const selectedNpcImage = safeImageSrc(selectedNPC?.image);

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  useEffect(() => {
    const selected = searchParams.get("selected");
    const fragment = window.location.hash.slice(1);
    if (selectedNPC === null) {
      let npc: NPC | undefined;
      if (selected) npc = visibleNPCs.find((n: NPC) => n.id === selected);
      if (!npc && fragment) {
        const searchName = fragment.replace(/-/g, " ").toLowerCase();
        npc = visibleNPCs.find((n: NPC) => {
          const nameMatch = n.name && n.name.toLowerCase() === searchName;
          const akaMatch = n.aka && n.aka.toLowerCase() === searchName;
          return nameMatch || akaMatch;
        });
      }
      if (npc) {
        const timer = window.setTimeout(() => {
          setSelectedNPC(npc);
          const url = new URL(window.location.href);
          url.searchParams.set("selected", npc.id);
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, visibleNPCs, selectedNPC]);

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

  const handleSaveNPC = async (data: Partial<NPC>) => {
    try {
      let response;
      if (data.id && isEditing) {
        response = await authFetch("/api/data/npcs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        response = await authFetch("/api/data/npcs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, id: `npc_${Date.now()}` }),
        });
      }
      if (response.ok) {
        const npcsResponse = await authFetch("/api/data/npcs");
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        if (isEditing && selectedNPC && data.id === selectedNPC.id) {
          const updated = npcs.find((n: NPC) => n.id === data.id);
          if (updated) setSelectedNPC(updated);
        }
        setIsEditing(false);
        setShowAddForm(false);
        setEditingNPC({});
      }
    } catch {
      /* noop */
    }
  };

  const handleDeleteNPC = async (npcId: string) => {
    if (!confirm("Are you sure you want to delete this NPC?")) return;
    try {
      const response = await authFetch(`/api/data/npcs?id=${npcId}`, { method: "DELETE" });
      if (response.ok) {
        const npcsResponse = await authFetch("/api/data/npcs");
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        if (selectedNPC?.id === npcId) setSelectedNPC(null);
      }
    } catch {
      /* noop */
    }
  };

  const handleUpdateNPCNotes = async (npcId: string, updatedNotes: UserNote[]) => {
    try {
      const currentNPC = npcData.find((n: NPC) => n.id === npcId);
      if (!currentNPC) return;
      const response = await authFetch("/api/data/npcs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentNPC, notes: updatedNotes }),
      });
      if (response.ok) {
        const npcsResponse = await authFetch("/api/data/npcs");
        const npcs = await npcsResponse.json();
        setNpcData(npcs);
        if (selectedNPC?.id === npcId) {
          const updated = npcs.find((n: NPC) => n.id === npcId);
          if (updated) setSelectedNPC(updated);
        }
      }
    } catch {
      /* noop */
    }
  };

  const startEditing = (npc: NPC) => {
    setEditingNPC(npc);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const startAdding = () => {
    setEditingNPC({ name: "", aka: "", pronunciation: "", race: "", gender: "", description: "", location: "", status: "Alive", background: "", personality: "", image: "", factions: [], hidden: false, nameHidden: false, notes: [] });
    setIsEditing(false);
    setShowAddForm(true);
  };

  const clearSelectedNPC = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("selected");
    window.history.replaceState({}, "", url.pathname + url.search);
    setTimeout(() => setSelectedNPC(null), 0);
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

  const previewNPC = hoveredNPC || sortedNPCs[0] || null;

  return (
    <>
      {/* Admin add/edit modal */}
      {showAddForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowAddForm(false); setIsEditing(false); setEditingNPC({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              {isEditing ? "Edit Dossier" : "Inscribe New Soul"}
            </h2>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSaveNPC(editingNPC); }}
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
                <MarkdownEditor value={editingNPC.description || ""} onChange={(v) => setEditingNPC({ ...editingNPC, description: v })} rows={4} label="Description" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Background</label>
                <MarkdownEditor value={editingNPC.background || ""} onChange={(v) => setEditingNPC({ ...editingNPC, background: v })} rows={5} label="Background" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Personality</label>
                <MarkdownEditor value={editingNPC.personality || ""} onChange={(v) => setEditingNPC({ ...editingNPC, personality: v })} rows={4} label="Personality" />
              </div>
              <div>
                <UserNotesEditor notes={editingNPC.notes || []} onChange={(notes) => setEditingNPC({ ...editingNPC, notes })} currentUser={userId} isAdmin={isAdmin} className="mt-2" />
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
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setIsEditing(false); setEditingNPC({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">{isEditing ? "Save Changes" : "Inscribe Soul"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full image modal */}
      {selectedNPC && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${showFullImage ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ background: "oklch(0 0 0 / 0.85)" }}
          onClick={() => setShowFullImage(false)}
        >
          <div
            className={`relative max-w-3xl w-full transform transition-transform duration-300 ${showFullImage ? "scale-100" : "scale-90"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedNpcImage ? (
              <Image src={selectedNpcImage} alt={displayName(selectedNPC) || ""} width={900} height={600} style={{ objectFit: "contain" }} className={`rounded shadow-2xl transition-all duration-300 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} />
            ) : (
              <div className={`w-full h-[600px] grim-img-slot is-portrait flex items-center justify-center text-5xl transition-all duration-300 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} style={{ color: "var(--grim-ink-4)" }}>?</div>
            )}
            <button className="grim-btn is-ghost absolute top-2 right-2" onClick={() => setShowFullImage(false)}>Close</button>
          </div>
        </div>
      )}

      {selectedNPC ? (
        /* ── NPC DETAIL ── */
        <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div className="grim-row" style={{ gap: 18 }}>
              <button
                className="grim-btn is-ghost"
                onClick={() => {
                  if (referrerInfo.label !== "NPCs") {
                    router.push(backInfo.url);
                  } else {
                    clearSelectedNPC();
                  }
                }}
              >
                ‹ Back to the Codex
              </button>
              <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
                codex / npcs / {displayName(selectedNPC).toLowerCase()}
              </div>
            </div>
            <div className="grim-row" style={{ gap: 8 }}>
              {(isDM || isAdmin) && (
                <button
                  className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
                  onClick={() => setDmMode(!dmMode)}
                >
                  <span className="grim-flame" style={{ width: 6, height: 6 }} />
                  {dmMode ? "DM Sight · ON" : "DM Sight · OFF"}
                </button>
              )}
              {isAdmin && (
                <>
                  <button className="grim-btn is-ghost" onClick={() => startEditing(selectedNPC)}>Edit</button>
                  <button className="grim-btn is-blood" onClick={() => handleDeleteNPC(selectedNPC.id)}>Strike</button>
                </>
              )}
            </div>
          </div>

          {/* Hero — portrait + name + stats */}
          <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, marginBottom: 28 }}>
            {/* Portrait */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {hasValidImage(selectedNPC.image) ? (
                <div
                  style={{ width: 280, height: 360, position: "relative", border: "1px solid var(--grim-gold-2)", cursor: "pointer" }}
                  onClick={() => setShowFullImage(true)}
                >
                  <Image
                    src={safeImageSrc(selectedNPC.image)!}
                    alt={displayName(selectedNPC) || ""}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center top", filter: selectedNPC.status?.toLowerCase() === "deceased" ? "grayscale(0.6)" : "none" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 70%, oklch(0.10 0.025 290 / 0.5))" }} />
                  <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, padding: "5px 9px", background: "oklch(0.10 0.02 290 / 0.75)", border: "1px solid var(--grim-gold-2)", display: "flex", justifyContent: "space-between" }}>
                    <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--grim-gold)", textTransform: "uppercase" }}>portrait · click to enlarge</span>
                    <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)" }}>↗</span>
                  </div>
                </div>
              ) : (
                <div className="grim-img-slot is-portrait" style={{ width: 280, height: 360, border: "1px solid var(--grim-gold-2)" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-4)" }}>?</div>
                    <div style={{ marginTop: 8, fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-4)" }}>no likeness on file</div>
                  </div>
                </div>
              )}
              <div style={{ position: "absolute", top: -10, left: -10, transform: "rotate(-5deg)" }}>
                <div className="grim-seal" style={{ width: 48, height: 48, fontSize: 18 }}>✦</div>
              </div>
            </div>

            {/* Name + info */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 4 }}>
              <div>
                <div className="grim-page-eyebrow">Dossier of an Encountered Soul</div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, color: "var(--grim-gold)", margin: "2px 0 4px", lineHeight: 0.9, letterSpacing: ".01em", textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
                  {displayName(selectedNPC) || "Unknown"}
                </h1>
                {!isNameHidden(selectedNPC) && selectedNPC.pronunciation && (
                  <div style={{ fontFamily: "var(--font-body)", color: "var(--grim-ink-2)", fontSize: 17 }}>
                    pronounced <b style={{ fontFamily: "var(--font-head)", letterSpacing: ".10em" }}>{selectedNPC.pronunciation}</b>
                  </div>
                )}
                {selectedNPC.aka && !isNameHidden(selectedNPC) && (
                  <div style={{ fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--grim-ink-3)", fontSize: 15, marginTop: 3 }}>
                    known as &ldquo;{selectedNPC.aka}&rdquo;
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                  <span className={statusChipClass(selectedNPC.status)}>{selectedNPC.status || "Unknown"}</span>
                  {selectedNPC.race && <span className="grim-chip">{selectedNPC.race}{selectedNPC.gender ? ` · ${selectedNPC.gender}` : ""}</span>}
                  {selectedNPC.factions && selectedNPC.factions.length > 0 && selectedNPC.factions.map((fid) => (
                    <button
                      key={fid}
                      className="grim-chip is-faction"
                      style={{ cursor: "pointer", border: "1px solid oklch(0.68 0.115 82 / 0.45)" }}
                      onClick={() => router.push(`/campaign/factions?selected=${encodeURIComponent(fid)}`)}
                    >
                      ⚑ {getFactionName(fid)}
                    </button>
                  ))}
                  {selectedNPC.location && <span className="grim-chip is-arcane">last seen · {selectedNPC.location}</span>}
                </div>
              </div>

              {/* Stat strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: 22, borderTop: "1px solid var(--grim-line)", borderBottom: "1px solid var(--grim-line)", padding: "12px 0" }}>
                {[
                  ["Race", selectedNPC.race || "—"],
                  ["Gender", selectedNPC.gender || "—"],
                  ["Location", selectedNPC.location || "—"],
                ].map(([k, v], i) => (
                  <div key={k} style={{ paddingLeft: i === 0 ? 0 : 16, borderLeft: i === 0 ? "none" : "1px solid var(--grim-line)" }}>
                    <div className="grim-label">{k}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1.15, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Description parchment block */}
          {selectedNPC.description && (
            <section className="grim-parchment" style={{ marginBottom: 28 }}>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "oklch(0.25 0.03 50)" }}>
                {selectedNPC.description}
              </p>
            </section>
          )}

          {/* Two-column body */}
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 22 }}>

            {/* Left column */}
            <div className="grim-stack" style={{ gap: 22 }}>
              {selectedNPC.background && (
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Background</h3>
                    <span className="grim-tome-sub">history &amp; origin</span>
                  </div>
                  <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNPC.background || "", isAdmin) }} />
                </section>
              )}
              {selectedNPC.personality && (
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Personality</h3>
                    <span className="grim-tome-sub">manner &amp; disposition</span>
                  </div>
                  <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNPC.personality || "", isAdmin) }} />
                </section>
              )}
              {!selectedNPC.background && !selectedNPC.personality && (
                <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "28px 24px", color: "var(--grim-ink-4)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-ink-3)" }}>~ unwritten ~</div>
                  <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>No further record in the codex</div>
                </section>
              )}
            </div>

            {/* Right column */}
            <div className="grim-stack" style={{ gap: 22 }}>
              {/* DM-only notes */}
              {(isDM || isAdmin) && (
                dmMode ? (
                  selectedNPC.gm_notes ? (
                    <section className="grim-tome" style={{ border: "1px solid var(--grim-arcane)", background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                      <div className="grim-tome-head" style={{ borderColor: "oklch(0.65 0.150 285 / 0.30)" }}>
                        <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>★ Master&apos;s Marginalia</h3>
                        <span className="grim-tome-sub">hidden from the party</span>
                      </div>
                      <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedNPC.gm_notes || "", true) }} />
                    </section>
                  ) : isAdmin ? (
                    <section className="grim-tome" style={{ border: "1px dashed oklch(0.65 0.150 285 / 0.5)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "oklch(0.65 0.150 285 / 0.6)" }}>~ no marginalia ~</div>
                      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Edit to add DM notes</div>
                    </section>
                  ) : null
                ) : (
                  <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--grim-ink-3)" }}>~ sealed ~</div>
                    <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Master&apos;s marginalia hidden</div>
                  </section>
                )
              )}

              {/* User notes */}
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Party Notes</h3>
                  <span className="grim-tome-sub">field observations</span>
                </div>
                <UserNotesEditor
                  notes={selectedNPC.notes || []}
                  onChange={(notes) => handleUpdateNPCNotes(selectedNPC.id, notes)}
                  currentUser={userId}
                  isAdmin={isAdmin}
                />
              </section>
            </div>
          </div>
        </div>
      ) : (
        /* ── NPC LIST ── */
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {sortedNPCs.map((npc) => (
                    <div
                      key={npc.id}
                      onMouseEnter={() => setHoveredNPC(npc)}
                      onMouseLeave={() => setHoveredNPC(null)}
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.delete("selected");
                        window.history.replaceState({}, "", url.pathname + url.search);
                        setSelectedNPC(npc);
                      }}
                      className="grim-tome"
                      style={{
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: `1px solid ${hoveredNPC?.id === npc.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                        transform: hoveredNPC?.id === npc.id ? "translateY(-2px)" : "none",
                        transition: "transform 0.15s ease, border-color 0.15s ease",
                      }}
                    >
                      {/* Card portrait */}
                      <div style={{ position: "relative", height: 120 }}>
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
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, oklch(0.10 0.025 290 / 0.80))" }} />
                        <div style={{ position: "absolute", top: 7, left: 7 }}>
                          <span className={statusChipClass(npc.status)} style={{ fontSize: 9, padding: "2px 6px" }}>{npc.status || "Unknown"}</span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ padding: "10px 12px 12px" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {displayName(npc) || "Unknown"}
                        </div>
                        <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-3)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {npc.race}{npc.gender ? ` · ${npc.gender}` : ""}
                        </div>
                        {npc.description && (
                          <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.4, minHeight: 30, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            &ldquo;{npc.description}&rdquo;
                          </div>
                        )}
                        {npc.factions && npc.factions.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 7, borderTop: "1px dashed var(--grim-line)" }}>
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
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.delete("selected");
                          window.history.replaceState({}, "", url.pathname + url.search);
                          setSelectedNPC(previewNPC);
                        }}
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
      )}
    </>
  );
}
