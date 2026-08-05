"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { NPC, Faction, Deity, UserNote, SessionRecap, PC, Item, Location } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks, AutoLinkEntity } from "@/utils/markdown";
import UserNotesEditor from "@/components/UserNotesEditor";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc, sanitizeOptionalText } from "@/utils/sanitize";
import Link from "next/link";
import { statusChipClass } from "@/utils/chipClass";

export default function NPCDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingNPC, setEditingNPC] = useState<Partial<NPC>>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [dmMode, setDmMode] = useState(false);
  const [linkedNpcSearch, setLinkedNpcSearch] = useState("");

  const userId = useEffectiveUserId();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: allNpcs = [], isPending: loading } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => { const r = await authFetch("/api/data/npcs"); if (!r.ok) throw new Error("Failed to load NPCs"); return r.json(); },
  });
  const { data: factionData = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: async () => { const r = await authFetch("/api/data/factions"); if (!r.ok) throw new Error("Failed to load factions"); return r.json(); },
  });
  const { data: allRecaps = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });
  const { data: allDeities = [] } = useQuery<Deity[]>({
    queryKey: ['/api/data/deities'],
    queryFn: async () => { const r = await authFetch("/api/data/deities"); if (!r.ok) throw new Error("Failed to load deities"); return r.json(); },
  });
  const { data: pcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/data/locations'],
    queryFn: async () => { const r = await authFetch("/api/data/locations"); if (!r.ok) throw new Error("Failed to load locations"); return r.json(); },
  });
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['/api/data/items'],
    queryFn: async () => { const r = await authFetch("/api/data/items"); if (!r.ok) throw new Error("Failed to load items"); return r.json(); },
  });

  const npc = useMemo(() => allNpcs.find((n: NPC) => String(n.id) === id) ?? null, [allNpcs, id]);
  const notFound = !loading && !npc;
  const appearances = useMemo(() =>
    allRecaps.filter(r => (r.tagged_npcs ?? []).includes(id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allRecaps, id]
  );
  const deities = useMemo(() => allDeities.filter(d => (d.follower_npcs ?? []).includes(id) && (!d.hidden || dmMode)), [allDeities, id, dmMode]);

  useEffect(() => { setDmMode(isDM || isAdmin); }, [isDM, isAdmin]);

  const cleanText = (value?: string | null) => sanitizeOptionalText(value) ?? "";
  const isNameHidden = (n: NPC) => Boolean(n.nameHidden || n.hide_name);
  const displayName = (n: NPC) => {
    const showRealName = !isNameHidden(n) || dmMode;
    return showRealName
      ? cleanText(n.name) || cleanText(n.aka)
      : cleanText(n.display_name) || cleanText(n.aka);
  };
  const hasValidImage = (src?: string | null) => Boolean(safeImageSrc(src));

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const handleSaveNPC = async (data: Partial<NPC>) => {
    setIsSaving(true);
    setError("");
    try {
      const response = await authFetch("/api/data/npcs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${response.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/data/npcs'] });
      setShowEditForm(false);
      setEditingNPC({});
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNPC = () => {
    if (!npc) return;
    setConfirmState({
      message: "Are you sure you want to delete this NPC?",
      onConfirm: async () => {
        setConfirmState(null);
        setError("");
        try {
          const response = await authFetch(`/api/data/npcs?id=${npc.id}`, { method: "DELETE" });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error ?? `Server error ${response.status}`);
          }
          router.push("/campaign/npcs");
        } catch (e) {
          setError(toErrorMessage(e));
        }
      },
    });
  };

  const handleUpdateNPCNotes = async (updatedNotes: UserNote[]) => {
    if (!npc) return;
    setError("");
    try {
      const response = await authFetch("/api/data/npcs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: npc.id, notes: updatedNotes }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${response.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/data/npcs'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const startEditing = () => {
    if (!npc) return;
    setEditingNPC(npc);
    setShowEditForm(true);
  };

  if (loading) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !npc) {
    return (
      <div className="pt-9 px-14 pb-20">
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/npcs")}>‹ Back to the Codex</button>
        <div className="mt-8 text-center text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3">~ soul not found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">No record of this soul in the codex</div>
        </div>
      </div>
    );
  }

  const selectedNpcImage = safeImageSrc(npc.image);

  const autoLinkEntities: AutoLinkEntity[] = [
    ...allNpcs.filter(n => String(n.id) !== id).map(n => ({ id: String(n.id), name: n.name || n.aka || "", aliases: n.aka ? [n.aka] : [], url: `/campaign/npcs/${n.id}`, type: 'npc' as const })),
    ...factionData.map(f => ({ id: String(f.id), name: f.name, url: `/campaign/factions/${f.id}`, type: 'faction' as const })),
    ...pcs.map(p => ({ id: String(p.id), name: p.name, url: `/campaign/pcs/${p.id}`, type: 'pc' as const })),
    ...allDeities.map(d => ({ id: String(d.id), name: d.name, url: `/campaign/deities/${d.id}`, type: 'deity' as const })),
    ...locations.map(l => ({ id: String(l.id), name: l.name, url: `/campaign/locations/${l.id}`, type: 'location' as const })),
    ...items.map(it => ({ id: String(it.id), name: it.name, url: `/campaign/items/${it.id}`, type: 'item' as const })),
  ].filter(e => e.name);

  const linkEntities = [
    ...pcs.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
    ...factionData.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
    ...allDeities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` })),
  ];

  return (
    <>
      {/* Admin edit modal */}
      {showEditForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowEditForm(false); setEditingNPC({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 max-w-160 w-full overflow-y-auto m-4 p-8"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Edit Dossier
            </h2>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSaveNPC(editingNPC); }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Name", field: "name" as keyof NPC },
                  { label: "AKA / Alias", field: "aka" as keyof NPC },
                  { label: "Pronunciation", field: "pronunciation" as keyof NPC },
                  { label: "Race", field: "race" as keyof NPC },
                  { label: "Location", field: "location" as keyof NPC },
                  { label: "Display Name (when name hidden)", field: "display_name" as keyof NPC },
                  { label: "Image URL", field: "image" as keyof NPC },
                ].map(({ label, field }) => (
                  <div key={field} className={field === "image" || field === "display_name" ? "col-span-full" : ""}>
                    <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(editingNPC[field] as string) || ""}
                      onChange={(e) => setEditingNPC({ ...editingNPC, [field]: e.target.value })}
                      className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Gender</label>
                  <select
                    value={editingNPC.gender || ""}
                    onChange={(e) => setEditingNPC({ ...editingNPC, gender: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Status</label>
                  <select
                    value={editingNPC.status || "Alive"}
                    onChange={(e) => setEditingNPC({ ...editingNPC, status: e.target.value as "Alive" | "Deceased" | "Unknown" })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="Alive">Alive</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Description</label>
                <MarkdownEditor value={editingNPC.description || ""} onChange={(v) => setEditingNPC({ ...editingNPC, description: v })} rows={4} label="Description" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Background</label>
                <MarkdownEditor value={editingNPC.background || ""} onChange={(v) => setEditingNPC({ ...editingNPC, background: v })} rows={5} label="Background" linkEntities={linkEntities} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Roleplaying Notes</label>
                <MarkdownEditor value={editingNPC.roleplaying_notes || ""} onChange={(v) => setEditingNPC({ ...editingNPC, roleplaying_notes: v })} rows={4} label="Roleplaying Notes" linkEntities={linkEntities} />
              </div>
              <div>
                <UserNotesEditor notes={editingNPC.notes || []} onChange={(notes) => setEditingNPC({ ...editingNPC, notes })} currentUser={userId} isAdmin={isAdmin} className="mt-2" linkEntities={linkEntities} />
              </div>
              <div className="flex gap-5">
                {[
                  { label: "Hidden from players", field: "hidden" as keyof NPC },
                  { label: "Name hidden", field: "nameHidden" as keyof NPC },
                ].map(({ label, field }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer font-head text-lg text-grim-ink-2 tracking-wider">
                    <input
                      type="checkbox"
                      checked={Boolean(editingNPC[field])}
                      onChange={(e) => setEditingNPC({ ...editingNPC, [field]: e.target.checked })}
                      className="accent-grim-ember"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Linked NPCs</label>
                <input
                  type="text"
                  placeholder="Filter souls…"
                  value={linkedNpcSearch}
                  onChange={(e) => setLinkedNpcSearch(e.target.value)}
                  className="w-full bg-grim-bg-3 border border-grim-line-2 border-b-0 text-grim-ink font-body text-lg py-1.5 px-2.5 outline-none"
                />
                <div className="max-h-40 overflow-y-auto border border-grim-line-2 py-1.5 px-2.5 bg-grim-bg-3">
                  {allNpcs
                    .filter(n => String(n.id) !== id)
                    .filter(n => {
                      const term = linkedNpcSearch.toLowerCase();
                      if (!term) return true;
                      const label = (n.name || n.aka || n.display_name || "").toLowerCase();
                      return label.includes(term);
                    })
                    .sort((a, b) => {
                      const la = (a.name || a.aka || a.display_name || "").toLowerCase();
                      const lb = (b.name || b.aka || b.display_name || "").toLowerCase();
                      return la.localeCompare(lb);
                    })
                    .map(n => {
                      const label = n.name || n.aka || n.display_name || `#${n.id}`;
                      return (
                        <label key={n.id} className="flex items-center gap-2 py-0.75 px-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(editingNPC.linked_npcs ?? []).includes(String(n.id))}
                            onChange={(e) => {
                              const current = editingNPC.linked_npcs ?? [];
                              const nid = String(n.id);
                              setEditingNPC({ ...editingNPC, linked_npcs: e.target.checked ? [...current, nid] : current.filter(x => x !== nid) });
                            }}
                            className="accent-grim-ember"
                          />
                          <span className="font-body text-lg text-grim-ink-2">{label}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
              {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowEditForm(false); setEditingNPC({}); setError(""); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                  {isSaving ? <><span className="grim-flame w-2 h-2" /> Saving…</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full image modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 bg-grim-backdrop/85 ${showFullImage ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setShowFullImage(false)}
      >
        <div
          className={`relative max-w-3xl w-full transform transition-transform duration-300 ${showFullImage ? "scale-100" : "scale-90"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedNpcImage ? (
            <Image src={selectedNpcImage} alt={displayName(npc) || ""} width={900} height={600} className={`object-contain rounded shadow-2xl transition-all duration-300 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} />
          ) : (
            <div className={`w-full h-150 grim-img-slot is-portrait flex items-center justify-center text-5xl transition-all duration-300 text-grim-ink-4 ${showFullImage ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>?</div>
          )}
          <button className="grim-btn is-ghost absolute top-2 right-2" onClick={() => setShowFullImage(false)}>Close</button>
        </div>
      </div>

      {/* NPC DETAIL */}
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

        {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-7">
          <div className="grim-row gap-4.5">
            <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/npcs")}>
              ‹ Back to the Codex
            </button>
            <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2">
              codex / npcs / {displayName(npc).toLowerCase()}
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
                <button className="grim-btn is-blood" onClick={handleDeleteNPC}>Strike</button>
              </>
            )}
          </div>
        </div>

        {/* Hero — portrait + name + stats */}
        <section className="grid gap-7 mb-7" style={{ gridTemplateColumns: "280px 1fr" }}>
          {/* Portrait */}
          <div className="relative shrink-0">
            {hasValidImage(npc.image) ? (
              <div
                className="w-70 h-90 relative border border-grim-gold-2 cursor-pointer"
                onClick={() => setShowFullImage(true)}
              >
                <Image
                  src={safeImageSrc(npc.image)!}
                  alt={displayName(npc) || ""}
                  fill
                  className="object-cover object-top"
                  style={{ filter: npc.status?.toLowerCase() === "deceased" ? "grayscale(0.6)" : "none" }}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 70%, oklch(0.10 0.025 290 / 0.5))" }} />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 py-1 px-2 border border-grim-gold-2 flex justify-between" style={{ background: "oklch(0.10 0.02 290 / 0.75)" }}>
                  <span className="grim-mono text-xs tracking-widest-2 text-grim-gold uppercase">portrait · click to enlarge</span>
                  <span className="grim-mono text-sm text-grim-ink-3">↗</span>
                </div>
              </div>
            ) : (
              <div className="grim-img-slot is-portrait w-70 h-90 border border-grim-gold-2">
                <div>
                  <div className="font-display text-5xl text-grim-ink-4">?</div>
                  <div className="mt-2 text-sm tracking-widest-2 uppercase text-grim-ink-4">no likeness on file</div>
                </div>
              </div>
            )}
            <div className="absolute -top-2.5 -left-2.5" style={{ transform: "rotate(-5deg)" }}>
              <div className="grim-seal w-12 h-12 text-2xl">✦</div>
            </div>
          </div>

          {/* Name + info */}
          <div className="flex flex-col justify-between pt-1">
            <div>
              <div className="grim-page-eyebrow">Dossier of an Encountered Soul</div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-8xl text-grim-gold mt-0.5 mx-0 mb-1 tracking-normal" style={{ lineHeight: 0.9, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.22)" }}>
                  {displayName(npc) || "Unknown"}
                </h1>
                {isNameHidden(npc) && dmMode && (
                  <span className="grim-chip text-sm shrink-0 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden from players</span>
                )}
              </div>
              {!isNameHidden(npc) && npc.pronunciation && (
                <div className="font-body text-grim-ink-2 text-2xl">
                  pronounced <b className="font-head tracking-widest">{npc.pronunciation}</b>
                </div>
              )}
              {npc.aka && !isNameHidden(npc) && (
                <div className="font-body italic text-grim-ink-3 text-xl mt-0.75">
                  known as &ldquo;{npc.aka}&rdquo;
                </div>
              )}
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className={statusChipClass(npc.status)}>{npc.status || "Unknown"}</span>
                {npc.race && <span className="grim-chip">{npc.race}{npc.gender ? ` · ${npc.gender}` : ""}</span>}
                {npc.factions && npc.factions.length > 0 && npc.factions.map((fid) => (
                  <button
                    key={fid}
                    className="grim-chip is-faction cursor-pointer border border-grim-gold-2/45"
                    onClick={() => router.push(`/campaign/factions/${fid}`)}
                  >
                    ⚑ {getFactionName(fid)}
                  </button>
                ))}
                {npc.location && <span className="grim-chip is-arcane">last seen · {npc.location}</span>}
              </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-3 mt-5.5 border-t border-b border-grim-line py-3 px-0">
              {[
                ["Race", npc.race || "—"],
                ["Gender", npc.gender || "—"],
                ["Location", npc.location || "—"],
              ].map(([k, v], i) => (
                <div key={k} className={i === 0 ? "pl-0" : "pl-4 border-l border-grim-line"}>
                  <div className="grim-label">{k}</div>
                  <div className="font-display text-2xl text-grim-gold mt-0.75" style={{ lineHeight: 1.15 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Description parchment block */}
        {npc.description && (
          <section className="grim-parchment mb-7">
            <div className="m-0 text-2xl text-grim-parchment-ink-2" style={{ lineHeight: 1.65 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.description, isAdmin, autoLinkEntities) }}
            />
          </section>
        )}

        {/* Two-column body */}
        <div className="grid gap-5.5" style={{ gridTemplateColumns: "1.05fr 0.95fr" }}>

          {/* Left column */}
          <div className="grim-stack gap-5.5">
            {npc.background && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Background</h3>
                  <span className="grim-tome-sub">history &amp; origin</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.background || "", isAdmin, autoLinkEntities) }} />
              </section>
            )}
            {(isDM || isAdmin) && npc.roleplaying_notes && (
              <section className="grim-tome border border-grim-arcane/35" style={{ background: "linear-gradient(180deg, oklch(0.16 0.04 285 / 0.4), oklch(0.13 0.03 290 / 0.25))" }}>
                <div className="grim-tome-head border-grim-arcane/25">
                  <h3 className="grim-tome-title text-grim-arcane">Roleplaying Notes</h3>
                  <span className="grim-tome-sub">dm-facing · hidden from players</span>
                </div>
                <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.roleplaying_notes || "", isAdmin, autoLinkEntities) }} />
              </section>
            )}
            {!npc.background && (!(isDM || isAdmin) || !npc.roleplaying_notes) && (
              <section className="grim-tome border border-dashed border-grim-line-2 text-center py-7 px-6 text-grim-ink-4">
                <div className="font-display text-4xl text-grim-ink-3">~ unwritten ~</div>
                <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">No further record in the codex</div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="grim-stack gap-5.5">
            {/* DM-only notes */}
            {(isDM || isAdmin) && (
              dmMode ? (
                npc.gm_notes ? (
                  <section className="grim-tome border border-grim-arcane" style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                    <div className="grim-tome-head border-grim-arcane/30">
                      <h3 className="grim-tome-title text-grim-arcane">★ Master&apos;s Marginalia</h3>
                      <span className="grim-tome-sub">hidden from the party</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none prose-sm text-grim-ink font-body text-lg" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(npc.gm_notes || "", true) }} />
                  </section>
                ) : isAdmin ? (
                  <section className="grim-tome border border-dashed border-grim-arcane/50 text-center py-5.5 px-5 text-grim-ink-4">
                    <div className="font-display text-3xl text-grim-arcane/60">~ no marginalia ~</div>
                    <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Edit to add DM notes</div>
                  </section>
                ) : null
              ) : (
                <section className="grim-tome border border-dashed border-grim-line-2 text-center py-5.5 px-5 text-grim-ink-4">
                  <div className="font-display text-3xl text-grim-ink-3">~ sealed ~</div>
                  <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Master&apos;s marginalia hidden</div>
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
                <div className="grim-stack gap-2">
                  {deities.map(d => (
                    <Link key={d.id} href={`/campaign/deities/${d.id}`} className="no-underline text-inherit block">
                      <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-head text-lg text-grim-gold tracking-wide">✦ {d.name}</span>
                          {d.hidden && dmMode && <span className="grim-chip is-blood text-xs py-0 px-1.5">hidden</span>}
                        </span>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{d.domain || "—"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Linked NPCs */}
            {(() => {
              const linkedNpcs = (npc.linked_npcs ?? [])
                .map(lid => allNpcs.find(n => String(n.id) === lid))
                .filter((n): n is NPC => n !== undefined && (!n.hidden || dmMode));
              return linkedNpcs.length > 0 ? (
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Connected Souls</h3>
                    <span className="grim-tome-sub">{linkedNpcs.length} {linkedNpcs.length === 1 ? "connection" : "connections"}</span>
                  </div>
                  <div className="grim-stack gap-2">
                    {linkedNpcs.map(linked => (
                      <Link key={linked.id} href={`/campaign/npcs/${linked.id}`} className="no-underline text-inherit block">
                        <div className="flex items-center gap-2.5 py-1.5 px-0 border-b border-dashed border-grim-line">
                          {hasValidImage(linked.image) && (
                            <Image src={safeImageSrc(linked.image)!} alt={displayName(linked)} width={28} height={36} className="object-cover object-top border border-grim-gold-2 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <div className="font-head text-lg text-grim-gold tracking-wide">{displayName(linked)}</div>
                              {linked.hidden && dmMode && <span className="grim-chip is-blood text-xs py-0 px-1.5">hidden</span>}
                              {isNameHidden(linked) && dmMode && <span className="grim-chip text-xs py-0 px-1.5 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden</span>}
                            </div>
                            {linked.race && <div className="grim-mono text-sm text-grim-ink-4 tracking-widest">{linked.race}</div>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {/* Session appearances */}
            {appearances.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Session Appearances</h3>
                  <span className="grim-tome-sub">{appearances.length} recap{appearances.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grim-stack gap-2">
                  {appearances.map((r) => (
                    <Link
                      key={r.id ?? r.date}
                      href={`/campaign/recaps/${r.id ?? r.date}`}
                      className="no-underline text-inherit block"
                    >
                      <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                        <span className="font-head text-lg text-grim-ink tracking-wide">{r.title}</span>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{r.date}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
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
