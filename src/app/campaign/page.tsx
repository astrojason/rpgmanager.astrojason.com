"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { authFetch } from "@/utils/authFetch";
import { NPC, Quest, SessionRecap, UserNote } from "@/types/interfaces";
import { safeImageSrc } from "@/utils/sanitize";
import Image from "next/image";
import Link from "next/link";
import {
  daysUntil as calculateDaysUntil,
  determineUpcomingSessionDate,
  formatSessionDate,
  parseSessionDate,
} from "@/utils/nextSession";
import { getRecentlyTaggedNpcs } from "@/utils/entityTags";

interface NextSessionData {
  date: string;
  agenda: string;
  reminders: string[];
  currentGameDate: string;
  location?: string;
  notes?: string;
  lastUpdated?: string;
  isSkipped?: boolean;
  skipReason?: string;
}

const QUICK_LINKS = [
  { sigil: "⌬", title: "Forge VTT",     sub: "Virtual tabletop",  tint: "ember",  href: "https://azorians-bounty.forge-vtt.com/" },
  { sigil: "✠", title: "D&D Beyond",    sub: "Sheets & spells",    tint: "arcane", href: "https://www.dndbeyond.com/campaigns/4659028" },
  { sigil: "☾", title: "Session Recap", sub: "Last night's tale",  tint: "gold",   href: "/campaign/recaps" },
  { sigil: "⚔", title: "Pronunciations",sub: "Name guide",         tint: "blood",  href: "/campaign/pronunciations" },
];

const HOUSE_RULES = [
  {
    roman: "I",
    label: "Of Natural Twenties",
    title: '"I got a nat 20 on my attack roll!"',
    body: "Upon a critical strike, add the dice's maximum to what thou hast already rolled. A dagger of 1d4+3 then deals 1d4+7; sneak attack of 3d6 adds +18. The blade is doubled in mercy, not in chance.",
  },
  {
    roman: "II",
    label: "Of Inspiration",
    title: '"How do I use my inspiration?"',
    body: "Earned through recap or roleplay. On checks & saves it sets thy result to 20 + thy modifier. In combat, wield it as bardic boon (+1d8) or wicked bane (−1d4 to the foe).",
  },
  {
    roman: "III",
    label: "Of Healing Draughts",
    title: '"And the healing potions?"',
    body: "Quaffed in combat as a bonus action: roll the dice. Quaffed at thy leisure: take the maximum. Save thy potions for the quiet moments — they reward patience.",
  },
];

function sigilStyle(tint: string) {
  const base = {
    width: 44, height: 44, flexShrink: 0, borderRadius: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-display)", fontSize: 28,
    color: "oklch(0.92 0.05 70)",
    boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)",
  };
  if (tint === "ember") return { ...base, background: "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))", border: "1px solid var(--grim-ember)" };
  if (tint === "arcane") return { ...base, background: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))", border: "1px solid var(--grim-arcane)" };
  if (tint === "blood") return { ...base, background: "linear-gradient(180deg, oklch(0.38 0.16 22), oklch(0.25 0.12 22))", border: "1px solid var(--grim-blood-2)" };
  return { ...base, background: "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))", border: "1px solid var(--grim-gold-2)" };
}

function toPlainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, '$1')
    .replace(/`+[^`\n]*`+/g, '')
    .replace(/^\s*[-*+>]+\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function questRailState(status: string) {
  if (status === 'active') return 'ember';
  if (status === 'onhold') return 'arcane';
  return 'dim';
}

function questMeta(status: string) {
  if (status === 'active') return 'in motion';
  if (status === 'onhold') return 'stalled';
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return status;
}

function questDescription(quest: Quest): string {
  if (!quest.notes || quest.notes.length === 0) return '';
  const last = quest.notes[quest.notes.length - 1];
  const raw = typeof last === 'string' ? last : (last as UserNote).content;
  return toPlainText(raw).slice(0, 120);
}

function statusChipClass(status?: string) {
  if (!status) return "grim-chip is-unknown";
  const s = status.toLowerCase();
  if (s === "alive") return "grim-chip is-alive";
  if (s === "deceased" || s === "dead") return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

function statusLabel(status?: string) {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "alive") return "alive";
  if (s === "deceased") return "deceased";
  return "unknown";
}

export default function CampaignHome() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<NextSessionData | null>(null);
  const [recentNPCs, setRecentNPCs] = useState<NPC[]>([]);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [latestRecap, setLatestRecap] = useState<SessionRecap | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/auth");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    authFetch('/api/data/next-session')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSessionData(d); })
      .catch(() => {});

    Promise.all([
      authFetch('/api/data/npcs').then(r => r.json()),
      authFetch('/api/data/session-recaps').then(r => r.json()),
    ]).then(([npcs, recaps]: [NPC[], SessionRecap[]]) => {
      const sorted = [...recaps].sort((a, b) => parseInt(b.id || '0') - parseInt(a.id || '0'));
      if (sorted.length > 0) setLatestRecap(sorted[0]);

      const tagged = getRecentlyTaggedNpcs(sorted, npcs);
      const visible = tagged.length > 0
        ? tagged
        : npcs.filter((n: NPC) => !n.hidden).slice(0, 6);
      setRecentNPCs(visible);
    }).catch(() => {});

    authFetch('/api/data/quests')
      .then(r => r.json())
      .then((quests: Quest[]) => {
        setActiveQuests(quests.filter((q: Quest) => q.status === 'active').slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const storedDate = useMemo(() => parseSessionDate(sessionData?.date), [sessionData?.date]);
  const upcomingDate = useMemo(() => determineUpcomingSessionDate(sessionData, new Date()), [sessionData]);
  const daysUntil = useMemo(() => calculateDaysUntil(upcomingDate, new Date()), [upcomingDate]);

  const daysLabel = sessionData?.isSkipped
    ? "Skipped"
    : daysUntil === null ? "TBD"
    : daysUntil === 0 ? "Today!"
    : daysUntil === 1 ? "Tomorrow"
    : `${daysUntil}`;

  const sessionDateStr = formatSessionDate(upcomingDate ?? storedDate);

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>

      {/* Masthead */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Codex of the Dungeon Master</div>
          <h1 className="grim-page-title">Azorian&apos;s Bounty</h1>
          <p className="grim-page-sub">Welcome, scrivener. The candles are lit and the ink is wet — your campaign awaits.</p>
        </div>
        <div style={{ textAlign: "right", paddingBottom: 6 }}>
          <div className="grim-label" style={{ marginBottom: 4 }}>Chapter</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-gold)", lineHeight: 1 }}>
            The Hellhound Vigil
          </div>
          <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em", marginTop: 4 }}>
            session xxi · stormharbor arc
          </div>
        </div>
      </header>

      {/* Next Session — wax-sealed summons */}
      <section className="grim-tome is-bordered" style={{ marginBottom: 28, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 0 }}>

          {/* Parchment summons */}
          <div className="grim-parchment" style={{ borderRadius: 0, margin: 0, minHeight: 260, padding: "32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>
                  By order of the Master
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "var(--grim-blood)", lineHeight: 1, marginTop: 4 }}>
                  A Summoning
                </div>
              </div>
              <div className="grim-seal">✦</div>
            </div>

            <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "oklch(0.28 0.03 50)", lineHeight: 1.6, marginTop: 12 }}>
              {sessionDateStr ? (
                <>Hark and attend! The party is bid to gather upon{" "}
                <b style={{ fontFamily: "var(--font-head)" }}>{sessionDateStr}</b>,
                that we may continue the bloody business of <i>Stormharbor</i>.</>
              ) : (
                <>The next session date is yet to be proclaimed. Watch the skies, adventurer.</>
              )}
            </div>

            <div style={{ display: "flex", gap: 28, marginTop: 22, paddingTop: 16, borderTop: "1px dashed oklch(0.55 0.08 50 / 0.5)" }}>
              <div>
                <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Game Date</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "oklch(0.25 0.03 40)", lineHeight: 1.2, marginTop: 2 }}>
                  {sessionData?.currentGameDate || "Miriandar 36, 427"}
                </div>
              </div>
              {sessionData?.location && (
                <div>
                  <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Location</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "oklch(0.25 0.03 40)", lineHeight: 1.2, marginTop: 2 }}>
                    {sessionData.location}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dark countdown + last-time-on */}
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16, background: "linear-gradient(180deg, oklch(0.16 0.035 290), oklch(0.12 0.030 295))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="grim-h-section" style={{ margin: 0 }}>The Vigil Approaches</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="grim-flame"/>
                <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>active</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 80, color: "var(--grim-ember-2)", lineHeight: 0.85, textShadow: "0 0 30px oklch(0.72 0.165 48 / 0.5)" }}>
                {daysUntil !== null && !sessionData?.isSkipped ? daysUntil : "—"}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--grim-gold)", letterSpacing: ".06em" }}>
                  {sessionData?.isSkipped ? "skipped" : daysUntil === 0 ? "today!" : daysUntil === 1 ? "day hence" : "days hence"}
                </div>
                <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".16em", marginTop: 2 }}>
                  {sessionDateStr || "date TBD"}
                </div>
              </div>
            </div>

            {latestRecap && (
              <div style={{ background: "oklch(0.12 0.025 290)", border: "1px solid var(--grim-line)", padding: "14px 16px", borderRadius: 1 }}>
                <div className="grim-label" style={{ marginBottom: 6 }}>Where we left the party</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink)", lineHeight: 1.55, fontStyle: "italic", marginBottom: 8 }}>
                  {toPlainText(latestRecap.recap).slice(0, 220).trimEnd()}…
                </div>
                <Link href="/campaign/recaps" className="grim-link" style={{ fontSize: 11, fontFamily: "var(--font-head)", letterSpacing: ".12em", textTransform: "uppercase" }}>
                  {latestRecap.title} ›
                </Link>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/campaign/next-session" className="grim-btn is-ember" style={{ textDecoration: "none" }}>
                View Session Details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Sigils */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="grim-h-section">The Sigils of Quick Passage</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {QUICK_LINKS.map((s, i) => (
            <a key={i} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="grim-tome"
              style={{ padding: "18px", textDecoration: "none", color: "inherit", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}>
              <div style={sigilStyle(s.tint)}>{s.sigil}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".10em", textTransform: "uppercase", color: "var(--grim-ink)" }}>{s.title}</div>
                <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 2 }}>{s.sub}</div>
              </div>
              <span style={{ color: "var(--grim-ink-4)", fontFamily: "var(--font-display)", fontSize: 18 }}>›</span>
            </a>
          ))}
        </div>
      </section>

      {/* Three-column field */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 0.8fr", gap: 18, marginBottom: 28 }}>

        {/* Lately Beheld — recent NPCs */}
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Lately Beheld</h3>
            <span className="grim-tome-sub">NPCs the party has met</span>
          </div>
          <div className="grim-stack" style={{ gap: 10 }}>
            {recentNPCs.map((npc, i) => {
              const imgSrc = safeImageSrc(npc.image);
              const name = npc.nameHidden ? (npc.display_name || npc.aka || "Unknown") : (npc.name || npc.aka || "Unknown");
              return (
                <Link key={npc.id} href={`/campaign/npcs?selected=${npc.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderBottom: i < recentNPCs.length - 1 ? "1px dashed var(--grim-line)" : "none", paddingBottom: i < recentNPCs.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "1px solid var(--grim-line)", position: "relative" }}>
                      {imgSrc ? (
                        <Image src={imgSrc} alt={name} fill style={{ objectFit: "cover", objectPosition: "center top" }}/>
                      ) : (
                        <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%", fontSize: 0 }}/>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", letterSpacing: ".02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                        {npc.pronunciation && <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--grim-ink-4)", fontStyle: "italic", flexShrink: 0 }}>({npc.pronunciation})</div>}
                      </div>
                      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {[npc.race, npc.location].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className={statusChipClass(npc.status)} style={{ flexShrink: 0, fontSize: 10 }}>
                      {statusLabel(npc.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
            <Link href="/campaign/npcs" className="grim-link" style={{ fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", alignSelf: "flex-start", marginTop: 4 }}>
              All souls in the codex ›
            </Link>
          </div>
        </section>

        {/* Active Threads */}
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Active Threads</h3>
            <span className="grim-tome-sub">quests in motion</span>
          </div>
          <div className="grim-stack" style={{ gap: 14 }}>
            {activeQuests.length === 0 ? (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)", fontStyle: "italic", margin: 0 }}>
                No threads are in motion.
              </p>
            ) : activeQuests.map((q, i) => {
              const state = questRailState(q.status);
              const desc = questDescription(q);
              return (
                <div key={q.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 12, borderBottom: i < activeQuests.length - 1 ? "1px dashed var(--grim-line)" : "none" }}>
                  <div style={{
                    width: 4, alignSelf: "stretch", marginTop: 4, flexShrink: 0,
                    background: state === "ember" ? "var(--grim-ember)" : state === "arcane" ? "var(--grim-arcane)" : "var(--grim-line-2)",
                    boxShadow: state !== "dim" ? `0 0 8px ${state === "ember" ? "var(--grim-ember)" : "var(--grim-arcane)"}` : "none"
                  }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".02em", color: "var(--grim-ink)" }}>{q.name}</div>
                    <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 2 }}>{questMeta(q.status)}</div>
                    {desc && <div style={{ fontSize: 13, color: "var(--grim-ink-2)", fontStyle: "italic", marginTop: 6, lineHeight: 1.45 }}>{desc}</div>}
                  </div>
                </div>
              );
            })}
            <Link href="/campaign/quests" className="grim-link" style={{ fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", alignSelf: "flex-start" }}>
              Unfurl all threads ›
            </Link>
          </div>
        </section>

        {/* Calendar */}
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">The Reckoning</h3>
            <span className="grim-tome-sub">Calantheon · 3rd month</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3, marginBottom: 14 }}>
            {["Adon","Selū","Rili","Tel'","Pyrt","Neld","Vian","Illu","Bari","Anar"].map((d, i) => (
              <div key={i} className="grim-mono" style={{ fontSize: 8, letterSpacing: ".04em", color: "var(--grim-ink-4)", textAlign: "center", textTransform: "uppercase", paddingBottom: 4, borderBottom: "1px solid var(--grim-line)" }}>{d}</div>
            ))}
            {Array.from({ length: 40 }).map((_, i) => {
              const day = i + 1;
              const isToday = day === 36;
              return (
                <div key={i} style={{
                  height: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 11,
                  color: isToday ? "oklch(0.20 0.03 40)" : "var(--grim-ink-2)",
                  background: isToday ? "var(--grim-ember-2)" : "transparent",
                  borderRadius: 1, position: "relative"
                }}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="grim-stack" style={{ gap: 6, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ember-2)", letterSpacing: ".12em" }}>36 ▸</span>
              <span style={{ color: "var(--grim-ink)" }}>The Hellhound Vigil <span className="grim-dim">— today</span></span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-gold)", letterSpacing: ".12em" }}>40 ▸</span>
              <span style={{ color: "var(--grim-ink-2)" }}>Stormharbor harvest fair</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-arcane)", letterSpacing: ".12em" }}>55 ▸</span>
              <span style={{ color: "var(--grim-ink-2)" }}>The Whispering tide returns</span>
            </div>
          </div>
        </section>
      </div>

      {/* Ornament divider */}
      <div className="grim-rule-ornament"><span className="grim-rule-ornament-glyph">❦</span></div>

      {/* House Rules — parchment preview */}
      <section className="grim-parchment" style={{ marginTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Of the House</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "oklch(0.25 0.05 30)", lineHeight: 1 }}>Rules of the Table</div>
          </div>
          <span className="grim-mono" style={{ fontSize: 10, color: "oklch(0.45 0.05 40)", letterSpacing: ".18em", textTransform: "uppercase" }}>Three Edicts</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, color: "oklch(0.25 0.03 40)" }}>
          {HOUSE_RULES.map((rule, i) => (
            <div key={i}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-blood)", marginBottom: 6 }}>
                {rule.roman}. {rule.label}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
