"use client";

import { useState, useEffect, useMemo } from "react";
import { CalendarData, CalendarEvent, CalendarCategory } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { usePageTracking } from "@/utils/referrerTracking";

function dayStart(d: number | number[]): number {
  return Array.isArray(d) ? d[0] : d;
}

function dayEnd(d: number | number[]): number {
  return Array.isArray(d) ? d[d.length - 1] : d;
}

function eventSpanInMonth(
  event: CalendarEvent,
  month: number,
  year: number,
  daysInMonth: number
): [number, number] | null {
  const sm = event.date.month;
  const sy = event.date.year;
  const sd = dayStart(event.date.day);
  const em = event.end ? event.end.month : sm;
  const ey = event.end ? event.end.year : sy;
  const ed = event.end ? dayStart(event.end.day) : dayEnd(event.date.day);

  const startsBeforeOrIn = sy < year || (sy === year && sm <= month);
  const endsAfterOrIn = ey > year || (ey === year && em >= month);
  if (!startsBeforeOrIn || !endsAfterOrIn) return null;

  const inStart = sy === year && sm === month ? sd : 1;
  const inEnd = ey === year && em === month ? ed : daysInMonth;
  return [inStart, inEnd];
}

function getCategoryColor(categoryId: string | null, categories: CalendarCategory[]): string {
  if (!categoryId) return "var(--grim-ink-3)";
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.color || "var(--grim-ink-3)";
}

function buildDateLabel(event: CalendarEvent, months: { name: string }[]): string {
  const monthName = months[event.date.month - 1]?.name || `Month ${event.date.month}`;
  const sd = dayStart(event.date.day);
  const ed = dayEnd(event.date.day);
  if (event.end) {
    const endMonthName = months[event.end.month - 1]?.name || `Month ${event.end.month}`;
    const endDay = dayStart(event.end.day);
    if (event.end.month === event.date.month && event.end.year === event.date.year) {
      return `${monthName} ${sd}–${endDay} · Year ${event.date.year}`;
    }
    return `${monthName} ${sd} – ${endMonthName} ${endDay} · Year ${event.date.year}`;
  }
  if (ed !== sd) return `${monthName} ${sd}–${ed} · Year ${event.date.year}`;
  return `${monthName} ${sd} · Year ${event.date.year}`;
}

const TENDAY_LABELS = ["I", "II", "III", "IV", "V"];
const TENDAY_NAMES = [
  "Tenday the First",
  "Tenday the Second",
  "Tenday the Third",
  "Tenday the Fourth",
  "Tenday the Fifth",
];
const MOON_ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth",
  "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  "Eleventh", "Twelfth",
];

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState<number>(427);
  const [viewMonth, setViewMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  usePageTracking();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch("/api/data/calendar");
        if (res.ok) {
          const data = await res.json();
          setCalendarData(data);
          if (data.current) {
            setViewYear(data.current.year);
            setViewMonth(data.current.month);
            setSelectedDay(data.current.day);
          }
        }
      } catch (e) {
        console.error("Error loading calendar:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Must be before early returns to satisfy Rules of Hooks
  const monthEvents = useMemo(() => {
    if (!calendarData) return [];
    const { events, static: staticData } = calendarData;
    const months = staticData.months;
    const weekdays = staticData.weekdays;
    const colCount = weekdays.length || 10;
    const daysInMonth = months[viewMonth - 1]?.length || 40;
    return events
      .filter((e) => !e.dmOnly)
      .map((e) => {
        const span = eventSpanInMonth(e, viewMonth, viewYear, daysInMonth);
        if (!span) return null;
        return { event: e, span, monthLong: span[0] === 1 && span[1] === daysInMonth };
      })
      .filter(Boolean) as { event: CalendarEvent; span: [number, number]; monthLong: boolean }[];
  }, [calendarData, viewMonth, viewYear]);

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div style={{ padding: "36px 56px 80px" }}>
        <div style={{ color: "var(--grim-blood-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Calendar data unavailable.
        </div>
      </div>
    );
  }

  const { current: initialCurrent, static: staticData, events, categories } = calendarData;
  const months = staticData.months;
  const weekdays = staticData.weekdays;
  const colCount = weekdays.length || 10;

  const currentMonthData = months[viewMonth - 1];
  const daysInMonth = currentMonthData?.length || 40;
  const monthName = currentMonthData?.name || `Month ${viewMonth}`;

  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(months.length); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === months.length) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isCurrentDay = (day: number) =>
    viewYear === initialCurrent.year &&
    viewMonth === initialCurrent.month &&
    day === initialCurrent.day;

  function dotsForDay(day: number) {
    return monthEvents
      .filter((e) => !e.monthLong && day >= e.span[0] && day <= e.span[1])
      .map((e) => getCategoryColor(e.event.category, categories));
  }

  const selectedDayEvents =
    selectedDay !== null
      ? monthEvents.filter((e) => selectedDay >= e.span[0] && selectedDay <= e.span[1])
      : [];

  const monthLongEvents = monthEvents.filter((e) => e.monthLong);

  const tendayWeeks: number[][] = [];
  for (let i = 1; i <= daysInMonth; i += colCount) {
    tendayWeeks.push(
      Array.from({ length: Math.min(colCount, daysInMonth - i + 1) }, (_, j) => i + j)
    );
  }

  const curMonthName = months[initialCurrent.month - 1]?.name || "";
  const curWeekdayName = weekdays[(initialCurrent.day - 1) % colCount]?.name || "";

  const selWeekdayName =
    selectedDay !== null ? weekdays[(selectedDay - 1) % colCount]?.name || "" : "";
  const selTenday =
    selectedDay !== null
      ? TENDAY_NAMES[Math.floor((selectedDay - 1) / colCount)] || ""
      : "";

  const moonOrdinal = MOON_ORDINALS[viewMonth - 1] || `${viewMonth}th`;
  const tendayCount = tendayWeeks.length;

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
          codex / the reckoning / {monthName.toLowerCase()}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="grim-flame" style={{ width: 6, height: 6 }} />
          <span className="grim-mono" style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--grim-ink-2)", textTransform: "uppercase" }}>
            Now · {curWeekdayName}, {curMonthName} {initialCurrent.day}, Yr {initialCurrent.year}
          </span>
        </div>
      </div>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 22 }}>
        <div>
          <div className="grim-page-eyebrow">The Reckoning · Calendar of the Bounty</div>
          <h1 className="grim-page-title" style={{ fontSize: 78, marginBottom: 4 }}>{monthName}</h1>
          <div className="grim-page-sub" style={{ marginBottom: 0 }}>
            The <b style={{ color: "var(--grim-gold-2)" }}>{moonOrdinal} moon</b> of the year {viewYear} · {daysInMonth} days, {tendayCount} {tendayCount === 1 ? "tenday" : "tendays"}
          </div>
        </div>

        {/* Month navigation */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingBottom: 8 }}>
          <button className="grim-btn is-ghost" style={{ padding: "8px 10px" }} onClick={() => setViewYear((y) => y - 1)} title="Previous year">«</button>
          <button className="grim-btn is-ghost" style={{ padding: "8px 10px" }} onClick={goToPrevMonth} title="Previous moon">‹ Moon</button>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--grim-gold)", padding: "0 10px", minWidth: 128, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {monthName} · {viewYear}
          </div>
          <button className="grim-btn is-ghost" style={{ padding: "8px 10px" }} onClick={goToNextMonth} title="Next moon">Moon ›</button>
          <button className="grim-btn is-ghost" style={{ padding: "8px 10px" }} onClick={() => setViewYear((y) => y + 1)} title="Next year">»</button>
        </div>
      </div>

      {/* Month-long ribbons */}
      {monthLongEvents.map((e, i) => {
        const color = getCategoryColor(e.event.category, categories);
        const cat = categories.find((c) => c.id === e.event.category);
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
              padding: "10px 16px",
              background: "linear-gradient(90deg, oklch(0.40 0.16 22 / 0.22), oklch(0.40 0.16 22 / 0.04) 70%, transparent)",
              border: "1px solid oklch(0.52 0.180 22 / 0.5)",
              borderLeft: `3px solid ${color}`,
            }}
          >
            <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".2em", color, textTransform: "uppercase", flexShrink: 0 }}>all moon ▸</span>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--grim-ink)", letterSpacing: ".03em" }}>{e.event.name}</span>
            {cat && (
              <span className="grim-chip" style={{ flexShrink: 0, color, borderColor: `${color}88` }}>{cat.name}</span>
            )}
            <span style={{ fontSize: 13, color: "var(--grim-ink-3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.event.description}
            </span>
          </div>
        );
      })}

      {/* Grid + selected-day rail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start", marginBottom: 30 }}>

        {/* Calendar tome */}
        <section className="grim-tome" style={{ padding: "22px 24px" }}>
          {/* Weekday header */}
          <div style={{ display: "grid", gridTemplateColumns: `46px repeat(${colCount}, 1fr)`, gap: 4, marginBottom: 8 }}>
            <div />
            {weekdays.map((wd, i) => (
              <div
                key={i}
                className="grim-mono"
                style={{ fontSize: 9, letterSpacing: ".06em", color: "var(--grim-ink-4)", textAlign: "center", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid var(--grim-line)" }}
              >
                {wd.name}
              </div>
            ))}
          </div>

          {/* Tenday rows */}
          <div className="grim-stack" style={{ gap: 4 }}>
            {tendayWeeks.map((week, row) => (
              <div key={row} style={{ display: "grid", gridTemplateColumns: `46px repeat(${colCount}, 1fr)`, gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--grim-line)" }}>
                  <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".1em" }}>
                    {TENDAY_LABELS[row]}
                  </span>
                </div>
                {week.map((day) => {
                  const isToday = isCurrentDay(day);
                  const isSel = day === selectedDay;
                  const dots = dotsForDay(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      style={{
                        height: 78, padding: "8px 9px",
                        display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between",
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "var(--font-display)",
                        color: isToday ? "oklch(0.18 0.03 40)" : "var(--grim-ink-2)",
                        background: isToday
                          ? "radial-gradient(circle at 50% 35%, var(--grim-ember-2), var(--grim-ember) 90%)"
                          : "oklch(0.14 0.025 290 / 0.55)",
                        border: isSel && !isToday ? "1px solid var(--grim-gold)" : "1px solid var(--grim-line)",
                        boxShadow: isToday
                          ? "0 0 16px oklch(0.72 0.165 48 / 0.45)"
                          : isSel ? "0 0 0 1px var(--grim-gold) inset" : "none",
                        borderRadius: 1, position: "relative",
                      }}
                    >
                      <span style={{ fontSize: 20, lineHeight: 1, opacity: isToday ? 1 : 0.92 }}>{day}</span>
                      {dots.length > 0 && (
                        <span style={{ display: "flex", gap: 3 }}>
                          {dots.map((c, k) => (
                            <span key={k} style={{ width: 5, height: 5, borderRadius: "50%", background: c, boxShadow: `0 0 5px ${c}` }} />
                          ))}
                        </span>
                      )}
                      {isToday && (
                        <span className="grim-mono" style={{ position: "absolute", top: 8, right: 8, fontSize: 7.5, letterSpacing: ".12em", color: "oklch(0.20 0.03 40)", textTransform: "uppercase" }}>
                          now
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Empty cells for short final tenday */}
                {Array.from({ length: colCount - week.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{ height: 78, background: "oklch(0.14 0.025 290 / 0.20)", border: "1px solid var(--grim-line)", borderRadius: 1 }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          {categories.length > 0 && (
            <>
              <div className="grim-rule" />
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "radial-gradient(circle, var(--grim-ember-2), var(--grim-ember))", boxShadow: "0 0 5px var(--grim-ember)" }} />
                  <span className="grim-mono" style={{ fontSize: 9.5, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>Today</span>
                </div>
                {categories.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, boxShadow: `0 0 5px ${cat.color}` }} />
                    <span className="grim-mono" style={{ fontSize: 9.5, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Selected-day rail */}
        <section className="grim-tome" style={{ padding: "22px 24px" }}>
          <div className="grim-tome-head" style={{ marginBottom: 14 }}>
            <h3 className="grim-tome-title" style={{ fontSize: 15 }}>The Chosen Day</h3>
          </div>
          {selectedDay !== null ? (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 60, color: isCurrentDay(selectedDay) ? "var(--grim-ember-2)" : "var(--grim-gold)", lineHeight: 0.9 }}>
                {selectedDay}
              </div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".06em", color: "var(--grim-ink-2)", marginTop: 4 }}>
                {selWeekdayName} · {selTenday}
              </div>
              <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 3 }}>
                {monthName} {selectedDay} · Year {viewYear}{isCurrentDay(selectedDay) ? " · present" : ""}
              </div>

              <div className="grim-rule" />

              <div className="grim-label" style={{ marginBottom: 10 }}>Observances</div>
              {selectedDayEvents.length === 0 ? (
                <div style={{ fontSize: 14, color: "var(--grim-ink-4)", fontStyle: "italic" }}>
                  A quiet day. Nothing is written.
                </div>
              ) : (
                <div className="grim-stack" style={{ gap: 10 }}>
                  {selectedDayEvents.map((e, i) => {
                    const color = getCategoryColor(e.event.category, categories);
                    const cat = categories.find((c) => c.id === e.event.category);
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", marginTop: 6, background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{e.event.name}</div>
                          {cat && (
                            <div className="grim-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 1 }}>{cat.name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 14, color: "var(--grim-ink-4)", fontStyle: "italic" }}>
              Select a day to consult the record.
            </div>
          )}
        </section>
      </div>

      {/* Chronicle of events */}
      {monthEvents.length > 0 && (
        <>
          <div className="grim-tome-head" style={{ marginBottom: 18 }}>
            <h3 className="grim-tome-title">Observances of the Moon</h3>
            <span className="grim-tome-sub">festivals &amp; holy days of {monthName}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {monthEvents.map((e, i) => {
              const color = getCategoryColor(e.event.category, categories);
              const cat = categories.find((c) => c.id === e.event.category);
              const dateLabel = buildDateLabel(e.event, months);
              return (
                <section key={i} className="grim-tome" style={{ padding: "20px 24px", borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <div>
                      <h4 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--grim-gold)", letterSpacing: ".02em", margin: 0, lineHeight: 1.05 }}>{e.event.name}</h4>
                      <div className="grim-mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 6 }}>{dateLabel}</div>
                    </div>
                    {cat && (
                      <span className="grim-chip" style={{ flexShrink: 0, color, borderColor: `${color}88` }}>✦ {cat.name}</span>
                    )}
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--grim-ink-2)" }}>{e.event.description}</p>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Ornament */}
      <div className="grim-rule-ornament" style={{ margin: "36px 0 0", textAlign: "center" }}>
        <span className="grim-rule-ornament-glyph">❦</span>
      </div>

    </div>
  );
}
