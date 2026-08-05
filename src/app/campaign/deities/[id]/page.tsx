"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import ConfirmModal from "@/components/ConfirmModal";

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

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDeity, setEditingDeity] = useState<Partial<Deity>>({});
  const [dmMode, setDmMode] = useState(false);

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: allDeities = [], isPending: loading } = useQuery<Deity[]>({
    queryKey: ['/api/data/deities'],
    queryFn: async () => { const r = await authFetch("/api/data/deities"); if (!r.ok) throw new Error("Failed to load deities"); return r.json(); },
  });
  const { data: recaps = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });
  const { data: quests = [] } = useQuery<Quest[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => { const r = await authFetch("/api/data/quests"); if (!r.ok) throw new Error("Failed to load quests"); return r.json(); },
  });
  const { data: npcs = [] } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => { const r = await authFetch("/api/data/npcs"); if (!r.ok) throw new Error("Failed to load NPCs"); return r.json(); },
  });
  const { data: pcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });

  const deity = useMemo(() => allDeities.find(d => String(d.id) === id) ?? null, [allDeities, id]);
  const notFound = !loading && !deity;

  useEffect(() => { setDmMode(isDM || isAdmin); }, [isDM, isAdmin]);

  const handleSave = async (data: Partial<Deity>) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/data/deities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: ['/api/data/deities'] });
      setShowEditForm(false);
      setEditingDeity({});
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!deity) return;
    setConfirmState({
      message: "Are you sure you want to delete this deity?",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await authFetch(`/api/data/deities?id=${deity.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(await res.text());
          router.push("/campaign/deities");
        } catch (e) {
          setError(toErrorMessage(e));
        }
      },
    });
  };

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!deity) return;
    setError(null);
    try {
      const res = await authFetch("/api/data/deities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deity.id, notes }),
      });
      if (res.ok) await queryClient.invalidateQueries({ queryKey: ['/api/data/deities'] });
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
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the divine compendium&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !deity) {
    return (
      <div className="pt-9 px-14 pb-20">
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/deities")}>‹ Back to the Pantheon</button>
        <div className="mt-8 text-center text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3">~ divinity not found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">No record of this power in the compendium</div>
        </div>
      </div>
    );
  }

  const linkedRecaps = recaps
    .filter(r => (r.tagged_deities ?? []).includes(id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const linkedQuests = quests.filter(q => (q.tagged_deities ?? []).includes(id));

  const deityImage = safeImageSrc(deity.image);

  const linkEntities = [
    ...npcs.map(n => ({ id: String(n.id), name: n.name || n.aka || String(n.id), type: 'npc' as const, url: `/campaign/npcs/${n.id}` })),
    ...pcs.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...quests.map(q => ({ id: String(q.id), name: q.name, type: 'quest' as const, url: `/campaign/quests/${q.id}` })),
  ];

  return (
    <>
      {/* Edit modal */}
      {showEditForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowEditForm(false); setEditingDeity({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 max-w-160 w-full overflow-y-auto m-4 p-8"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Amend the Compendium Entry
            </h2>
            <form
              onSubmit={e => { e.preventDefault(); handleSave(editingDeity); }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Name", field: "name" as keyof Deity, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Deity, full: false },
                  { label: "Domain", field: "domain" as keyof Deity, full: false },
                  { label: "Image URL", field: "image" as keyof Deity, full: true },
                ] as { label: string; field: keyof Deity; full: boolean }[]).map(({ label, field, full }) => (
                  <div key={field} className={full ? "col-span-full" : ""}>
                    <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(editingDeity[field] as string) || ""}
                      onChange={e => setEditingDeity({ ...editingDeity, [field]: e.target.value })}
                      className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Alignment</label>
                  <select
                    value={editingDeity.alignment || ""}
                    onChange={e => setEditingDeity({ ...editingDeity, alignment: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="">— Unknown —</option>
                    {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Status</label>
                  <select
                    value={editingDeity.status || "active"}
                    onChange={e => setEditingDeity({ ...editingDeity, status: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="forgotten">Forgotten</option>
                    <option value="dead">Dead</option>
                    <option value="ascendant">Ascendant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Description</label>
                <MarkdownEditor value={editingDeity.description || ""} onChange={v => setEditingDeity({ ...editingDeity, description: v })} rows={4} label="Description" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Symbol</label>
                <input type="text" value={editingDeity.symbol || ""} onChange={e => setEditingDeity({ ...editingDeity, symbol: e.target.value })} className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none" />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Church</label>
                <MarkdownEditor value={editingDeity.church || ""} onChange={v => setEditingDeity({ ...editingDeity, church: v })} rows={3} label="Church" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Garments</label>
                <MarkdownEditor value={editingDeity.garments || ""} onChange={v => setEditingDeity({ ...editingDeity, garments: v })} rows={3} label="Garments" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Tenets</label>
                <MarkdownEditor value={editingDeity.tenets || ""} onChange={v => setEditingDeity({ ...editingDeity, tenets: v })} rows={4} label="Tenets" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Lore</label>
                <MarkdownEditor value={editingDeity.lore || ""} onChange={v => setEditingDeity({ ...editingDeity, lore: v })} rows={5} label="Lore" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Notable Followers — NPCs</label>
                <div className="border border-grim-line-2 bg-grim-bg-3 max-h-40 overflow-y-auto py-1.5 px-0">
                  {npcs.filter(n => !n.hidden).map(n => {
                    const nid = String(n.id);
                    return (
                      <label key={nid} className={`flex items-center gap-2.5 py-1 px-3.5 cursor-pointer ${(editingDeity.follower_npcs ?? []).includes(nid) ? "bg-grim-ember/12" : "bg-transparent"}`}>
                        <input type="checkbox" checked={(editingDeity.follower_npcs ?? []).includes(nid)} onChange={e => { const cur = editingDeity.follower_npcs ?? []; setEditingDeity({ ...editingDeity, follower_npcs: e.target.checked ? [...cur, nid] : cur.filter(x => x !== nid) }); }} className="accent-grim-ember" />
                        <span className="font-body text-lg text-grim-ink-2">{n.name || n.aka || nid}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Notable Followers — PCs</label>
                <div className="border border-grim-line-2 bg-grim-bg-3 max-h-30 overflow-y-auto py-1.5 px-0">
                  {pcs.map(p => {
                    const pid = String(p.id);
                    return (
                      <label key={pid} className={`flex items-center gap-2.5 py-1 px-3.5 cursor-pointer ${(editingDeity.follower_pcs ?? []).includes(pid) ? "bg-grim-moss/12" : "bg-transparent"}`}>
                        <input type="checkbox" checked={(editingDeity.follower_pcs ?? []).includes(pid)} onChange={e => { const cur = editingDeity.follower_pcs ?? []; setEditingDeity({ ...editingDeity, follower_pcs: e.target.checked ? [...cur, pid] : cur.filter(x => x !== pid) }); }} className="accent-grim-moss" />
                        <span className="font-body text-lg text-grim-ink-2">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">GM Notes</label>
                <MarkdownEditor value={editingDeity.gm_notes || ""} onChange={v => setEditingDeity({ ...editingDeity, gm_notes: v })} rows={4} label="GM Notes" linkEntities={linkEntities} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-head text-lg text-grim-ink-2 tracking-wider">
                <input type="checkbox" checked={Boolean(editingDeity.hidden)} onChange={e => setEditingDeity({ ...editingDeity, hidden: e.target.checked })} className="accent-grim-ember" />
                Hidden from players
              </label>
              {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingDeity({}); setError(null); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                  {isSaving ? <><span className="grim-flame w-2 h-2" /> Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEITY DETAIL */}
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-7">
          <div className="grim-row gap-4.5">
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/deities")}>
              ‹ Back to the Pantheon
            </button>
            <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2">
              pantheon / {deity.name.toLowerCase()}
            </div>
          </div>
          <div className="grim-row gap-2">
            {(isDM || isAdmin) && (
              <button
                className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
                onClick={() => setDmMode(!dmMode)}
              >
                <span className="grim-flame w-1.5 h-1.5" />
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
        <section className="grid gap-7 mb-7" style={{ gridTemplateColumns: "200px 1fr" }}>
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-grim-gold-2 relative bg-grim-bg-3 shrink-0">
              {deityImage ? (
                <Image src={deityImage} alt={deity.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-7xl text-grim-gold-2 opacity-60">✦</div>
              )}
            </div>
          </div>

          {/* Name + info */}
          <div className="flex flex-col justify-between pt-1">
            <div>
              <div className="grim-page-eyebrow">Compendium Entry — The Pantheon</div>
              <h1 className="font-display text-8xl text-grim-gold mt-0.5 mx-0 mb-1 tracking-normal" style={{ lineHeight: 0.9, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
                {deity.name}
              </h1>
              {deity.pronunciation && (
                <div className="font-body text-grim-ink-2 text-2xl mt-1.5">
                  pronounced <b className="font-head tracking-widest">{deity.pronunciation}</b>
                </div>
              )}
              <div className="flex gap-2 mt-3.5 flex-wrap">
                {deity.domain && <span className="grim-chip">{deity.domain}</span>}
                {deity.alignment && <span className={alignmentChipClass(deity.alignment)}>{deity.alignment}</span>}
                {deity.status && <span className="grim-chip is-unknown">{deity.status}</span>}
                {deity.hidden && isAdmin && <span className="grim-chip is-blood">hidden from players</span>}
              </div>
            </div>

            {/* Stat strip */}
            <div className={`grid ${deity.symbol ? "grid-cols-4" : "grid-cols-3"} mt-5.5 border-t border-b border-grim-line py-3 px-0`}>
              {[
                ["Domain", deity.domain || "—"],
                ["Alignment", deity.alignment || "—"],
                ["Status", deity.status || "—"],
                ...(deity.symbol ? [["Symbol", deity.symbol]] : []),
              ].map(([k, v], i) => (
                <div key={k} className={i === 0 ? "pl-0" : "pl-4 border-l border-grim-line"}>
                  <div className="grim-label">{k}</div>
                  <div className="font-display text-xl text-grim-gold mt-0.75" style={{ lineHeight: 1.2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Description parchment */}
        {deity.description && (
          <section className="grim-parchment mb-7">
            <div className="prose dark:prose-invert max-w-none prose-sm m-0 text-xl text-grim-parchment-ink-2" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.description, isAdmin) }} />
          </section>
        )}

        {/* Two-column body */}
        <div className="grid gap-5.5" style={{ gridTemplateColumns: "1.05fr 0.95fr" }}>

          {/* Left column: content + appearances */}
          <div className="grim-stack gap-5.5">
            {deity.lore && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Lore</h3>
                  <span className="grim-tome-sub">history &amp; legend</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.lore, isAdmin) }} />
              </section>
            )}
            {deity.tenets && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Tenets</h3>
                  <span className="grim-tome-sub">the sacred laws</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.tenets, isAdmin) }} />
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
                  <div className="grim-stack gap-2">
                    {followerNpcs.map(n => (
                      <Link key={n.id} href={`/campaign/npcs/${n.id}`} className="no-underline text-inherit block">
                        <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                          <span className="font-head text-lg text-grim-ink tracking-wide">{n.name || n.aka || "Unknown"}</span>
                          <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{n.race || "NPC"}</span>
                        </div>
                      </Link>
                    ))}
                    {followerPcs.map(p => (
                      <Link key={p.id} href={`/campaign/pcs/${p.id}`} className="no-underline text-inherit block">
                        <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                          <span className="font-head text-lg text-grim-ember-2 tracking-wide">{p.name}</span>
                          <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{p.class || "PC"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })()}
            {linkedRecaps.length === 0 && linkedQuests.length === 0 && !deity.lore && !deity.tenets && (deity.follower_npcs ?? []).length === 0 && (deity.follower_pcs ?? []).length === 0 ? (
              <section className="grim-tome border border-dashed border-grim-line-2 text-center py-7 px-6 text-grim-ink-4">
                <div className="font-display text-4xl text-grim-ink-3">~ unrecorded ~</div>
                <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">No record yet in the codex</div>
              </section>
            ) : (linkedRecaps.length > 0 || linkedQuests.length > 0) ? (
              <>
                {linkedRecaps.length > 0 && (
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Session Appearances</h3>
                      <span className="grim-tome-sub">{linkedRecaps.length} recap{linkedRecaps.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grim-stack gap-2">
                      {linkedRecaps.map(r => (
                        <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`} className="no-underline text-inherit block">
                          <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                            <span className="font-head text-lg text-grim-ink tracking-wide">{r.title}</span>
                            <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{r.date}</span>
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
                    <div className="grim-stack gap-2">
                      {linkedQuests.map(q => (
                        <Link key={q.id} href={`/campaign/quests/${q.id}`} className="no-underline text-inherit block">
                          <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                            <span className="font-head text-lg text-grim-ink tracking-wide">{q.name}</span>
                            <span className="grim-chip text-xs">{q.status}</span>
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
          <div className="grim-stack gap-5.5">
            {deity.church && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Church</h3>
                  <span className="grim-tome-sub">clergy &amp; organisation</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.church, isAdmin) }} />
              </section>
            )}
            {deity.garments && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Garments</h3>
                  <span className="grim-tome-sub">vestments &amp; regalia</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.garments, isAdmin) }} />
              </section>
            )}
            {(isDM || isAdmin) && (
              dmMode ? (
                deity.gm_notes ? (
                  <section className="grim-tome border border-grim-arcane" style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head border-grim-arcane/30">
                      <h3 className="grim-tome-title text-grim-arcane">★ Master&apos;s Compendium</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink font-body text-lg" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(deity.gm_notes, true) }} />
                  </section>
                ) : isAdmin ? (
                  <section className="grim-tome border border-dashed border-grim-arcane/50 text-center py-5.5 px-5 text-grim-ink-4">
                    <div className="font-display text-3xl text-grim-arcane/60">~ no compendium notes ~</div>
                    <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Edit to add DM notes</div>
                  </section>
                ) : null
              ) : (
                <section className="grim-tome border border-dashed border-grim-line-2 text-center py-5.5 px-5 text-grim-ink-4">
                  <div className="font-display text-3xl text-grim-ink-3">~ sealed ~</div>
                  <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Master&apos;s compendium hidden</div>
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
                linkEntities={linkEntities}
              />
            </section>
          </div>
        </div>
      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
