"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Faction, NPC, PC } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
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

  const [faction, setFaction] = useState<Faction | null>(null);
  const [members, setMembers] = useState<NPC[]>([]);
  const [pcs, setPcs] = useState<PC[]>([]);
  const [recaps, setRecaps] = useState<{ id?: string; title: string; date: string; tagged_factions?: string[] }[]>([]);
  const [quests, setQuests] = useState<{ id: string; name: string; status: string; tagged_factions?: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [factionsRes, npcsRes, pcsRes, recapsRes, questsRes] = await Promise.all([
          authFetch("/api/data/factions"),
          authFetch("/api/data/npcs"),
          authFetch("/api/data/pcs"),
          authFetch("/api/data/session-recaps"),
          authFetch("/api/data/quests"),
        ]);
        const allFactions: Faction[] = factionsRes.ok ? await factionsRes.json() : [];
        const found = allFactions.find(f => String(f.id) === id);
        if (!found) { setNotFound(true); return; }
        setFaction(found);

        const allNpcs: NPC[] = npcsRes.ok ? await npcsRes.json() : [];
        const allPcs: PC[] = pcsRes.ok ? await pcsRes.json() : [];
        const npcMembers = allNpcs.filter(n => n.factions?.includes(found.id));
        npcMembers.sort((a, b) => ((a.name || a.aka || "") < (b.name || b.aka || "") ? -1 : 1));
        setMembers(npcMembers);
        setPcs(allPcs.filter(p => p.factions?.includes(found.id)));

        const allRecaps: { id?: string; title: string; date: string; tagged_factions?: string[] }[] = recapsRes.ok ? await recapsRes.json() : [];
        setRecaps(allRecaps.filter(r => (r.tagged_factions ?? []).includes(found.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const allQuests: { id: string; name: string; status: string; tagged_factions?: string[] }[] = questsRes.ok ? await questsRes.json() : [];
        setQuests(allQuests.filter(q => (q.tagged_factions ?? []).includes(found.id)));
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [id]);

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the dossier&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !faction) {
    return (
      <div style={{ padding: "36px 56px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/factions")} style={{ marginBottom: 24 }}>
          ‹ The Banners
        </button>
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ banner not found ~</div>
        </div>
      </div>
    );
  }

  const factionImage = safeImageSrc(faction.image);
  const totalMembers = members.length + pcs.length;

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {showFullImage && factionImage && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          onClick={() => setShowFullImage(false)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <Image src={factionImage} alt={faction.name} width={1200} height={800} style={{ objectFit: "contain", maxWidth: "90vw", maxHeight: "90vh" }} />
          </div>
        </div>
      )}

      <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/factions")} style={{ marginBottom: 24 }}>
        ‹ The Banners
      </button>

      {/* Heraldic banner */}
      <section className="grim-tome is-bordered" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        {factionImage ? (
          <div style={{ position: "relative", height: 220 }}>
            <Image src={factionImage} alt={faction.name} fill style={{ objectFit: "cover", objectPosition: "center top" }} priority />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, oklch(0.22 0.06 290 / 0.88) 0%, oklch(0.16 0.05 285 / 0.78) 55%, oklch(0.20 0.08 40 / 0.82) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)", pointerEvents: "none" }} />
            <button className="grim-btn is-ghost" style={{ position: "absolute", top: 10, right: 10, zIndex: 10, fontSize: 14, padding: "4px 10px" }}
              onClick={() => setShowFullImage(true)} aria-label="View full image">⊙</button>
            <div style={{ position: "absolute", inset: 0, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24 }}>
              <HeraldCrest type={faction.type} />
              <BannerText faction={faction} totalMembers={totalMembers} />
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", padding: "28px 32px", background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.16 0.05 285) 55%, oklch(0.20 0.08 40) 100%)" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
              <HeraldCrest type={faction.type} />
              <BannerText faction={faction} totalMembers={totalMembers} />
            </div>
          </div>
        )}
      </section>

      {/* Two-column dossier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Charter</h3>
          </div>
          <div className="grim-stack" style={{ gap: 10, fontSize: 14 }}>
            {(
              [
                ["Type", faction.type],
                ["Seat", faction.location],
                ["Status", faction.status],
                ["Known Members", String(totalMembers)],
              ] as [string, string][]
            ).map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: i < 3 ? "1px dotted var(--grim-line)" : "none" }}>
                <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Aims &amp; Ambitions</h3>
          </div>
          <div className="grim-flavor" style={{ fontSize: 14, color: "var(--grim-ink-2)", marginBottom: 14, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.goals || "", true) }} />
          {faction.background && (
            <>
              <div className="grim-label" style={{ marginBottom: 6 }}>Background</div>
              <div style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.background, true) }} />
            </>
          )}
          {!faction.background && faction.description && (
            <>
              <div className="grim-label" style={{ marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.description, true) }} />
            </>
          )}
        </section>
      </div>

      {/* GM Notes */}
      {isDM && faction.gm_notes && (
        <section className="grim-tome" style={{ marginBottom: 24, borderColor: "var(--grim-arcane)" }}>
          <div className="grim-tome-head">
            <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>GM&apos;s Compendium</h3>
          </div>
          <div style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(faction.gm_notes, true) }} />
        </section>
      )}

      {/* NPC Members */}
      {members.length > 0 && (
        <section className="grim-tome" style={{ marginBottom: 24 }}>
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Souls of the Banner</h3>
            <span className="grim-tome-sub">{members.length} known</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {members.map((npc, i) => (
              <MemberCard
                key={i}
                image={npc.image}
                name={!npc.name || npc.nameHidden || npc.hide_name ? (npc.display_name || npc.aka ? `"${npc.display_name || npc.aka}"` : "Unknown") : npc.name}
                sub={[npc.description, npc.gender, npc.location].filter(Boolean).join(" · ")}
                deceased={npc.status === "Deceased"}
                href={`/campaign/npcs/${npc.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* PC Members */}
      {pcs.length > 0 && (
        <section className="grim-tome" style={{ marginBottom: 24 }}>
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Player Characters</h3>
            <span className="grim-tome-sub">{pcs.length} known</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
        <section className="grim-tome" style={{ marginBottom: 24 }}>
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Alliances &amp; Enmities</h3>
            <span className="grim-tome-sub">{faction.relationships.length} recorded</span>
          </div>
          <div className="grim-stack" style={{ gap: 10 }}>
            {faction.relationships.map((rel, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingBottom: 10, borderBottom: i < faction.relationships!.length - 1 ? "1px dotted var(--grim-line)" : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", marginBottom: 4 }}>{rel.faction}</div>
                  {rel.description && <div style={{ fontSize: 13, color: "var(--grim-ink-3)", lineHeight: 1.5 }}>{rel.description}</div>}
                </div>
                <span className={`grim-chip ${rel.status === "Allied" ? "is-alive" : rel.status === "Hostile" ? "is-dead" : "is-unknown"}`} style={{ flexShrink: 0 }}>
                  {rel.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Appearances */}
      {(recaps.length > 0 || quests.length > 0) && (
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Appearances</h3>
            <span className="grim-tome-sub">sessions &amp; quests</span>
          </div>
          <div className="grim-stack" style={{ gap: 8 }}>
            {recaps.map(r => (
              <Link key={r.id ?? r.date} href={`/campaign/recaps/${r.id ?? r.date}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-ember-2)", flexShrink: 0 }}>SESSION</span>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{r.title}</span>
                  <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", marginLeft: "auto" }}>{r.date}</span>
                </div>
              </Link>
            ))}
            {quests.map(q => (
              <Link key={q.id} href={`/campaign/quests/${q.id}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-gold)", flexShrink: 0 }}>QUEST</span>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{q.name}</span>
                  <span className="grim-chip" style={{ fontSize: 9, marginLeft: "auto" }}>{q.status}</span>
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
    <div style={{
      width: 80, height: 96, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-gold)",
      background: "linear-gradient(180deg, oklch(0.28 0.08 40), oklch(0.18 0.05 35))",
      border: "1px solid var(--grim-gold-2)",
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
      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".24em", color: "var(--grim-gold-2)", textTransform: "uppercase" }}>{faction.type}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-gold)", margin: "2px 0 4px", lineHeight: 0.9, textShadow: "0 0 32px oklch(0 0 0 / 0.4)" }}>
        {faction.name}
      </h1>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", marginBottom: 8 }}>({faction.pronunciation})</div>
      <div className="grim-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className={`grim-chip ${faction.status === "Active" ? "is-alive" : "is-dead"}`}>{faction.status}</span>
        {totalMembers > 0 && <span className="grim-chip is-faction">{totalMembers} known members</span>}
        <span className="grim-chip">{faction.location}</span>
      </div>
    </div>
  );
}

function MemberCard({ image, name, sub, deceased, href }: { image?: string; name: string; sub: string; deceased?: boolean; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex", gap: 12, alignItems: "center",
          padding: "12px 14px",
          border: "1px solid var(--grim-line)",
          background: "oklch(0.14 0.025 290 / 0.6)",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--grim-gold-2)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--grim-line)")}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden", position: "relative", border: "1px solid var(--grim-line-2)" }}>
          {image ? (
            <Image src={image} alt={name} fill style={{ objectFit: "cover", objectPosition: "center top", filter: deceased ? "grayscale(0.8)" : "none" }} />
          ) : (
            <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: deceased ? "var(--grim-ink-3)" : "var(--grim-ink)", letterSpacing: ".02em", textDecoration: deceased ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".10em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}
