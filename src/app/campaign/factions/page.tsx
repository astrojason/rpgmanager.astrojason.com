"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReferrerInfo, usePageTracking, getDefaultBackInfo } from "@/utils/referrerTracking";
import Image from "next/image";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Faction, NPC, PC } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
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

export default function FactionsPage() {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [factionMembers, setFactionMembers] = useState<NPC[]>([]);
  const [factionPCs, setFactionPCs] = useState<PC[]>([]);
  const [showFullImage, setShowFullImage] = useState(false);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [npcData, setNpcData] = useState<NPC[]>([]);
  const [pcsData, setPcsData] = useState<PC[]>([]);
  const [recapData, setRecapData] = useState<{ id?: string; title: string; date: string; tagged_factions?: string[] }[]>([]);
  const [questData, setQuestData] = useState<{ id: string; name: string; status: string; tagged_factions?: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerInfo = useReferrerInfo();
  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [factionsResponse, npcsResponse, pcsResponse, recapsResponse, questsResponse] = await Promise.all([
          authFetch("/api/data/factions"),
          authFetch("/api/data/npcs"),
          authFetch("/api/data/pcs"),
          authFetch("/api/data/session-recaps"),
          authFetch("/api/data/quests"),
        ]);
        if (factionsResponse.ok && npcsResponse.ok && pcsResponse.ok) {
          const factions = await factionsResponse.json();
          const npcs = await npcsResponse.json();
          const pcs = await pcsResponse.json();
          setFactionData(factions);
          setNpcData(npcs);
          setPcsData(pcs);
        }
        if (recapsResponse.ok) setRecapData(await recapsResponse.json());
        if (questsResponse.ok) setQuestData(await questsResponse.json());
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      const faction = factionData.find((f: Faction) => f.id === selected);
      if (faction) setSelectedFaction(faction);
    }
  }, [searchParams, factionData]);

  useEffect(() => {
    if (!selectedFaction) {
      setFactionMembers([]);
      setFactionPCs([]);
      return;
    }
    const members = npcData.filter((npc: NPC) => npc.factions?.includes(selectedFaction.id));
    members.sort((a, b) => {
      const la = (a.name || a.aka || a.id || "").toLowerCase();
      const lb = (b.name || b.aka || b.id || "").toLowerCase();
      return la.localeCompare(lb);
    });
    setFactionMembers(members);
    setFactionPCs(pcsData.filter((pc: PC) => pc.factions?.includes(selectedFaction.id)));
  }, [selectedFaction, npcData, pcsData]);

  const filteredFactions = factionData.filter((faction: Faction) => {
    const matchesSearch =
      faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.goals.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faction.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "" || faction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(factionData.map((f: Faction) => f.type))].sort();

  const backInfo = selectedFaction
    ? referrerInfo.label !== "Factions"
      ? referrerInfo
      : getDefaultBackInfo("factions")
    : getDefaultBackInfo("factions");

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Mustering the banners&hellip;
        </div>
      </div>
    );
  }

  const factionImage = safeImageSrc(selectedFaction?.image);
  const totalMembers = factionMembers.length + factionPCs.length;

  return (
    <>
      {/* Full image modal */}
      {showFullImage && factionImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.85)" }}
          onClick={() => setShowFullImage(false)}
        >
          <div
            style={{ position: "relative", maxWidth: 900, width: "100%", margin: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={factionImage}
              alt={selectedFaction?.name || ""}
              width={900}
              height={600}
              style={{ objectFit: "contain", width: "100%", height: "auto" }}
            />
            <button
              className="grim-btn is-ghost"
              style={{ position: "absolute", top: 8, right: 8 }}
              onClick={() => setShowFullImage(false)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Two-pane layout */}
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>

        {/* Left: detail column */}
        <div style={{ padding: "36px 36px 80px 56px", overflowY: "auto" }}>
          {selectedFaction ? (
            <>
              {/* Back button row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <button
                  className="grim-btn is-ghost"
                  onClick={() => {
                    if (referrerInfo.label !== "Factions") {
                      router.push(backInfo.url);
                    } else {
                      setSelectedFaction(null);
                    }
                  }}
                >
                  ‹ {referrerInfo.label !== "Factions" ? `Back to ${backInfo.label}` : "All Banners"}
                </button>
              </div>

              {/* Heraldic banner */}
              <section className="grim-tome is-bordered" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
                {factionImage ? (
                  <div style={{ position: "relative", height: 220 }}>
                    <Image
                      src={factionImage}
                      alt={selectedFaction.name}
                      fill
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                      priority
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, oklch(0.22 0.06 290 / 0.88) 0%, oklch(0.16 0.05 285 / 0.78) 55%, oklch(0.20 0.08 40 / 0.82) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)", pointerEvents: "none" }} />
                    <button
                      className="grim-btn is-ghost"
                      style={{ position: "absolute", top: 10, right: 10, zIndex: 10, fontSize: 14, padding: "4px 10px" }}
                      onClick={() => setShowFullImage(true)}
                      aria-label="View full image"
                    >
                      ⊙
                    </button>
                    <div style={{ position: "absolute", inset: 0, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                      <HeraldCrest type={selectedFaction.type} />
                      <BannerText faction={selectedFaction} totalMembers={totalMembers} />
                    </div>
                  </div>
                ) : (
                  <div style={{ position: "relative", padding: "28px 32px", background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.16 0.05 285) 55%, oklch(0.20 0.08 40) 100%)" }}>
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)", pointerEvents: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
                      <HeraldCrest type={selectedFaction.type} />
                      <BannerText faction={selectedFaction} totalMembers={totalMembers} />
                    </div>
                  </div>
                )}
              </section>

              {/* Two-column dossier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* Charter */}
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Charter</h3>
                  </div>
                  <div className="grim-stack" style={{ gap: 10, fontSize: 14 }}>
                    {(
                      [
                        ["Type", selectedFaction.type],
                        ["Seat", selectedFaction.location],
                        ["Status", selectedFaction.status],
                        ["Known Members", String(totalMembers)],
                      ] as [string, string][]
                    ).map(([k, v], i) => (
                      <div
                        key={i}
                        style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: i < 3 ? "1px dotted var(--grim-line)" : "none" }}
                      >
                        <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Aims & Ambitions */}
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Aims &amp; Ambitions</h3>
                  </div>
                  <div
                    className="grim-flavor"
                    style={{ fontSize: 14, color: "var(--grim-ink-2)", marginBottom: 14, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.goals || "", true) }}
                  />
                  {selectedFaction.background && (
                    <>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Background</div>
                      <div
                        style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.background, true) }}
                      />
                    </>
                  )}
                  {!selectedFaction.background && selectedFaction.description && (
                    <>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Description</div>
                      <div
                        style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.description, true) }}
                      />
                    </>
                  )}
                </section>
              </div>

              {/* GM Notes */}
              {isDM && selectedFaction.gm_notes && (
                <section className="grim-tome" style={{ marginBottom: 24, borderColor: "var(--grim-arcane)" }}>
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>GM&apos;s Compendium</h3>
                  </div>
                  <div
                    style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.gm_notes, true) }}
                  />
                </section>
              )}

              {/* Souls of the Banner (NPCs) */}
              {factionMembers.length > 0 && (
                <section className="grim-tome" style={{ marginBottom: 24 }}>
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Souls of the Banner</h3>
                    <span className="grim-tome-sub">{factionMembers.length} known</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {factionMembers.map((npc: NPC, index: number) => (
                      <MemberCard
                        key={index}
                        image={npc.image}
                        name={!npc.name || npc.nameHidden || npc.hide_name ? (npc.display_name || npc.aka ? `"${npc.display_name || npc.aka}"` : "Unknown") : npc.name}
                        sub={[npc.description, npc.gender, npc.location].filter(Boolean).join(" · ")}
                        deceased={npc.status === "Deceased"}
                        onClick={() => router.push(`/campaign/npcs?selected=${npc.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* PC members */}
              {factionPCs.length > 0 && (
                <section className="grim-tome" style={{ marginBottom: 24 }}>
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Player Characters</h3>
                    <span className="grim-tome-sub">{factionPCs.length} known</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {factionPCs.map((pc: PC, index: number) => (
                      <MemberCard
                        key={index}
                        image={pc.image}
                        name={pc.name + (pc.nickname ? ` "${pc.nickname}"` : "")}
                        sub={[pc.race, pc.class, pc.hometown].filter(Boolean).join(" · ")}
                        onClick={() => router.push(`/campaign/pcs?selected=${pc.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Relationships */}
              {selectedFaction.relationships && selectedFaction.relationships.length > 0 && (
                <section className="grim-tome" style={{ marginBottom: 24 }}>
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Alliances &amp; Enmities</h3>
                    <span className="grim-tome-sub">{selectedFaction.relationships.length} recorded</span>
                  </div>
                  <div className="grim-stack" style={{ gap: 10 }}>
                    {selectedFaction.relationships.map((rel, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                          gap: 16, paddingBottom: 10,
                          borderBottom: index < selectedFaction.relationships!.length - 1 ? "1px dotted var(--grim-line)" : "none",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", marginBottom: 4 }}>
                            {rel.faction}
                          </div>
                          {rel.description && (
                            <div style={{ fontSize: 13, color: "var(--grim-ink-3)", lineHeight: 1.5 }}>
                              {rel.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={`grim-chip ${rel.status === "Allied" ? "is-alive" : rel.status === "Hostile" ? "is-dead" : "is-unknown"}`}
                          style={{ flexShrink: 0 }}
                        >
                          {rel.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Backlinks — session recaps that tag this faction */}
              {(() => {
                const factionRecaps = recapData
                  .filter(r => (r.tagged_factions ?? []).includes(selectedFaction.id))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const factionQuests = questData.filter(q => (q.tagged_factions ?? []).includes(selectedFaction.id));
                if (factionRecaps.length === 0 && factionQuests.length === 0) return null;
                return (
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Appearances</h3>
                      <span className="grim-tome-sub">sessions &amp; quests</span>
                    </div>
                    <div className="grim-stack" style={{ gap: 8 }}>
                      {factionRecaps.map(r => (
                        <Link key={r.id ?? r.date} href={`/campaign/recaps?recap=${r.id ?? r.date}`} style={{ textDecoration: "none" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-ember-2)", flexShrink: 0 }}>SESSION</span>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{r.title}</span>
                            <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", marginLeft: "auto" }}>{r.date}</span>
                          </div>
                        </Link>
                      ))}
                      {factionQuests.map(q => (
                        <Link key={q.id} href={`/campaign/quests?quest=${q.id}`} style={{ textDecoration: "none" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-gold)", flexShrink: 0 }}>QUEST</span>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{q.name}</span>
                            <span className="grim-chip" style={{ fontSize: 9, marginLeft: "auto" }}>{q.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })()}
            </>
          ) : (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--grim-ink-4)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-gold-2)", marginBottom: 16 }}>⚑</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)" }}>~ choose your allegiance ~</div>
              <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>
                Select a banner from the faction rail
              </div>
            </div>
          )}
        </div>

        {/* Right: Faction rail */}
        <aside style={{ borderLeft: "1px solid var(--grim-line)", padding: "36px 16px 80px 22px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="grim-h-section" style={{ margin: 0 }}>The Banners</h2>
            <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em" }}>
              {filteredFactions.length}
            </span>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search banners…"
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 13, padding: "8px 12px 8px 32px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 14 }}>✦</span>
          </div>

          {/* Type filter */}
          {uniqueTypes.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: typeFilter ? "var(--grim-ink)" : "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 12, padding: "7px 10px", outline: "none", cursor: "pointer" }}
              >
                <option value="">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Faction cards */}
          <div className="grim-stack" style={{ gap: 8 }}>
            {filteredFactions.map((faction) => (
              <div
                key={faction.id}
                onClick={() => setSelectedFaction(faction)}
                className="grim-tome"
                style={{
                  padding: "12px 14px", cursor: "pointer",
                  border: `1px solid ${selectedFaction?.id === faction.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                  background: selectedFaction?.id === faction.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), var(--grim-bg-3))" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: selectedFaction?.id === faction.id ? "var(--grim-ember-2)" : "var(--grim-gold-2)", flexShrink: 0 }}>
                      {getFactionCrest(faction.type)}
                    </span>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 14, color: selectedFaction?.id === faction.id ? "var(--grim-ember-2)" : "var(--grim-ink)", letterSpacing: ".02em", lineHeight: 1.15 }}>
                      {faction.name}
                    </span>
                  </div>
                  <span className={statusChipClass(faction.status)} style={{ fontSize: 8, padding: "1px 6px", flexShrink: 0 }}>
                    {faction.status === "Destroyed" || faction.status === "Disbanded" ? "gone" : "active"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--grim-ink-3)", lineHeight: 1.4, marginTop: 8 }}>
                  {faction.description}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase" }}>
                    {faction.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
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
      {FACTION_CRESTS[type] || "⚑"}
    </div>
  );
}

function BannerText({ faction, totalMembers }: { faction: Faction; totalMembers: number }) {
  return (
    <div>
      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".24em", color: "var(--grim-gold-2)", textTransform: "uppercase" }}>
        {faction.type}
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-gold)", margin: "2px 0 4px", lineHeight: 0.9, textShadow: "0 0 32px oklch(0 0 0 / 0.4)" }}>
        {faction.name}
      </h1>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", marginBottom: 8 }}>
        ({faction.pronunciation})
      </div>
      <div className="grim-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className={`grim-chip ${faction.status === "Active" ? "is-alive" : "is-dead"}`}>
          {faction.status}
        </span>
        {totalMembers > 0 && (
          <span className="grim-chip is-faction">{totalMembers} known members</span>
        )}
        <span className="grim-chip">{faction.location}</span>
      </div>
    </div>
  );
}

function MemberCard({
  image, name, sub, deceased, onClick,
}: {
  image?: string;
  name: string;
  sub: string;
  deceased?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: 12, alignItems: "center",
        padding: "12px 14px",
        border: "1px solid var(--grim-line)",
        background: "oklch(0.14 0.025 290 / 0.6)",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--grim-gold-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--grim-line)")}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden", position: "relative", border: "1px solid var(--grim-line-2)" }}>
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            style={{ objectFit: "cover", objectPosition: "center top", filter: deceased ? "grayscale(0.8)" : "none" }}
          />
        ) : (
          <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-head)", fontSize: 14,
          color: deceased ? "var(--grim-ink-3)" : "var(--grim-ink)",
          letterSpacing: ".02em",
          textDecoration: deceased ? "line-through" : "none",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {name}
        </div>
        <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".10em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sub}
        </div>
      </div>
    </div>
  );
}
