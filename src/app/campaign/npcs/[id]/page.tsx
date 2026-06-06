"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { NPC, Faction, Deity, UserNote, SessionRecap } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import UserNotesEditor from "@/components/UserNotesEditor";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc, sanitizeOptionalText } from "@/utils/sanitize";
import Link from "next/link";

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "alive") return "grim-chip is-alive";
  if (s === "deceased" || s === "dead") return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function NPCDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [npc, setNpc] = useState<NPC | null>(null);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [appearances, setAppearances] = useState<SessionRecap[]>([]);
  const [deities, setDeities] = useState<Deity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [dmMode, setDmMode] = useState(false);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [npcsResponse, factionsResponse, recapsResponse, deitiesResponse] = await Promise.all([
          authFetch("/api/data/npcs"),
          authFetch("/api/data/factions"),
          authFetch("/api/data/session-recaps"),
          authFetch("/api/data/deities"),
        ]);
        const npcs = await npcsResponse.json();
        const factions = await factionsResponse.json();
        const recaps: SessionRecap[] = recapsResponse.ok ? await recapsResponse.json() : [];
        const found = npcs.find((n: NPC) => String(n.id) === id);
        if (!found) {
          setNotFound(true);
        } else {
          setNpc(found);
        }
        setFactionData(factions);
        const tagged = recaps
          .filter(r => (r.tagged_npcs ?? []).includes(id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAppearances(tagged);
        if (deitiesResponse.ok) {
          const allDeities: Deity[] = await deitiesResponse.json();
          setDeities(allDeities.filter(d => (d.follower_npcs ?? []).includes(id)));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    setDmMode(isDM || isAdmin);
  }, [isDM, isAdmin]);

  const cleanText = (value?: string | null) => sanitizeOptionalText(value) ?? "";
  const isNameHidden = (n: NPC) => Boolean(n.nameHidden || n.hide_name);
  const displayName = (n: NPC) =>
    isNameHidden(n)
      ? cleanText(n.display_name) || cleanText(n.aka)
      : cleanText(n.name) || cleanText(n.aka);
  const hasValidImage = (src?: string | null) => Boolean(safeImageSrc(src));

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const refreshNpc = async () => {
    const npcsResponse = await authFetch("/api/data/npcs");
    const npcs = await npcsResponse.json();
    const updated = npcs.find((n: NPC) => String(n.id) === id);
    if (updated) setNpc(updated);
  };

  const handleSaveNPC = async (data: Partial<NPC>) => {
    try {
      const response = await authFetch("/api/data/npcs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        await refreshNpc();
        setShowEditForm(false);
        setEditingNPC({});
      }
    } catch {
      /* noop */
    }
  };

  const handleDeleteNPC = async () => {
    if (!npc || !confirm("Are you sure you want to delete this NPC?")) return;
    try {
      const response = await authFetch(`/api/data/npcs?id=${npc.id}`, { method: "DELETE" });
      if (response.ok) router.push("/campaign/npcs");
    } catch {
      /* noop */
    }
  };

  const handleUpdateNPCNotes = async (updatedNotes: UserNote[]) => {
    if (!npc) return;
    try {
      const response = await authFetch("/api/data/npcs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...npc, notes: updatedNotes }),
      });
      if (response.ok) await refreshNpc();
    } catch {
      /* noop */
    }
  };

  const startEditing = () => {
    if (!npc) return;
    setEditingNPC(npc);
    setShowEditForm(true);
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

  if (notFound || !npc) {
    return (
      <div style={{ padding: "36px 56px 80px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/npcs")}>‹ Back to the Codex</button>
        <div style={{ marginTop: 32, textAlign: "center", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ soul not found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>No record of this soul in the codex</div>
        </div>
      </div>
    );
  }

  const selectedNpcImage = safeImageSrc(npc.image);

  const linkEntities = [
    ...factionData.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...deities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <>
      {/* Admin edit modal */}
      {showEditForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowEditForm(false); setEditingNPC({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Edit Dossier
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
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingNPC({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full image modal */}
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
            <Image src={selectedNpcImage} alt={displayName(npc) || ""} width={900} height={600} style={{ objectFit: "contain" }} className={`rounded shadow-2xl transition-all duration-300 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} />
          ) : (
            <div className={`w-full h-[600px] grim-img-slot is-portrait flex items-center justify-center text-5xl transition-all duration-300 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} style={{ color: "var(--grim-ink-4)" }}>?</div>
          )}
          <button className="grim-btn is-ghost absolute top-2 right-2" onClick={() => setShowFullImage(false)}>Close</button>
        </div>
      </div>

      {/* NPC DETAIL */}
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div className="grim-row" style={{ gap: 18 }}>
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/npcs")}>
              ‹ Back to the Codex
            </button>
            <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
              codex / npcs / {displayName(npc).toLowerCase()}
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
                <button className="grim-btn is-ghost" onClick={startEditing}>Edit</button>
                <button className="grim-btn is-blood" onClick={handleDeleteNPC}>Strike</button>
              </>
            )}
          </div>
        </div>

        {/* Hero — portrait + name + stats */}
        <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, marginBottom: 28 }}>
          {/* Portrait */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {hasValidImage(npc.image) ? (
              <div
                style={{ width: 280, height: 360, position: "relative", border: "1px solid var(--grim-gold-2)", cursor: "pointer" }}
                onClick={() => setShowFullImage(true)}
              >
                <Image
                  src={safeImageSrc(npc.image)!}
                  alt={displayName(npc) || ""}
                  fill
                  style={{ objectFit: "cover", objectPosition: "center top", filter: npc.status?.toLowerCase() === "deceased" ? "grayscale(0.6)" : "none" }}
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
                {displayName(npc) || "Unknown"}
              </h1>
              {!isNameHidden(npc) && npc.pronunciation && (
                <div style={{ fontFamily: "var(--font-body)", color: "var(--grim-ink-2)", fontSize: 17 }}>
                  pronounced <b style={{ fontFamily: "var(--font-head)", letterSpacing: ".10em" }}>{npc.pronunciation}</b>
                </div>
              )}
              {npc.aka && !isNameHidden(npc) && (
                <div style={{ fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--grim-ink-3)", fontSize: 15, marginTop: 3 }}>
                  known as &ldquo;{npc.aka}&rdquo;
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <span className={statusChipClass(npc.status)}>{npc.status || "Unknown"}</span>
                {npc.race && <span className="grim-chip">{npc.race}{npc.gender ? ` · ${npc.gender}` : ""}</span>}
                {npc.factions && npc.factions.length > 0 && npc.factions.map((fid) => (
                  <button
                    key={fid}
                    className="grim-chip is-faction"
                    style={{ cursor: "pointer", border: "1px solid oklch(0.68 0.115 82 / 0.45)" }}
                    onClick={() => router.push(`/campaign/factions/${fid}`)}
                  >
                    ⚑ {getFactionName(fid)}
                  </button>
                ))}
                {npc.location && <span className="grim-chip is-arcane">last seen · {npc.location}</span>}
              </div>
            </div>

            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: 22, borderTop: "1px solid var(--grim-line)", borderBottom: "1px solid var(--grim-line)", padding: "12px 0" }}>
              {[
                ["Race", npc.race || "—"],
                ["Gender", npc.gender || "—"],
                ["Location", npc.location || "—"],
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
        {npc.description && (
          <section className="grim-parchment" style={{ marginBottom: 28 }}>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "oklch(0.25 0.03 50)" }}>
              {npc.description}
            </p>
          </section>
        )}

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 22 }}>

          {/* Left column */}
          <div className="grim-stack" style={{ gap: 22 }}>
            {npc.background && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Background</h3>
                  <span className="grim-tome-sub">history &amp; origin</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.background || "", isAdmin) }} />
              </section>
            )}
            {npc.personality && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Personality</h3>
                  <span className="grim-tome-sub">manner &amp; disposition</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.personality || "", isAdmin) }} />
              </section>
            )}
            {!npc.background && !npc.personality && (
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
                npc.gm_notes ? (
                  <section className="grim-tome" style={{ border: "1px solid var(--grim-arcane)", background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head" style={{ borderColor: "oklch(0.65 0.150 285 / 0.30)" }}>
                      <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>★ Master&apos;s Marginalia</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.gm_notes || "", true) }} />
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
                notes={npc.notes || []}
                onChange={handleUpdateNPCNotes}
                currentUser={userId}
                isAdmin={isAdmin}
                linkEntities={linkEntities}
              />
            </section>

            {/* Deity */}
            {deities.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Divine Devotion</h3>
                  <span className="grim-tome-sub">{deities.length === 1 ? "deity" : "deities"}</span>
                </div>
                <div className="grim-stack" style={{ gap: 8 }}>
                  {deities.map(d => (
                    <Link key={d.id} href={`/campaign/deities/${d.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-gold)", letterSpacing: ".03em" }}>✦ {d.name}</span>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{d.domain || "—"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Session appearances */}
            {appearances.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Session Appearances</h3>
                  <span className="grim-tome-sub">{appearances.length} recap{appearances.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack" style={{ gap: 8 }}>
                  {appearances.map((r) => (
                    <Link
                      key={r.id ?? r.date}
                      href={`/campaign/recaps/${r.id ?? r.date}`}
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{r.title}</span>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{r.date}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
