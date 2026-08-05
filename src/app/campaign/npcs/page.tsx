"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { NPC, Faction, PC } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import UserNotesEditor from "@/components/UserNotesEditor";
import { renderMarkdown } from "@/utils/markdown";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc, sanitizeOptionalText } from "@/utils/sanitize";
import { statusChipClass } from "@/utils/chipClass";

const PAGE_SIZE = 24;

export default function NPCsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
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
      (statusFilter === "hidden" && npc.hidden) ||
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

  const totalPages = Math.max(1, Math.ceil(sortedNPCs.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedNPCs = sortedNPCs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const aliveCount = visibleNPCs.filter((n) => (n.status || "").toLowerCase() === "alive").length;
  const unknownCount = visibleNPCs.filter((n) => (n.status || "").toLowerCase() === "unknown").length;
  const deceasedCount = visibleNPCs.filter((n) => {
    const s = (n.status || "").toLowerCase();
    return s === "deceased" || s === "dead";
  }).length;
  const hiddenCount = visibleNPCs.filter((n) => n.hidden).length;

  const FILTERS = [
    { id: "all", label: "All Souls", count: visibleNPCs.length },
    { id: "alive", label: "Alive", count: aliveCount },
    { id: "unknown", label: "Unknown", count: unknownCount },
    { id: "deceased", label: "Departed", count: deceasedCount },
    ...((isAdmin || isDM) ? [{ id: "hidden", label: "Hidden", count: hiddenCount }] : []),
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
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowAddForm(false); setEditingNPC({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 w-full overflow-y-auto m-4 p-8"
            style={{ maxWidth: 640, maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Inscribe New Soul
            </h2>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddNPC(editingNPC); }}
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
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingNPC({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Inscribe Soul</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NPC LIST */}
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

        {/* Page header */}
        <div className="flex justify-between items-end mb-5.5">
          <div>
            <div className="grim-page-eyebrow">Volume the Second</div>
            <h1 className="grim-page-title">The Bestiary of Souls</h1>
            <p className="grim-page-sub">{visibleNPCs.length} souls; every face the party has dared remember.</p>
          </div>
          {isAdmin && (
            <div className="grim-row gap-2">
              <button className="grim-btn is-ember" onClick={startAdding}>+ Inscribe New</button>
            </div>
          )}
        </div>

        {/* Search + status filters */}
        <section className="flex gap-3 items-stretch mb-5.5">
          <div className="relative flex-1 min-w-70">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Seek a name, a face, a deed…"
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
            />
            <span
              className="absolute left-3.5 text-grim-gold-2 text-2xl"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >✦</span>
          </div>
          <div className="flex gap-1 p-1 bg-grim-bg-3 border border-grim-line overflow-hidden">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`grim-btn ${statusFilter === f.id ? "is-ember" : "is-ghost"} py-1.5 px-3 border ${statusFilter === f.id ? "border-grim-ember" : "border-transparent"} ${statusFilter === f.id ? "" : "bg-transparent"}`}
              >
                {f.label}
                <span className="grim-mono text-sm opacity-70 ml-0.5">{f.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Card grid */}
        <section>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="grim-h-section">Of those who walk the Bounty</h2>
            <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
              sorted alphabetical · {sortedNPCs.length} of {visibleNPCs.length}
            </div>
          </div>

          {sortedNPCs.length === 0 ? (
            <div className="text-center py-12 px-6 text-grim-ink-4">
              <div className="font-display text-5xl text-grim-ink-3">~ no souls found ~</div>
              <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">
                Adjust thy search or filters
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {pagedNPCs.map((npc) => (
                <div
                  key={npc.id}
                  onClick={() => router.push(`/campaign/npcs/${npc.id}`)}
                  className="grim-tome p-0 overflow-hidden cursor-pointer grid border border-grim-line"
                  style={{ gridTemplateColumns: "38% 1fr", transition: "transform 0.15s ease, border-color 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
                >
                  {/* Portrait */}
                  <div className="relative aspect-square">
                    {hasValidImage(npc.image) ? (
                      <Image
                        src={safeImageSrc(npc.image)!}
                        alt={displayName(npc) || ""}
                        fill
                        className="object-cover object-top"
                        style={{ filter: npc.status?.toLowerCase() === "deceased" ? "grayscale(0.7)" : "none" }}
                      />
                    ) : (
                      <div className="grim-img-slot is-portrait w-full h-full" />
                    )}
                    <div className="absolute top-1.75 left-1.75 flex flex-col gap-0.75">
                      <span className={`${statusChipClass(npc.status)} text-xs py-0.5 px-1.5`}>{npc.status || "Unknown"}</span>
                      {npc.hidden && (isDM || isAdmin) && (
                        <span className="grim-chip text-xs py-0.5 px-1.5 text-grim-arcane border border-grim-arcane" style={{ background: "oklch(0.25 0.06 285 / 0.85)" }}>hidden</span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="pt-2.5 px-3 pb-3 flex flex-col justify-start">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <div className="font-display text-2xl text-grim-gold leading-none tracking-normal truncate">
                        {displayName(npc) || "Unknown"}
                      </div>
                      {isNameHidden(npc) && (isDM || isAdmin) && (
                        <span className="grim-chip text-xs py-0.5 px-1.5 shrink-0 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden</span>
                      )}
                    </div>
                    {npc.pronunciation && !isNameHidden(npc) && (
                      <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 mt-0.5">
                        ({npc.pronunciation})
                      </div>
                    )}
                    <div className="grim-mono text-xs text-grim-ink-3 tracking-wider-3 uppercase mt-0.75 truncate">
                      {npc.race}{npc.gender ? ` · ${npc.gender}` : ""}
                    </div>
                    {npc.location && (
                      <div className="grim-mono text-xs text-grim-ink-4 tracking-widest mt-0.5 truncate">
                        ⌖ {npc.location}
                      </div>
                    )}
                    {npc.description && (
                      <div
                        className="grim-card-md is-quoted text-base text-grim-ink-2 mt-1.75 line-clamp-3"
                        style={{ lineHeight: 1.4 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(npc.description) }}
                      />
                    )}
                    {npc.factions && npc.factions.length > 0 && (
                      <div className="mt-auto pt-1.75 border-t border-dashed border-grim-line">
                        <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 uppercase truncate">
                          ⚑ {getFactionName(npc.factions[0])}
                        </div>
                      </div>
                    )}
                    {(isDM || isAdmin) && npc.roleplaying_notes && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-grim-arcane/25">
                        <div
                          className="grim-card-md text-sm line-clamp-2"
                          style={{ color: "oklch(0.70 0.12 285)", lineHeight: 1.4 }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(npc.roleplaying_notes) }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2.5 mt-5.5">
              <button
                className={`grim-btn is-ghost ${page === 1 ? "opacity-40 cursor-default" : "opacity-100 cursor-pointer"}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹ Prev
              </button>
              <span className="grim-mono text-sm tracking-wider-3 text-grim-ink-3 uppercase">
                Page {page} of {totalPages}
              </span>
              <button
                className={`grim-btn is-ghost ${page === totalPages ? "opacity-40 cursor-default" : "opacity-100 cursor-pointer"}`}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next ›
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
