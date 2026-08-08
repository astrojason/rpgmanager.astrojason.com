"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { authFetch } from "@/utils/authFetch";
import { CalendarData, NPC, Quest, SessionRecap, UserNote } from "@/types/interfaces";
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
import { statusChipClass } from "@/utils/chipClass";
import ErrorBlock from "@/components/ErrorBlock";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";

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

function sigilStyle(tint: string): { className: string; style: React.CSSProperties } {
  const gradients: Record<string, string> = {
    ember: "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))",
    arcane: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))",
    blood: "linear-gradient(180deg, oklch(0.38 0.16 22), oklch(0.25 0.12 22))",
  };
  const borderClasses: Record<string, string> = {
    ember: "border-grim-ember",
    arcane: "border-grim-arcane",
    blood: "border-grim-blood-2",
  };
  const background = gradients[tint] ?? "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))";
  const borderClass = borderClasses[tint] ?? "border-grim-gold-2";
  return {
    className: `w-11 h-11 shrink-0 flex items-center justify-center font-display text-4xl border ${borderClass}`,
    style: { borderRadius: 1, color: "oklch(0.92 0.05 70)", boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)", background },
  };
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

function statusLabel(status?: string) {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "alive") return "alive";
  if (s === "deceased") return "deceased";
  return "unknown";
}

export default function CampaignHome() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  const { data: sessionData = null, error: sessionError } = useQuery<NextSessionData | null>({
    queryKey: ['/api/data/next-session'],
    queryFn: async () => {
      const r = await authFetch('/api/data/next-session');
      if (!r.ok) throw new Error(`Failed to load session (${r.status})`);
      return r.json();
    },
  });
  const { data: allNpcs = [], error: npcsError } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: async () => {
      const r = await authFetch('/api/data/npcs');
      if (!r.ok) throw new Error(`Failed to load NPCs (${r.status})`);
      return r.json();
    },
  });
  const { data: allRecaps = [], error: recapsError } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => {
      const r = await authFetch('/api/data/session-recaps');
      if (!r.ok) throw new Error(`Failed to load recaps (${r.status})`);
      return r.json();
    },
  });
  const { data: allQuests = [], error: questsError } = useQuery<Quest[]>({
    queryKey: ['/api/data/quests'],
    queryFn: async () => {
      const r = await authFetch('/api/data/quests');
      if (!r.ok) throw new Error(`Failed to load quests (${r.status})`);
      return r.json();
    },
  });

  const { data: calendarData = null } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: async () => {
      const r = await authFetch('/api/data/calendar');
      return r.ok ? r.json() : null;
    },
  });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/auth");
    });
    return () => unsubscribe();
  }, [router]);

  const latestRecap = useMemo(() => {
    const sorted = [...allRecaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.length > 0 ? sorted[0] : null;
  }, [allRecaps]);

  const recentNPCs = useMemo(() => {
    const sorted = [...allRecaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const tagged = getRecentlyTaggedNpcs(sorted, allNpcs);
    return tagged.length > 0 ? tagged : allNpcs.filter((n: NPC) => !n.hidden).slice(0, 6);
  }, [allRecaps, allNpcs]);

  const activeQuests = useMemo(() =>
    allQuests.filter((q: Quest) => q.status === 'active').slice(0, 4),
    [allQuests]
  );

  const queryError = sessionError || npcsError || recapsError || questsError;

  const currentGameDate = useMemo(() => {
    const cur = calendarData?.current;
    const months = calendarData?.static?.months ?? [];
    if (!cur || !cur.day || !cur.month || !cur.year) return null;
    const monthName = months[cur.month - 1]?.name ?? `Month ${cur.month}`;
    return `${monthName} ${cur.day}, ${cur.year}`;
  }, [calendarData]);

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
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full">
      {queryError && <ErrorBlock error={queryError.message} />}

      {/* Masthead */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Codex of the Dungeon Master</div>
          <h1 className="grim-page-title">Azorian&apos;s Bounty</h1>
          <p className="grim-page-sub">Welcome, scrivener. The candles are lit and the ink is wet — your campaign awaits.</p>
        </div>
        <div className="text-right pb-1.5">
          <div className="grim-label mb-1">Chapter</div>
          <div className="font-display text-4xl text-grim-gold leading-none">
            The Hellhound Vigil
          </div>
          <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2 mt-1">
            session xxi · stormharbor arc
          </div>
        </div>
      </header>

      {/* Next Session — wax-sealed summons */}
      <section className="grim-tome is-bordered mb-7 p-0 overflow-hidden">
        <div className="grid gap-0" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>

          {/* Parchment summons */}
          <div className="grim-parchment rounded-none m-0 min-h-65 py-8 px-10">
            <div className="flex justify-between items-start mb-3.5">
              <div>
                <div className="grim-mono text-sm tracking-widest-4 text-grim-parchment-eyebrow uppercase">
                  By order of the Master
                </div>
                <div className="font-display text-6xl text-grim-blood leading-none mt-1">
                  A Summoning
                </div>
              </div>
              <div className="grim-seal">✦</div>
            </div>

            <div className="font-body text-xl mt-3" style={{ color: "oklch(0.28 0.03 50)", lineHeight: 1.6 }}>
              {sessionDateStr ? (
                <>Hark and attend! The party is bid to gather upon{" "}
                <b className="font-head">{sessionDateStr}</b>
                {sessionData?.location ? (
                  <>, that we may continue the bloody business of <i>{sessionData.location}</i>.</>
                ) : (
                  <>, that we may continue the party&apos;s bloody business.</>
                )}</>
              ) : (
                <>The next session date is yet to be proclaimed. Watch the skies, adventurer.</>
              )}
            </div>

            <div className="flex gap-7 mt-5.5 pt-4" style={{ borderTop: "1px dashed oklch(0.55 0.08 50 / 0.5)" }}>
              <div>
                <div className="grim-mono text-xs tracking-widest-4 text-grim-parchment-eyebrow uppercase">Game Date</div>
                <div className="font-display text-2xl text-grim-parchment-ink-3 mt-0.5" style={{ lineHeight: 1.2 }}>
                  {currentGameDate ?? "—"}
                </div>
              </div>
              {sessionData?.location && (
                <div>
                  <div className="grim-mono text-xs tracking-widest-4 text-grim-parchment-eyebrow uppercase">Location</div>
                  <div className="font-display text-2xl text-grim-parchment-ink-3 mt-0.5" style={{ lineHeight: 1.2 }}>
                    {sessionData.location}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dark countdown + last-time-on */}
          <div className="py-7 px-8 flex flex-col gap-4" style={{ background: "linear-gradient(180deg, oklch(0.16 0.035 290), oklch(0.12 0.030 295))" }}>
            <div className="flex items-center justify-between">
              <div className="grim-h-section m-0">The Vigil Approaches</div>
              <div className="flex items-center gap-1.5">
                <span className="grim-flame"/>
                <span className="grim-mono text-sm tracking-widest-2 text-grim-ember-2 uppercase">active</span>
              </div>
            </div>

            <div className="flex gap-3.5 items-baseline">
              <div className="font-display text-8xl text-grim-ember-2" style={{ lineHeight: 0.85, textShadow: "0 0 30px oklch(0.72 0.165 48 / 0.5)" }}>
                {daysUntil !== null && !sessionData?.isSkipped ? daysUntil : "—"}
              </div>
              <div>
                <div className="font-head text-2xl text-grim-gold tracking-wider">
                  {sessionData?.isSkipped ? "skipped" : daysUntil === 0 ? "today!" : daysUntil === 1 ? "day hence" : "days hence"}
                </div>
                <div className="grim-mono text-sm text-grim-ink-3 tracking-wider-4 mt-0.5">
                  {sessionDateStr || "date TBD"}
                </div>
              </div>
            </div>

            {latestRecap && (
              <div className="bg-grim-bg-overlay border border-grim-line py-3.5 px-4" style={{ borderRadius: 1 }}>
                <div className="grim-label mb-1.5">Where we left the party</div>
                <div className="font-body text-lg text-grim-ink italic mb-2" style={{ lineHeight: 1.55 }}>
                  {toPlainText(latestRecap.recap).slice(0, 220).trimEnd()}…
                </div>
                <Link href="/campaign/recaps" className="grim-link text-sm font-head tracking-wider-2 uppercase">
                  {latestRecap.title} ›
                </Link>
              </div>
            )}

            <div className="flex gap-2">
              <Link href="/campaign/next-session" className="grim-btn is-ember no-underline">
                View Session Details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Sigils */}
      <section className="mb-7">
        <h2 className="grim-h-section">The Sigils of Quick Passage</h2>
        <div className="grid grid-cols-4 gap-3.5">
          {QUICK_LINKS.map((s, i) => {
            const sigil = sigilStyle(s.tint);
            return (
            <a key={i} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="grim-tome p-4.5 no-underline text-inherit cursor-pointer flex gap-3.5 items-center">
              <div className={sigil.className} style={sigil.style}>{s.sigil}</div>
              <div className="flex-1 min-w-0">
                <div className="font-head text-lg tracking-widest text-grim-ink uppercase">{s.title}</div>
                <div className="grim-mono text-sm tracking-wider-3 text-grim-ink-3 uppercase mt-0.5">{s.sub}</div>
              </div>
              <span className="text-grim-ink-4 font-display text-2xl">›</span>
            </a>
            );
          })}
        </div>
      </section>

      {/* Three-column field */}
      <div className="grid gap-4.5 mb-7" style={{ gridTemplateColumns: "1.1fr 1.1fr 0.8fr" }}>

        {/* Lately Beheld — recent NPCs */}
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Lately Beheld</h3>
            <span className="grim-tome-sub">NPCs the party has met</span>
          </div>
          <div className="grim-stack gap-2.5">
            {recentNPCs.map((npc, i) => {
              const imgSrc = safeImageSrc(npc.image);
              const nameIsHidden = Boolean(npc.nameHidden || npc.hide_name);
              const showRealName = !nameIsHidden || isAdmin || isDM;
              const name = showRealName ? (npc.name || npc.aka || "Unknown") : (npc.display_name || npc.aka || "Unknown");
              return (
                <Link key={npc.id} href={`/campaign/npcs/${npc.id}`} className="no-underline text-inherit">
                  <div className={`flex gap-3 items-center pt-1.5 px-0 ${i < recentNPCs.length - 1 ? "pb-2.5 border-b border-dashed border-grim-line" : "pb-0"}`}>
                    <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-grim-line relative">
                      {imgSrc ? (
                        <Image src={imgSrc} alt={name} fill className="object-cover object-top"/>
                      ) : (
                        <div className="grim-img-slot is-portrait w-full h-full"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <div className="font-head text-lg text-grim-ink tracking-wide truncate">{name}</div>
                        {nameIsHidden && (isAdmin || isDM) && (
                          <span className="grim-chip text-xs py-0.25 px-1.5 shrink-0 bg-grim-name-hidden-bg text-grim-gold-2 border border-grim-gold-2">name hidden</span>
                        )}
                        {npc.pronunciation && !nameIsHidden && <div className="font-body text-sm text-grim-ink-4 italic shrink-0">({npc.pronunciation})</div>}
                      </div>
                      <div className="grim-mono text-sm tracking-wider-2 text-grim-ink-3 uppercase truncate">
                        {[npc.race, npc.location].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className={`${statusChipClass(npc.status)} shrink-0 text-sm`}>
                      {statusLabel(npc.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
            <Link href="/campaign/npcs" className="grim-link font-head text-base tracking-wider-3 uppercase self-start mt-1">
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
          <div className="grim-stack gap-3.5">
            {activeQuests.length === 0 ? (
              <p className="font-body text-lg text-grim-ink-4 italic m-0">
                No threads are in motion.
              </p>
            ) : activeQuests.map((q, i) => {
              const state = questRailState(q.status);
              const desc = questDescription(q);
              return (
                <Link key={q.id} href={`/campaign/quests/${q.id}`} className={`flex gap-3 items-start pb-3 no-underline ${i < activeQuests.length - 1 ? "border-b border-dashed border-grim-line" : ""}`}>
                  <div
                    className={`w-1 self-stretch mt-1 shrink-0 ${state === "ember" ? "bg-grim-ember" : state === "arcane" ? "bg-grim-arcane" : "bg-grim-line-2"}`}
                    style={{ boxShadow: state !== "dim" ? `0 0 8px ${state === "ember" ? "var(--grim-ember)" : "var(--grim-arcane)"}` : "none" }}
                  />
                  <div className="flex-1">
                    <div className="font-head text-lg tracking-wide text-grim-ink">{q.name}</div>
                    <div className="grim-mono text-sm tracking-wider-3 text-grim-ink-4 uppercase mt-0.5">{questMeta(q.status)}</div>
                    {desc && <div className="text-lg text-grim-ink-2 italic mt-1.5" style={{ lineHeight: 1.45 }}>{desc}</div>}
                  </div>
                </Link>
              );
            })}
            <Link href="/campaign/quests" className="grim-link font-head text-base tracking-wider-3 uppercase self-start">
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
          <div className="grid grid-cols-10 gap-0.75 mb-3.5">
            {["Adon","Selū","Rili","Tel'","Pyrt","Neld","Vian","Illu","Bari","Anar"].map((d, i) => (
              <div key={i} className="grim-mono text-xs tracking-wider text-grim-ink-4 text-center uppercase pb-1 border-b border-grim-line">{d}</div>
            ))}
            {Array.from({ length: 40 }).map((_, i) => {
              const day = i + 1;
              const isToday = day === 36;
              return (
                <div
                  key={i}
                  className={`h-6 flex flex-col items-center justify-center font-display text-sm relative ${isToday ? "bg-grim-ember-2" : "bg-transparent"}`}
                  style={{ color: isToday ? "oklch(0.20 0.03 40)" : "var(--grim-ink-2)", borderRadius: 1 }}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="grim-stack gap-1.5 text-lg">
            <div className="flex items-baseline gap-2">
              <span className="grim-mono text-sm text-grim-ember-2 tracking-wider-2">36 ▸</span>
              <span className="text-grim-ink">The Hellhound Vigil <span className="grim-dim">— today</span></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="grim-mono text-sm text-grim-gold tracking-wider-2">40 ▸</span>
              <span className="text-grim-ink-2">Stormharbor harvest fair</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="grim-mono text-sm text-grim-arcane tracking-wider-2">55 ▸</span>
              <span className="text-grim-ink-2">The Whispering tide returns</span>
            </div>
          </div>
        </section>
      </div>

      {/* Ornament divider */}
      <div className="grim-rule-ornament"><span className="grim-rule-ornament-glyph">❦</span></div>

      {/* House Rules — parchment preview */}
      <section className="grim-parchment mt-1.5">
        <div className="flex justify-between items-baseline mb-3.5">
          <div>
            <div className="grim-mono text-sm tracking-widest-4 text-grim-parchment-eyebrow uppercase">Of the House</div>
            <div className="font-display text-5xl leading-none" style={{ color: "oklch(0.25 0.05 30)" }}>Rules of the Table</div>
          </div>
          <span className="grim-mono text-sm tracking-widest-2 uppercase" style={{ color: "oklch(0.45 0.05 40)" }}>Three Edicts</span>
        </div>

        <div className="grid grid-cols-3 gap-6 text-grim-parchment-ink-3">
          {HOUSE_RULES.map((rule, i) => (
            <div key={i}>
              <div className="font-display text-3xl text-grim-blood mb-1.5">
                {rule.roman}. {rule.label}
              </div>
              <p className="text-lg m-0" style={{ lineHeight: 1.55 }}>{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
