"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsAdmin } from "@/utils/adminCheck";
import Link from "next/link";
import {
  daysUntil as calculateDaysUntil,
  determineUpcomingSessionDate,
  formatSessionDate,
  parseSessionDate,
} from "@/utils/nextSession";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import { CalendarData, SessionRecap } from "@/types/interfaces";

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

interface Countdown {
  h: number;
  m: number;
  s: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

function sigilStyle(tint: string): { className: string; style: React.CSSProperties } {
  const gradients: Record<string, string> = {
    ember: "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))",
    arcane: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))",
  };
  const borderClasses: Record<string, string> = {
    ember: "border-grim-ember",
    arcane: "border-grim-arcane",
  };
  const background = gradients[tint] ?? "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))";
  const borderClass = borderClasses[tint] ?? "border-grim-gold-2";
  return {
    className: `w-11.5 h-11.5 shrink-0 flex items-center justify-center font-display text-4xl border ${borderClass}`,
    style: { borderRadius: 1, color: "oklch(0.92 0.05 70)", background },
  };
}

const QUICK_LINK_META = [
  { sigil: "☾", title: "Last Session Recap", tint: "gold",   href: "/campaign/recaps" },
  { sigil: "⚔", title: "Player Characters",  tint: "ember",  href: "/campaign/pcs" },
  { sigil: "✠", title: "Campaign Calendar",  tint: "arcane", href: "/campaign/calendar" },
];

export default function NextSessionPage() {
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<Countdown>({ h: 0, m: 0, s: 0 });
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const { data: sessionData = null, isPending: loading } = useQuery<NextSessionData | null>({
    queryKey: ['/api/data/next-session'],
    queryFn: async () => {
      const r = await authFetch("/api/data/next-session");
      if (!r.ok) throw new Error("Failed to load session data");
      return r.json();
    },
  });

  const { data: calendarData = null } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: async () => {
      const r = await authFetch("/api/data/calendar");
      return r.ok ? r.json() : null;
    },
  });

  const { data: recaps = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => {
      const r = await authFetch("/api/data/session-recaps");
      return r.ok ? r.json() : [];
    },
  });

  const currentGameDate = useMemo(() => {
    const cur = calendarData?.current;
    const months = calendarData?.static?.months ?? [];
    if (!cur || !cur.day || !cur.month || !cur.year) return sessionData?.currentGameDate ?? null;
    const monthName = months[cur.month - 1]?.name ?? `Month ${cur.month}`;
    return `${monthName} ${cur.day}, ${cur.year}`;
  }, [calendarData, sessionData?.currentGameDate]);

  const latestRecap = useMemo(() => {
    const sorted = [...recaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.length > 0 ? sorted[0] : null;
  }, [recaps]);

  const quickLinks = useMemo(() => [
    { ...QUICK_LINK_META[0], sub: latestRecap?.title ?? "No recap yet" },
    { ...QUICK_LINK_META[1], sub: "The fellowship" },
    { ...QUICK_LINK_META[2], sub: currentGameDate ?? "Date unknown" },
  ], [latestRecap, currentGameDate]);

  const storedSessionDate = useMemo(() => parseSessionDate(sessionData?.date), [sessionData?.date]);
  const upcomingSessionDate = useMemo(
    () => determineUpcomingSessionDate(sessionData, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionData]
  );
  const daysUntil = useMemo(() => calculateDaysUntil(upcomingSessionDate, new Date()), [upcomingSessionDate]);

  // Live countdown ticker
  useEffect(() => {
    const target = upcomingSessionDate;
    if (!target) return;
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setCountdown({ h: 0, m: 0, s: 0 }); return; }
      const total = Math.floor(diff / 1000);
      setCountdown({ h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upcomingSessionDate]);

  const displayDate = upcomingSessionDate ?? storedSessionDate;

  const weekdayLabel = useMemo(() => {
    if (!displayDate) return "Day Unknown";
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long" }).format(displayDate);
  }, [displayDate]);

  const daysUntilLabel = useMemo(() => {
    if (sessionData?.isSkipped || daysUntil === null) return "—";
    return String(daysUntil);
  }, [daysUntil, sessionData?.isSkipped]);

  const daysHenceLabel = useMemo(() => {
    if (sessionData?.isSkipped) return "postponed";
    if (daysUntil === null) return "date tbd";
    if (daysUntil === 0) return "today!";
    if (daysUntil === 1) return "day hence";
    return "days hence";
  }, [daysUntil, sessionData?.isSkipped]);

  const handleEditSession = async () => {
    if (!sessionData) return;
    const location = prompt("Edit session location:", sessionData.location || "");
    if (location === null) return;
    const agenda = prompt("Edit session agenda:", sessionData.agenda || "");
    if (agenda === null) return;
    const notes = prompt("Edit session notes:", sessionData.notes || "");
    if (notes === null) return;
    const updated = { ...sessionData, location, agenda, notes, lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) await queryClient.invalidateQueries({ queryKey: ['/api/data/next-session'] });
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleSkip = async () => {
    if (!sessionData) return;
    const reason = prompt("Reason for skipping (optional):", sessionData.skipReason || "");
    if (reason === null) return;
    const updated = { ...sessionData, isSkipped: true, skipReason: reason, lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) await queryClient.invalidateQueries({ queryKey: ['/api/data/next-session'] });
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleUnskip = async () => {
    if (!sessionData) return;
    const updated = { ...sessionData, isSkipped: false, skipReason: "", lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) await queryClient.invalidateQueries({ queryKey: ['/api/data/next-session'] });
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleAdvance = async () => {
    if (!sessionData) return;
    const current = new Date(sessionData.date);
    current.setDate(current.getDate() + 7);
    const updated = { ...sessionData, date: current.toISOString().split("T")[0], isSkipped: false, skipReason: "", lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) await queryClient.invalidateQueries({ queryKey: ['/api/data/next-session'] });
    } catch (e) { setError(toErrorMessage(e)); }
  };

  if (loading) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Loading the summons&hellip;
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
        <div className="font-head text-2xl text-grim-blood-2 tracking-wider">
          The summons could not be retrieved.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {/* Masthead */}
      <header className="flex items-end justify-between gap-6 mb-6.5">
        <div>
          <div className="grim-page-eyebrow">By Order of the Master</div>
          <h1 className="grim-page-title">The Summoning</h1>
          <p className="grim-page-sub">The party is bid to gather. The candles are lit; the dice await their casting.</p>
        </div>
        {isAdmin && (
          <div className="grim-row gap-2 pb-1.5">
            <button className="grim-btn is-ghost" onClick={handleEditSession}>✎ Edit Session</button>
            {sessionData.isSkipped
              ? <button className="grim-btn is-ghost" onClick={handleUnskip}>▶ Un-skip</button>
              : <button className="grim-btn is-ghost" onClick={handleSkip}>❚❚ Skip</button>
            }
            <button className="grim-btn is-ghost" onClick={handleAdvance}>→ Advance Week</button>
          </div>
        )}
      </header>

      {/* Sealed summons + countdown */}
      <section className="grim-tome is-bordered mb-6.5 p-0 overflow-hidden">
        <div className="grid gap-0" style={{ gridTemplateColumns: "1.15fr 0.85fr" }}>

          {/* Parchment summons */}
          <div className="grim-parchment rounded-none m-0 py-8.5 px-10.5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="grim-mono text-sm tracking-widest-4 text-grim-parchment-eyebrow uppercase">
                  A Writ of Gathering
                </div>
                <div className="font-display text-6xl text-grim-blood leading-none mt-1">
                  {sessionData.isSkipped ? "Session Adjourned" : weekdayLabel}
                </div>
              </div>
              <div className="grim-seal">✦</div>
            </div>

            <p className="font-body text-2xl mt-2.5 mx-0 mb-0" style={{ color: "oklch(0.26 0.03 50)", lineHeight: 1.65 }}>
              {sessionData.isSkipped ? (
                <>The gathering hath been postponed.{sessionData.skipReason && (
                  <> Reason: <b className="font-head">{sessionData.skipReason}</b>.</>
                )}</>
              ) : displayDate ? (
                <>Hark and attend. The fellowship shall convene upon{" "}
                  <b className="font-head">{formatSessionDate(displayDate)}</b>
                  {sessionData.location ? (
                    <>, that the bloody business of <i>{sessionData.location}</i> be carried to its end.</>
                  ) : (
                    <>, that the party&apos;s bloody business be carried to its end.</>
                  )}
                </>
              ) : (
                <>The next session date is yet to be proclaimed. Watch the skies, adventurer.</>
              )}
            </p>

            <div className="flex gap-7.5 mt-6 pt-4 flex-wrap" style={{ borderTop: "1px dashed oklch(0.55 0.08 50 / 0.5)" }}>
              <div>
                <div className="grim-mono text-xs tracking-widest-4 text-grim-parchment-eyebrow uppercase">Game Date</div>
                <div className="font-display text-2xl text-grim-parchment-ink-3 mt-0.75" style={{ lineHeight: 1.2 }}>{currentGameDate ?? "—"}</div>
              </div>
              {sessionData.location && (
                <div>
                  <div className="grim-mono text-xs tracking-widest-4 text-grim-parchment-eyebrow uppercase">Location</div>
                  <div className="font-display text-2xl text-grim-parchment-ink-3 mt-0.75" style={{ lineHeight: 1.2 }}>{sessionData.location}</div>
                </div>
              )}
              {sessionData.lastUpdated && (
                <div>
                  <div className="grim-mono text-xs tracking-widest-4 text-grim-parchment-eyebrow uppercase">Last Updated</div>
                  <div className="font-display text-2xl text-grim-parchment-ink-3 mt-0.75" style={{ lineHeight: 1.2 }}>{sessionData.lastUpdated}</div>
                </div>
              )}
            </div>
          </div>

          {/* Dark countdown */}
          <div className="py-7.5 px-8.5 flex flex-col gap-4.5" style={{ background: "linear-gradient(180deg, oklch(0.16 0.035 290), oklch(0.12 0.030 295))" }}>
            <div className="flex items-center justify-between">
              <div className="grim-h-section m-0">The Vigil Approaches</div>
              <div className="flex items-center gap-1.5">
                {!sessionData.isSkipped && <span className="grim-flame" />}
                <span className={`grim-mono text-sm tracking-widest-2 uppercase ${sessionData.isSkipped ? "text-grim-ink-4" : "text-grim-ember-2"}`}>
                  {sessionData.isSkipped ? "adjourned" : "scheduled"}
                </span>
              </div>
            </div>

            <div className="flex gap-4 items-baseline">
              <div
                className={`font-display text-9xl ${sessionData.isSkipped ? "text-grim-ink-4" : "text-grim-ember-2"}`}
                style={{ lineHeight: 0.8, textShadow: sessionData.isSkipped ? "none" : "0 0 32px oklch(0.72 0.165 48 / 0.5)" }}
              >
                {daysUntilLabel}
              </div>
              <div>
                <div className="font-head text-3xl text-grim-gold tracking-wider">{daysHenceLabel}</div>
                <div className="grim-mono text-sm text-grim-ink-3 tracking-wider-4 mt-0.75">
                  {sessionData.isSkipped
                    ? "no session this week"
                    : daysUntil !== null ? `${pad(countdown.h)}h · ${pad(countdown.m)}m · ${pad(countdown.s)}s` : ""}
                </div>
              </div>
            </div>

            {!sessionData.isSkipped && (
              <div className="grid grid-cols-3 gap-2">
                {([ ["hours", countdown.h], ["min", countdown.m], ["sec", countdown.s] ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="text-center py-2.5 px-0 bg-grim-bg-overlay border border-grim-line">
                    <div className="font-display text-4xl text-grim-gold leading-none">{pad(val)}</div>
                    <div className="grim-mono text-xs tracking-widest-2 text-grim-ink-4 uppercase mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-auto">
              <a
                href="https://azorians-bounty.forge-vtt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="grim-btn is-ember flex-1 justify-center no-underline"
              >
                Begin the Vigil
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Agenda + Notes */}
      <div className="grid grid-cols-2 gap-4.5 mb-6.5">
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Tonight&apos;s Charge</h3>
            <span className="grim-tome-sub">the Master&apos;s intent</span>
          </div>
          {sessionData.agenda ? (
            <p className="grim-flavor text-xl text-grim-ink m-0 border-grim-ember" style={{ lineHeight: 1.65 }}>
              {sessionData.agenda}
            </p>
          ) : (
            <p className="grim-flavor text-xl text-grim-ink-4 m-0 italic">
              The Master&apos;s intent hath not yet been scribed.
            </p>
          )}
        </section>

        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Where We Left the Party</h3>
            <span className="grim-tome-sub">scribed last session</span>
          </div>
          {sessionData.notes ? (
            <>
              <p className="grim-flavor text-xl text-grim-ink-2 m-0" style={{ lineHeight: 1.65 }}>
                {sessionData.notes}
              </p>
              <div className="grim-rule" />
              <div className="flex justify-between items-center">
                {sessionData.lastUpdated && (
                  <span className="grim-label">Last updated · {sessionData.lastUpdated}</span>
                )}
                <Link href="/campaign/recaps" className="grim-link font-head text-base tracking-wider-3 uppercase ml-auto">
                  Read full recap ›
                </Link>
              </div>
            </>
          ) : (
            <p className="grim-flavor text-xl text-grim-ink-4 m-0 italic">
              No notes from last session have been recorded.
            </p>
          )}
        </section>
      </div>

      {/* Ornament divider */}
      <div className="grim-rule-ornament">
        <span className="grim-rule-ornament-glyph">❦</span>
      </div>

      {/* Quick links */}
      <section className="mt-1.5">
        <h2 className="grim-h-section">Threads Within Reach</h2>
        <div className="grid grid-cols-3 gap-3.5">
          {quickLinks.map((s, i) => {
            const sigil = sigilStyle(s.tint);
            return (
            <Link
              key={i}
              href={s.href}
              className="grim-tome p-4.5 no-underline text-inherit cursor-pointer flex gap-3.5 items-center"
            >
              <div className={sigil.className} style={sigil.style}>{s.sigil}</div>
              <div className="flex-1 min-w-0">
                <div className="font-head text-lg tracking-widest uppercase text-grim-ink">{s.title}</div>
                <div className="grim-mono text-sm tracking-wider-2 text-grim-ink-3 uppercase mt-0.75">{s.sub}</div>
              </div>
              <span className="text-grim-ink-4 font-display text-2xl">›</span>
            </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
