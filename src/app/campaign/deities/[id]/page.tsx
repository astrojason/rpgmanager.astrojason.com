"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { Deity, NPC, PC, UserNote, SessionRecap, Quest } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import UserNotesEditor from "@/components/UserNotesEditor";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import Link from "next/link";
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

export default function DeityDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [deity, setDeity] = useState<Deity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDeity, setEditingDeity] = useState<Partial<Deity>>({});
  const [dmMode, setDmMode] = useState(false);

  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [pcs, setPcs] = useState<PC[]>([]);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  usePageTracking();

  const loadAll = async () => {
    try {
      const [deitiesRes, recapsRes, questsRes, npcsRes, pcsRes] = await Promise.all([
        authFetch("/api/data/deities"),
        authFetch("/api/data/session-recaps"),
        authFetch("/api/data/quests"),
        authFetch("/api/data/npcs"),
        authFetch("/api/data/pcs"),
      ]);
      const allDeities: Deity[] = deitiesRes.ok ? await deitiesRes.json() : [];
      const found = allDeities.find(d => String(d.id) === id);
      if (!found) { setNotFound(true); return; }
      setDeity(found);
      setRecaps(recapsRes.ok ? await recapsRes.json() : []);
      setQuests(questsRes.ok ? await questsRes.json() : []);
      setNpcs(npcsRes.ok ? await npcsRes.json() : []);
      setPcs(pcsRes.ok ? await pcsRes.json() : []);
    } catch (e) {
      setError(toErrorMessage(e));
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);
  useEffect(() => { setDmMode(isDM || isAdmin); }, [isDM, isAdmin]);

  const refreshDeity = async () => {
    const res = await authFetch("/api/data/deities");
    if (res.ok) {
      const all: Deity[] = await res.json();
      const updated = all.find(d => String(d.id) === id);
      if (updated) setDeity(updated);
    }
  };

  const handleSave = async (data: Partial<Deity>) => {
    try {
      const res = await authFetch("/api/data/deities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshDeity();
      setShowEditForm(false);
      setEditingDeity({});
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!deity || !confirm("Are you sure you want to delete this deity?")) return;
    try {
      const res = await authFetch(`/api/data/deities?id=${deity.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/campaign/deities");
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!deity) return;
    try {
      const res = await authFetch("/api/data/deities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...deity, notes }),
      });
      if (res.ok) await refreshDeity();
      else throw new Error(await res.text());
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const startEditing = () => {
    if (!deity) return;
    setEditingDeity({ ...deity });
    setShowEditForm(true);
  };

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

  if (notFound || !deity) {
    return (
      <div style={{ padding: "36px 56px 80px" }}>
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/deities")}>‹ Back to the Pantheon</button>
        <div style={{ marginTop: 32, textAlign: "center", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ divinity not found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>No record of this power in the compendium</div>
        </div>
      </div>
    );
  }

  const linkedRecaps = recaps
    .filter(r => (r.tagged_deities ?? []).includes(id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const linkedQuests = quests.filter(q => (q.tagged_deities ?? []).includes(id));

  const deityImage = safeImageSrc(deity.image);

  return (
    <>
      {/* Edit modal */}
      {showEditForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.75)" }}
          onClick={() => { setShowEditForm(false); setEditingDeity({}); }}
        >
          <div
            style={{ background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)", maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 16, padding: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Amend the Compendium Entry
            </h2>
            <form
              onSubmit={e => { e.preventDefault(); handleSave(editingDeity); }}
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
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Symbol</label>
                <input type="text" value={editingDeity.symbol || ""} onChange={e => setEditingDeity({ ...editingDeity, symbol: e.target.value })} style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "8px 12px", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Church</label>
                <MarkdownEditor value={editingDeity.church || ""} onChange={v => setEditingDeity({ ...editingDeity, church: v })} rows={3} label="Church" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Garments</label>
                <MarkdownEditor value={editingDeity.garments || ""} onChange={v => setEditingDeity({ ...editingDeity, garments: v })} rows={3} label="Garments" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Tenets</label>
                <MarkdownEditor value={editingDeity.tenets || ""} onChange={v => setEditingDeity({ ...editingDeity, tenets: v })} rows={4} label="Tenets" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Lore</label>
                <MarkdownEditor value={editingDeity.lore || ""} onChange={v => setEditingDeity({ ...editingDeity, lore: v })} rows={5} label="Lore" />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Notable Followers — NPCs</label>
                <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 160, overflowY: "auto", padding: "6px 0" }}>
                  {npcs.filter(n => !n.hidden).map(n => {
                    const nid = String(n.id);
                    return (
                      <label key={nid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (editingDeity.follower_npcs ?? []).includes(nid) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent" }}>
                        <input type="checkbox" checked={(editingDeity.follower_npcs ?? []).includes(nid)} onChange={e => { const cur = editingDeity.follower_npcs ?? []; setEditingDeity({ ...editingDeity, follower_npcs: e.target.checked ? [...cur, nid] : cur.filter(x => x !== nid) }); }} style={{ accentColor: "var(--grim-ember)" }} />
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{n.name || n.aka || nid}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 6 }}>Notable Followers — PCs</label>
                <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)", maxHeight: 120, overflowY: "auto", padding: "6px 0" }}>
                  {pcs.map(p => {
                    const pid = String(p.id);
                    return (
                      <label key={pid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", cursor: "pointer", background: (editingDeity.follower_pcs ?? []).includes(pid) ? "oklch(0.55 0.090 145 / 0.12)" : "transparent" }}>
                        <input type="checkbox" checked={(editingDeity.follower_pcs ?? []).includes(pid)} onChange={e => { const cur = editingDeity.follower_pcs ?? []; setEditingDeity({ ...editingDeity, follower_pcs: e.target.checked ? [...cur, pid] : cur.filter(x => x !== pid) }); }} style={{ accentColor: "var(--grim-moss)" }} />
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
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
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingDeity({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEITY DETAIL */}
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div className="grim-row" style={{ gap: 18 }}>
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/deities")}>
              ‹ Back to the Pantheon
            </button>
            <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
              pantheon / {deity.name.toLowerCase()}
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
                <button className="grim-btn is-blood" onClick={handleDelete}>Strike</button>
              </>
            )}
          </div>
        </div>

        {/* Hero */}
        <section style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, marginBottom: 28 }}>
          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 160, height: 160, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--grim-gold-2)", position: "relative", background: "var(--grim-bg-3)", flexShrink: 0 }}>
              {deityImage ? (
                <Image src={deityImage} alt={deity.name} fill style={{ objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 56, color: "var(--grim-gold-2)", opacity: 0.6 }}>✦</div>
              )}
            </div>
          </div>

          {/* Name + info */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 4 }}>
            <div>
              <div className="grim-page-eyebrow">Compendium Entry — The Pantheon</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 68, color: "var(--grim-gold)", margin: "2px 0 4px", lineHeight: 0.9, letterSpacing: ".01em", textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
                {deity.name}
              </h1>
              {deity.pronunciation && (
                <div style={{ fontFamily: "var(--font-body)", color: "var(--grim-ink-2)", fontSize: 17, marginTop: 6 }}>
                  pronounced <b style={{ fontFamily: "var(--font-head)", letterSpacing: ".10em" }}>{deity.pronunciation}</b>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {deity.domain && <span className="grim-chip">{deity.domain}</span>}
                {deity.alignment && <span className={alignmentChipClass(deity.alignment)}>{deity.alignment}</span>}
                {deity.status && <span className="grim-chip is-unknown">{deity.status}</span>}
                {deity.hidden && isAdmin && <span className="grim-chip is-blood">hidden from players</span>}
              </div>
            </div>

            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${deity.symbol ? 4 : 3}, 1fr)`, marginTop: 22, borderTop: "1px solid var(--grim-line)", borderBottom: "1px solid var(--grim-line)", padding: "12px 0" }}>
              {[
                ["Domain", deity.domain || "—"],
                ["Alignment", deity.alignment || "—"],
                ["Status", deity.status || "—"],
                ...(deity.symbol ? [["Symbol", deity.symbol]] : []),
              ].map(([k, v], i) => (
                <div key={k} style={{ paddingLeft: i === 0 ? 0 : 16, borderLeft: i === 0 ? "none" : "1px solid var(--grim-line)" }}>
                  <div className="grim-label">{k}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--grim-gold)", lineHeight: 1.2, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Description parchment */}
        {deity.description && (
          <section className="grim-parchment" style={{ marginBottom: 28 }}>
            <div className="prose dark:prose-invert max-w-none prose-sm" style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "oklch(0.25 0.03 50)" }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.description, isAdmin) }} />
          </section>
        )}

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 22 }}>

          {/* Left column: content + appearances */}
          <div className="grim-stack" style={{ gap: 22 }}>
            {deity.lore && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Lore</h3>
                  <span className="grim-tome-sub">history &amp; legend</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.lore, isAdmin) }} />
              </section>
            )}
            {deity.tenets && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Tenets</h3>
                  <span className="grim-tome-sub">the sacred laws</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.tenets, isAdmin) }} />
              </section>
            )}
            {(() => {
              const followerNpcs = npcs.filter(n => (deity.follower_npcs ?? []).includes(String(n.id)));
              const followerPcs = pcs.filter(p => (deity.follower_pcs ?? []).includes(String(p.id)));
              if (followerNpcs.length === 0 && followerPcs.length === 0) return null;
              return (
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Notable Followers</h3>
                    <span className="grim-tome-sub">{followerNpcs.length + followerPcs.length} disciple{followerNpcs.length + followerPcs.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="grim-stack" style={{ gap: 8 }}>
                    {followerNpcs.map(n => (
                      <Link key={n.id} href={`/campaign/npcs/${n.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{n.name || n.aka || "Unknown"}</span>
                          <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{n.race || "NPC"}</span>
                        </div>
                      </Link>
                    ))}
                    {followerPcs.map(p => (
                      <Link key={p.id} href={`/campaign/pcs/${p.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ember-2)", letterSpacing: ".03em" }}>{p.name}</span>
                          <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{p.class || "PC"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })()}
            {linkedRecaps.length === 0 && linkedQuests.length === 0 && !deity.lore && !deity.tenets && (deity.follower_npcs ?? []).length === 0 && (deity.follower_pcs ?? []).length === 0 ? (
              <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "28px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-ink-3)" }}>~ unrecorded ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>No record yet in the codex</div>
              </section>
            ) : (linkedRecaps.length > 0 || linkedQuests.length > 0) ? (
              <>
                {linkedRecaps.length > 0 && (
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Session Appearances</h3>
                      <span className="grim-tome-sub">{linkedRecaps.length} recap{linkedRecaps.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grim-stack" style={{ gap: 8 }}>
                      {linkedRecaps.map(r => (
                        <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{r.title}</span>
                            <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{r.date}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
                {linkedQuests.length > 0 && (
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Related Quests</h3>
                      <span className="grim-tome-sub">{linkedQuests.length} quest{linkedQuests.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grim-stack" style={{ gap: 8 }}>
                      {linkedQuests.map(q => (
                        <Link key={q.id} href={`/campaign/quests/${q.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{q.name}</span>
                            <span className="grim-chip" style={{ fontSize: 9 }}>{q.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : null}
          </div>

          {/* Right column: church, garments, GM notes, user notes */}
          <div className="grim-stack" style={{ gap: 22 }}>
            {deity.church && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Church</h3>
                  <span className="grim-tome-sub">clergy &amp; organisation</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.church, isAdmin) }} />
              </section>
            )}
            {deity.garments && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Garments</h3>
                  <span className="grim-tome-sub">vestments &amp; regalia</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.garments, isAdmin) }} />
              </section>
            )}
            {(isDM || isAdmin) && (
              dmMode ? (
                deity.gm_notes ? (
                  <section className="grim-tome" style={{ border: "1px solid var(--grim-arcane)", background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head" style={{ borderColor: "oklch(0.65 0.150 285 / 0.30)" }}>
                      <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>★ Master&apos;s Compendium</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm" style={{ color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.gm_notes, true) }} />
                  </section>
                ) : isAdmin ? (
                  <section className="grim-tome" style={{ border: "1px dashed oklch(0.65 0.150 285 / 0.5)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "oklch(0.65 0.150 285 / 0.6)" }}>~ no compendium notes ~</div>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Edit to add DM notes</div>
                  </section>
                ) : null
              ) : (
                <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--grim-ink-3)" }}>~ sealed ~</div>
                  <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Master&apos;s compendium hidden</div>
                </section>
              )
            )}

            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Party Notes</h3>
                <span className="grim-tome-sub">field observations</span>
              </div>
              <UserNotesEditor
                notes={deity.notes || []}
                onChange={handleUpdateNotes}
                currentUser={userId}
                isAdmin={isAdmin}
              />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
