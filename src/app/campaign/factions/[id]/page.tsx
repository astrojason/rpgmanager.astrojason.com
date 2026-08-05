"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useIsDM } from "@/utils/role";
import { useIsAdmin } from "@/utils/adminCheck";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Faction, NPC, PC, UserNote } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import UserNotesEditor from "@/components/UserNotesEditor";
import Link from "next/link";

const FACTION_CRESTS: Record<string, string> = {
  "Ship Crew": "☾",
  "Criminal Organization": "⚔",
  "Political Organization": "✶",
  "City Watch": "✠",
  "Spy Network": "◈",
  "Adventuring Guild": "⚡",
  "City Guard": "⚓",
  "Druid Circle": "❧",
  "Guild": "⚙",
};

function getFactionCrest(type: string): string {
  return FACTION_CRESTS[type] || "⚑";
}

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "grim-chip is-alive";
  if (s === "destroyed" || s === "disbanded" || s === "dead") return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

export default function FactionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();
  const isDM = useIsDM();

  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  const isAdmin = useIsAdmin();
  const userId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: allFactions = [], isPending: loading } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: async () => { const r = await authFetch("/api/data/factions"); if (!r.ok) throw new Error("Failed to load factions"); return r.json(); },
  });
  const { data: allNpcs = [] } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => { const r = await authFetch("/api/data/npcs"); if (!r.ok) throw new Error("Failed to load NPCs"); return r.json(); },
  });
  const { data: allPcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });
  const { data: allRecaps = [] } = useQuery<{ id?: string; title: string; date: string; tagged_factions?: string[] }[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });
  const { data: allQuests = [] } = useQuery<{ id: string; name: string; status: string; tagged_factions?: string[] }[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => { const r = await authFetch("/api/data/quests"); if (!r.ok) throw new Error("Failed to load quests"); return r.json(); },
  });

  const faction = useMemo(() => allFactions.find(f => String(f.id) === id) ?? null, [allFactions, id]);
  const notFound = !loading && !faction;
  const members = useMemo(() => {
    if (!faction) return [];
    const m = allNpcs.filter(n => n.factions?.includes(faction.id) && (!n.hidden || isAdmin || isDM));
    m.sort((a, b) => ((a.name || a.aka || "") < (b.name || b.aka || "") ? -1 : 1));
    return m;
  }, [allNpcs, faction, isAdmin, isDM]);
  const pcs = useMemo(() => faction ? allPcs.filter(p => p.factions?.includes(faction.id)) : [], [allPcs, faction]);
  const recaps = useMemo(() => faction
    ? allRecaps.filter(r => (r.tagged_factions ?? []).includes(faction.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [], [allRecaps, faction]);
  const quests = useMemo(() => faction ? allQuests.filter(q => (q.tagged_factions ?? []).includes(faction.id)) : [], [allQuests, faction]);

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!faction) return;
    setError(null);
    try {
      const res = await authFetch("/api/data/factions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: faction.id, notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: ['/api/data/factions'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the dossier&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !faction) {
    return (
      <div className="py-9 px-14">
        <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/factions")}>
          ‹ The Banners
        </button>
        <div className="text-center py-15 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3 mb-2">~ banner not found ~</div>
        </div>
      </div>
    );
  }

  const factionImage = safeImageSrc(faction.image);
  const totalMembers = members.length + pcs.length;

  return (
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full">
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {showFullImage && factionImage && (
        <div
          className="fixed inset-0 flex items-center justify-center cursor-pointer bg-grim-backdrop/85"
          style={{ zIndex: 1000 }}
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
            <Image src={factionImage} alt={faction.name} width={1200} height={800} className="object-contain" style={{ maxWidth: "90vw", maxHeight: "90vh" }} />
          </div>
        </div>
      )}

      <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/factions")}>
        ‹ The Banners
      </button>

      {/* Heraldic banner */}
      <section className="grim-tome is-bordered p-0 overflow-hidden mb-6">
        {factionImage ? (
          <div className="relative h-55">
            <Image src={factionImage} alt={faction.name} fill className="object-cover object-top" priority />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 290 / 0.88) 0%, oklch(0.16 0.05 285 / 0.78) 55%, oklch(0.20 0.08 40 / 0.82) 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)" }} />
            <button className="grim-btn is-ghost absolute top-2.5 right-2.5 z-10 text-lg py-1 px-2.5"
              onClick={() => setShowFullImage(true)} aria-label="View full image">⊙</button>
            <div className="absolute inset-0 py-7 px-8 flex items-center gap-6">
              <HeraldCrest type={faction.type} />
              <BannerText faction={faction} totalMembers={totalMembers} />
            </div>
          </div>
        ) : (
          <div className="relative py-7 px-8" style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.16 0.05 285) 55%, oklch(0.20 0.08 40) 100%)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)" }} />
            <div className="flex items-center gap-6 relative">
              <HeraldCrest type={faction.type} />
              <BannerText faction={faction} totalMembers={totalMembers} />
            </div>
          </div>
        )}
      </section>

      {/* Two-column dossier */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Charter</h3>
          </div>
          <div className="grim-stack gap-2.5 text-lg">
            {(
              [
                ["Type", faction.type],
                ["Seat", faction.location],
                ["Status", faction.status],
                ["Known Members", String(totalMembers)],
              ] as [string, string][]
            ).map(([k, v], i) => (
              <div key={i} className={`flex justify-between gap-3 pb-2 ${i < 3 ? "border-b border-dotted border-grim-line" : ""}`}>
                <span className="grim-mono text-sm tracking-wider-3 text-grim-ink-4 uppercase">{k}</span>
                <span className="font-head text-lg text-grim-ink text-right">{v || "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Aims &amp; Ambitions</h3>
          </div>
          <div className="grim-flavor text-lg text-grim-ink-2 mb-3.5" style={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.goals || "", true) }} />
          {faction.background && (
            <>
              <div className="grim-label mb-1.5">Background</div>
              <div className="text-lg text-grim-ink-2" style={{ lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.background, true) }} />
            </>
          )}
          {!faction.background && faction.description && (
            <>
              <div className="grim-label mb-1.5">Description</div>
              <div className="text-lg text-grim-ink-2" style={{ lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.description, true) }} />
            </>
          )}
        </section>
      </div>

      {/* GM Notes */}
      {isDM && faction.gm_notes && (
        <section className="grim-tome mb-6 border-grim-arcane">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title text-grim-arcane">GM&apos;s Compendium</h3>
          </div>
          <div className="text-lg text-grim-ink-2" style={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.gm_notes, true) }} />
        </section>
      )}

      {/* NPC Members */}
      {members.length > 0 && (
        <section className="grim-tome mb-6">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Souls of the Banner</h3>
            <span className="grim-tome-sub">{members.length} known</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {members.map((npc, i) => (
              <MemberCard
                key={i}
                image={npc.image}
                name={!npc.name || npc.nameHidden || npc.hide_name ? (npc.display_name || npc.aka ? `"${npc.display_name || npc.aka}"` : "Unknown") : npc.name}
                sub={[npc.description, npc.gender, npc.location].filter(Boolean).join(" · ")}
                deceased={npc.status === "Deceased"}
                href={`/campaign/npcs/${npc.id}`}
                hidden={npc.hidden && (isAdmin || isDM)}
                nameHidden={Boolean(npc.nameHidden || npc.hide_name) && (isAdmin || isDM)}
              />
            ))}
          </div>
        </section>
      )}

      {/* PC Members */}
      {pcs.length > 0 && (
        <section className="grim-tome mb-6">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Player Characters</h3>
            <span className="grim-tome-sub">{pcs.length} known</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pcs.map((pc, i) => (
              <MemberCard
                key={i}
                image={pc.image}
                name={pc.name + (pc.nickname ? ` "${pc.nickname}"` : "")}
                sub={[pc.race, pc.class, pc.hometown].filter(Boolean).join(" · ")}
                href={`/campaign/pcs/${pc.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Relationships */}
      {faction.relationships && faction.relationships.length > 0 && (
        <section className="grim-tome mb-6">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Alliances &amp; Enmities</h3>
            <span className="grim-tome-sub">{faction.relationships.length} recorded</span>
          </div>
          <div className="grim-stack gap-2.5">
            {faction.relationships.map((rel, i) => (
              <div key={i} className={`flex justify-between items-start gap-4 pb-2.5 ${i < faction.relationships!.length - 1 ? "border-b border-dotted border-grim-line" : ""}`}>
                <div className="min-w-0">
                  <div className="font-head text-lg text-grim-ink mb-1">{rel.faction}</div>
                  {rel.description && <div className="text-lg text-grim-ink-3 leading-normal">{rel.description}</div>}
                </div>
                <span className={`grim-chip ${rel.status === "Allied" ? "is-alive" : rel.status === "Hostile" ? "is-dead" : "is-unknown"} shrink-0`}>
                  {rel.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Party Notes */}
      <section className="grim-tome mb-6">
        <div className="grim-tome-head">
          <h3 className="grim-tome-title">Party Notes</h3>
          <span className="grim-tome-sub">field observations</span>
        </div>
        <UserNotesEditor
          notes={faction.notes || []}
          onChange={handleUpdateNotes}
          currentUser={userId}
          isAdmin={isAdmin}
        />
      </section>

      {/* Appearances */}
      {(recaps.length > 0 || quests.length > 0) && (
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Appearances</h3>
            <span className="grim-tome-sub">sessions &amp; quests</span>
          </div>
          <div className="grim-stack gap-2">
            {recaps.map(r => (
              <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`} className="no-underline">
                <div className="flex gap-2.5 items-baseline">
                  <span className="grim-mono text-xs tracking-wider-2 text-grim-ember-2 shrink-0">SESSION</span>
                  <span className="font-head text-lg text-grim-ink tracking-wide">{r.title}</span>
                  <span className="grim-mono text-xs text-grim-ink-4 ml-auto">{r.date}</span>
                </div>
              </Link>
            ))}
            {quests.map(q => (
              <Link key={q.id} href={`/campaign/quests/${q.id}`} className="no-underline">
                <div className="flex gap-2.5 items-baseline">
                  <span className="grim-mono text-xs tracking-wider-2 text-grim-gold shrink-0">QUEST</span>
                  <span className="font-head text-lg text-grim-ink tracking-wide">{q.name}</span>
                  <span className="grim-chip text-xs ml-auto">{q.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HeraldCrest({ type }: { type: string }) {
  return (
    <div className="w-20 h-24 shrink-0 flex items-center justify-center font-display text-5xl text-grim-gold border border-grim-gold-2" style={{
      background: "linear-gradient(180deg, oklch(0.28 0.08 40), oklch(0.18 0.05 35))",
      clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
      boxShadow: "inset 0 1px 0 oklch(0.8 0.1 80 / 0.2)",
    }}>
      {getFactionCrest(type)}
    </div>
  );
}

function BannerText({ faction, totalMembers }: { faction: Faction; totalMembers: number }) {
  return (
    <div>
      <div className="grim-mono text-sm tracking-widest-5 text-grim-gold-2 uppercase">{faction.type}</div>
      <h1 className="font-display text-7xl text-grim-gold mt-0.5 mx-0 mb-1" style={{ lineHeight: 0.9, textShadow: "0 0 32px oklch(0 0 0 / 0.4)" }}>
        {faction.name}
      </h1>
      <div className="font-body text-lg text-grim-ink-3 mb-2">({faction.pronunciation})</div>
      <div className="grim-row gap-2 flex-wrap">
        <span className={`grim-chip ${faction.status === "Active" ? "is-alive" : "is-dead"}`}>{faction.status}</span>
        {totalMembers > 0 && <span className="grim-chip is-faction">{totalMembers} known members</span>}
        <span className="grim-chip">{faction.location}</span>
      </div>
    </div>
  );
}

function MemberCard({ image, name, sub, deceased, href, hidden, nameHidden }: { image?: string; name: string; sub: string; deceased?: boolean; href: string; hidden?: boolean; nameHidden?: boolean }) {
  return (
    <Link href={href} className="no-underline">
      <div
        className="flex gap-3 items-center py-3 px-3.5 border border-grim-line bg-grim-bg-overlay/60 cursor-pointer transition-colors duration-150"
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--grim-gold-2)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--grim-line)")}
      >
        <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden relative border border-grim-line-2">
          {image ? (
            <Image src={image} alt={name} fill className="object-cover object-top" style={{ filter: deceased ? "grayscale(0.8)" : "none" }} />
          ) : (
            <div className="grim-img-slot is-portrait w-full h-full rounded-full" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`font-head text-lg tracking-wide whitespace-nowrap overflow-hidden text-ellipsis ${deceased ? "text-grim-ink-3 line-through" : "text-grim-ink no-underline"}`}>
              {name}
            </div>
            {hidden && <span className="grim-chip is-blood text-xs py-0 px-1.5 shrink-0">hidden</span>}
            {nameHidden && <span className="grim-chip text-xs py-0 px-1.5 shrink-0 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden</span>}
          </div>
          <div className="grim-mono text-sm tracking-widest text-grim-ink-3 uppercase mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}
