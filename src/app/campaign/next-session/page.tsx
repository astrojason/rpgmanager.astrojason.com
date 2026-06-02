"use client";

import { useState, useEffect, useMemo } from "react";
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

function sigilStyle(tint: string): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 46, height: 46, flexShrink: 0, borderRadius: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-display)", fontSize: 28,
    color: "oklch(0.92 0.05 70)",
  };
  if (tint === "ember") return { ...base, background: "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))", border: "1px solid var(--grim-ember)" };
  if (tint === "arcane") return { ...base, background: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))", border: "1px solid var(--grim-arcane)" };
  return { ...base, background: "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))", border: "1px solid var(--grim-gold-2)" };
}

const QUICK_LINKS = [
  { sigil: "☾", title: "Last Session Recap", sub: "A Desperate Flight",   tint: "gold",   href: "/campaign/recaps" },
  { sigil: "⚔", title: "Player Characters",  sub: "The fellowship",        tint: "ember",  href: "/campaign/pcs" },
  { sigil: "✠", title: "Campaign Calendar",  sub: "Miriandar · 4th moon", tint: "arcane", href: "/campaign/calendar" },
];

export default function NextSessionPage() {
  const [sessionData, setSessionData] = useState<NextSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<Countdown>({ h: 0, m: 0, s: 0 });
  const isAdmin = useIsAdmin();

  const storedSessionDate = useMemo(() => parseSessionDate(sessionData?.date), [sessionData?.date]);
  const upcomingSessionDate = useMemo(
    () => determineUpcomingSessionDate(sessionData, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionData]
  );
  const daysUntil = useMemo(() => calculateDaysUntil(upcomingSessionDate, new Date()), [upcomingSessionDate]);

  useEffect(() => {
    authFetch("/api/data/next-session")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSessionData(d); })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

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
    const agenda = prompt("Edit session agenda:", sessionData.agenda || "");
    if (agenda === null) return;
    const notes = prompt("Edit session notes:", sessionData.notes || "");
    if (notes === null) return;
    const updated = { ...sessionData, agenda, notes, lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) setSessionData(updated);
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleSkip = async () => {
    if (!sessionData) return;
    const reason = prompt("Reason for skipping (optional):", sessionData.skipReason || "");
    if (reason === null) return;
    const updated = { ...sessionData, isSkipped: true, skipReason: reason, lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) setSessionData(updated);
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleUnskip = async () => {
    if (!sessionData) return;
    const updated = { ...sessionData, isSkipped: false, skipReason: "", lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) setSessionData(updated);
    } catch (e) { setError(toErrorMessage(e)); }
  };

  const handleAdvance = async () => {
    if (!sessionData) return;
    const current = new Date(sessionData.date);
    current.setDate(current.getDate() + 7);
    const updated = { ...sessionData, date: current.toISOString().split("T")[0], isSkipped: false, skipReason: "", lastUpdated: new Date().toISOString().split("T")[0] };
    try {
      const r = await authFetch("/api/data/next-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      if (r.ok) setSessionData(updated);
    } catch (e) { setError(toErrorMessage(e)); }
  };

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Loading the summons&hellip;
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
        <div style={{ fontFamily: "var(--font-head)", fontSize: 18, color: "var(--grim-blood-2)", letterSpacing: ".08em" }}>
          The summons could not be retrieved.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {/* Masthead */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <div className="grim-page-eyebrow">By Order of the Master</div>
          <h1 className="grim-page-title" style={{ fontSize: 60 }}>The Summoning</h1>
          <p className="grim-page-sub">The party is bid to gather. The candles are lit; the dice await their casting.</p>
        </div>
        {isAdmin && (
          <div className="grim-row" style={{ gap: 8, paddingBottom: 6 }}>
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
      <section className="grim-tome is-bordered" style={{ marginBottom: 26, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 0 }}>

          {/* Parchment summons */}
          <div className="grim-parchment" style={{ borderRadius: 0, margin: 0, padding: "34px 42px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>
                  A Writ of Gathering
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 46, color: "var(--grim-blood)", lineHeight: 1, marginTop: 4 }}>
                  {sessionData.isSkipped ? "Session Adjourned" : weekdayLabel}
                </div>
              </div>
              <div className="grim-seal">✦</div>
            </div>

            <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "oklch(0.26 0.03 50)", lineHeight: 1.65, margin: "10px 0 0" }}>
              {sessionData.isSkipped ? (
                <>The gathering hath been postponed.{sessionData.skipReason && (
                  <> Reason: <b style={{ fontFamily: "var(--font-head)" }}>{sessionData.skipReason}</b>.</>
                )}</>
              ) : displayDate ? (
                <>Hark and attend. The fellowship shall convene upon{" "}
                  <b style={{ fontFamily: "var(--font-head)" }}>{formatSessionDate(displayDate)}</b>,
                  that the bloody business of Sandhaven be carried to its end.
                </>
              ) : (
                <>The next session date is yet to be proclaimed. Watch the skies, adventurer.</>
              )}
            </p>

            <div style={{ display: "flex", gap: 30, marginTop: 24, paddingTop: 16, borderTop: "1px dashed oklch(0.55 0.08 50 / 0.5)", flexWrap: "wrap" }}>
              <div>
                <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Game Date</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "oklch(0.25 0.03 40)", lineHeight: 1.2, marginTop: 3 }}>{sessionData.currentGameDate}</div>
              </div>
              {sessionData.location && (
                <div>
                  <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Location</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "oklch(0.25 0.03 40)", lineHeight: 1.2, marginTop: 3 }}>{sessionData.location}</div>
                </div>
              )}
              {sessionData.lastUpdated && (
                <div>
                  <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "oklch(0.40 0.08 30)", textTransform: "uppercase" }}>Last Updated</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "oklch(0.25 0.03 40)", lineHeight: 1.2, marginTop: 3 }}>{sessionData.lastUpdated}</div>
                </div>
              )}
            </div>
          </div>

          {/* Dark countdown */}
          <div style={{ padding: "30px 34px", display: "flex", flexDirection: "column", gap: 18, background: "linear-gradient(180deg, oklch(0.16 0.035 290), oklch(0.12 0.030 295))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="grim-h-section" style={{ margin: 0 }}>The Vigil Approaches</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!sessionData.isSkipped && <span className="grim-flame" />}
                <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: sessionData.isSkipped ? "var(--grim-ink-4)" : "var(--grim-ember-2)", textTransform: "uppercase" }}>
                  {sessionData.isSkipped ? "adjourned" : "scheduled"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 110,
                color: sessionData.isSkipped ? "var(--grim-ink-4)" : "var(--grim-ember-2)",
                lineHeight: 0.8,
                textShadow: sessionData.isSkipped ? "none" : "0 0 32px oklch(0.72 0.165 48 / 0.5)",
              }}>
                {daysUntilLabel}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--grim-gold)", letterSpacing: ".06em" }}>{daysHenceLabel}</div>
                <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".16em", marginTop: 3 }}>
                  {sessionData.isSkipped
                    ? "no session this week"
                    : daysUntil !== null ? `${pad(countdown.h)}h · ${pad(countdown.m)}m · ${pad(countdown.s)}s` : ""}
                </div>
              </div>
            </div>

            {!sessionData.isSkipped && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {([ ["hours", countdown.h], ["min", countdown.m], ["sec", countdown.s] ] as [string, number][]).map(([label, val]) => (
                  <div key={label} style={{ textAlign: "center", padding: "10px 0", background: "oklch(0.12 0.025 290)", border: "1px solid var(--grim-line)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-gold)", lineHeight: 1 }}>{pad(val)}</div>
                    <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <a
                href="https://azorians-bounty.forge-vtt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="grim-btn is-ember"
                style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
              >
                Begin the Vigil
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Agenda + Notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 26 }}>
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Tonight&apos;s Charge</h3>
            <span className="grim-tome-sub">the Master&apos;s intent</span>
          </div>
          {sessionData.agenda ? (
            <p className="grim-flavor" style={{ fontSize: 16, lineHeight: 1.65, color: "var(--grim-ink)", margin: 0, borderColor: "var(--grim-ember)" }}>
              {sessionData.agenda}
            </p>
          ) : (
            <p className="grim-flavor" style={{ fontSize: 15, color: "var(--grim-ink-4)", margin: 0, fontStyle: "italic" }}>
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
              <p className="grim-flavor" style={{ fontSize: 15, lineHeight: 1.65, color: "var(--grim-ink-2)", margin: 0 }}>
                {sessionData.notes}
              </p>
              <div className="grim-rule" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {sessionData.lastUpdated && (
                  <span className="grim-label">Last updated · {sessionData.lastUpdated}</span>
                )}
                <Link href="/campaign/recaps" className="grim-link" style={{ fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", marginLeft: "auto" }}>
                  Read full recap ›
                </Link>
              </div>
            </>
          ) : (
            <p className="grim-flavor" style={{ fontSize: 15, color: "var(--grim-ink-4)", margin: 0, fontStyle: "italic" }}>
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
      <section style={{ marginTop: 6 }}>
        <h2 className="grim-h-section">Threads Within Reach</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {QUICK_LINKS.map((s, i) => (
            <Link
              key={i}
              href={s.href}
              className="grim-tome"
              style={{ padding: "18px", textDecoration: "none", color: "inherit", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}
            >
              <div style={sigilStyle(s.tint)}>{s.sigil}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink)" }}>{s.title}</div>
                <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 3 }}>{s.sub}</div>
              </div>
              <span style={{ color: "var(--grim-ink-4)", fontFamily: "var(--font-display)", fontSize: 18 }}>›</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
