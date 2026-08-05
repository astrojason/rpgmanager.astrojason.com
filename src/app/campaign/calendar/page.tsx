"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarData, CalendarEvent, CalendarCategory } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

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

const AB_OFFSET = 1308; // Tyr'amryn year = AB year + AB_OFFSET

function yearLabel(abYear: number): string {
  return `AB ${abYear} / T ${abYear + AB_OFFSET}`;
}

function buildDateLabel(event: CalendarEvent, months: { name: string }[]): string {
  const monthName = months[event.date.month - 1]?.name || `Month ${event.date.month}`;
  const sd = dayStart(event.date.day);
  const ed = dayEnd(event.date.day);
  if (event.end) {
    const endMonthName = months[event.end.month - 1]?.name || `Month ${event.end.month}`;
    const endDay = dayStart(event.end.day);
    if (event.end.month === event.date.month && event.end.year === event.date.year) {
      return `${monthName} ${sd}–${endDay} · ${yearLabel(event.date.year)}`;
    }
    return `${monthName} ${sd} – ${endMonthName} ${endDay} · ${yearLabel(event.date.year)}`;
  }
  if (ed !== sd) return `${monthName} ${sd}–${ed} · ${yearLabel(event.date.year)}`;
  return `${monthName} ${sd} · ${yearLabel(event.date.year)}`;
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
  const [viewYear, setViewYear] = useState<number>(427);
  const [viewMonth, setViewMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateForm, setDateForm] = useState({ day: 0, month: 0, year: 0 });
  const [savingDate, setSavingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: calendarData = null, isPending: loading } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: () => authFetch('/api/data/calendar').then(r => r.ok ? r.json() : null),
  });

  useEffect(() => {
    if (calendarData?.current) {
      setViewYear(calendarData.current.year);
      setViewMonth(calendarData.current.month);
      setSelectedDay(calendarData.current.day);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarData?.current?.year, calendarData?.current?.month, calendarData?.current?.day]);

  const handleSaveCurrentDate = async () => {
    if (!calendarData) return;
    setSavingDate(true);
    setDateError(null);
    try {
      const res = await authFetch('/api/data/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...calendarData, current: dateForm }),
      });
      if (!res.ok) throw new Error(`Failed to save date (${res.status})`);
      await queryClient.invalidateQueries({ queryKey: ['/api/data/calendar'] });
      setEditingDate(false);
    } catch (e) {
      setDateError(toErrorMessage(e));
    } finally {
      setSavingDate(false);
    }
  };

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
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="pt-9 px-14 pb-20">
        <div className="text-grim-blood-2 font-mono text-base">
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
  const prevMonthName = months[viewMonth === 1 ? months.length - 1 : viewMonth - 2]?.name || "";
  const nextMonthName = months[viewMonth === months.length ? 0 : viewMonth]?.name || "";

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2">
          codex / the reckoning / {monthName.toLowerCase()}
        </div>
        <div className="flex gap-2.5 items-center">
          <span className="grim-flame w-1.5 h-1.5" />
          <span className="grim-mono text-sm tracking-wider-3 text-grim-ink-2 uppercase">
            Now · {curWeekdayName}, {curMonthName} {initialCurrent.day} · {yearLabel(initialCurrent.year)}
          </span>
          {isAdmin && !editingDate && (
            <button
              className="grim-btn is-ghost py-1 px-2.5 text-sm"
              onClick={() => { setDateForm({ ...initialCurrent }); setEditingDate(true); }}
            >
              ✎ Set Date
            </button>
          )}
        </div>
      </div>

      {/* Admin: set current date */}
      {isAdmin && editingDate && (
        <div className="grim-tome mb-5 py-4 px-5">
          {dateError && <ErrorBlock error={dateError} onDismiss={() => setDateError(null)} />}
          <div className="grim-label mb-2.5">Set Current In-Game Date</div>
          <div className="flex gap-3 items-center flex-wrap">
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">DAY</div>
              <input
                type="number" min={1} max={60}
                value={dateForm.day}
                onChange={e => setDateForm(f => ({ ...f, day: Number(e.target.value) }))}
                className="w-16 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">MONTH</div>
              <select
                value={dateForm.month}
                onChange={e => setDateForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-body text-lg py-1.5 px-2.5 outline-none"
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">YEAR (AB)</div>
              <input
                type="number" min={1}
                value={dateForm.year}
                onChange={e => setDateForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-20 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div>
              <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 mb-1">YEAR (T)</div>
              <input
                type="number" min={AB_OFFSET + 1}
                value={dateForm.year ? dateForm.year + AB_OFFSET : ""}
                onChange={e => setDateForm(f => ({ ...f, year: Number(e.target.value) - AB_OFFSET }))}
                className="w-22.5 bg-grim-bg-4 border border-grim-line-2 text-grim-ink font-display text-2xl py-1.5 px-2.5 outline-none"
              />
            </div>
            <div className="flex gap-2 self-end pb-0.5">
              <button className="grim-btn is-ghost" onClick={() => setEditingDate(false)}>Cancel</button>
              <button className="grim-btn is-ember" onClick={handleSaveCurrentDate} disabled={savingDate}>
                {savingDate ? "Saving…" : "Save Date"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-5.5">
        <div>
          <div className="grim-page-eyebrow">The Reckoning · Calendar of the Bounty</div>
          <h1 className="grim-page-title text-8xl mb-1">{monthName}</h1>
          <div className="grim-page-sub mb-0">
            The <b className="text-grim-gold-2">{moonOrdinal} moon</b> · AB {viewYear} / T {viewYear + AB_OFFSET} · {daysInMonth} days, {tendayCount} {tendayCount === 1 ? "tenday" : "tendays"}
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex gap-1.5 shrink-0 pb-2">
          <button className="grim-btn is-ghost py-2 px-2.5" onClick={() => setViewYear((y) => y - 1)} title="Previous year">«</button>
          <button className="grim-btn is-ghost py-2 px-2.5" onClick={goToPrevMonth} title="Previous month">‹ {prevMonthName}</button>
          <div
            className="font-head text-lg tracking-widest uppercase text-grim-gold px-2.5 py-0 min-w-40 text-center flex flex-col items-center justify-center"
            style={{ lineHeight: 1.3 }}
          >
            <span>{monthName}</span>
            <span className="grim-mono text-xs tracking-wider-3 text-grim-ink-3 mt-0.5">{yearLabel(viewYear)}</span>
          </div>
          <button className="grim-btn is-ghost py-2 px-2.5" onClick={goToNextMonth} title="Next month">{nextMonthName} ›</button>
          <button className="grim-btn is-ghost py-2 px-2.5" onClick={() => setViewYear((y) => y + 1)} title="Next year">»</button>
        </div>
      </div>

      {/* Month-long ribbons */}
      {monthLongEvents.map((e, i) => {
        const color = getCategoryColor(e.event.category, categories);
        const cat = categories.find((c) => c.id === e.event.category);
        return (
          <div
            key={i}
            className="flex items-center gap-3 mb-4.5 py-2.5 px-4"
            style={{
              background: "linear-gradient(90deg, oklch(0.40 0.16 22 / 0.22), oklch(0.40 0.16 22 / 0.04) 70%, transparent)",
              border: "1px solid oklch(0.52 0.180 22 / 0.5)",
              borderLeft: `3px solid ${color}`,
            }}
          >
            <span className="grim-mono text-xs tracking-widest-3 uppercase shrink-0" style={{ color }}>all moon ▸</span>
            <span className="font-head text-xl text-grim-ink tracking-wide">{e.event.name}</span>
            {cat && (
              <span className="grim-chip shrink-0" style={{ color, borderColor: `${color}88` }}>{cat.name}</span>
            )}
            <span className="text-lg text-grim-ink-3 flex-1 min-w-0 truncate">
              {e.event.description}
            </span>
          </div>
        );
      })}

      {/* Grid + selected-day rail */}
      <div className="grid items-start gap-5.5 mb-7.5" style={{ gridTemplateColumns: "1fr 320px" }}>

        {/* Calendar tome */}
        <section className="grim-tome py-5.5 px-6">
          {/* Weekday header */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `46px repeat(${colCount}, 1fr)` }}>
            <div />
            {weekdays.map((wd, i) => (
              <div
                key={i}
                className="grim-mono text-xs tracking-wider text-grim-ink-4 text-center uppercase pb-2 border-b border-grim-line"
              >
                {wd.name}
              </div>
            ))}
          </div>

          {/* Tenday rows */}
          <div className="grim-stack gap-1">
            {tendayWeeks.map((week, row) => (
              <div key={row} className="grid gap-1" style={{ gridTemplateColumns: `46px repeat(${colCount}, 1fr)` }}>
                <div className="flex items-center justify-center border-r border-grim-line">
                  <span className="grim-mono text-xs text-grim-ink-4 tracking-widest">
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
                      className={`h-19.5 py-2 px-2.25 flex flex-col items-start justify-between cursor-pointer text-left font-display relative border ${isSel && !isToday ? "border-grim-gold" : "border-grim-line"}`}
                      style={{
                        color: isToday ? "oklch(0.18 0.03 40)" : "var(--grim-ink-2)",
                        background: isToday
                          ? "radial-gradient(circle at 50% 35%, var(--grim-ember-2), var(--grim-ember) 90%)"
                          : "oklch(0.14 0.025 290 / 0.55)",
                        boxShadow: isToday
                          ? "0 0 16px oklch(0.72 0.165 48 / 0.45)"
                          : isSel ? "0 0 0 1px var(--grim-gold) inset" : "none",
                        borderRadius: 1,
                      }}
                    >
                      <span className={`text-2xl leading-none ${isToday ? "opacity-100" : "opacity-90"}`}>{day}</span>
                      {dots.length > 0 && (
                        <span className="flex gap-0.75">
                          {dots.map((c, k) => (
                            <span key={k} className="w-1.25 h-1.25 rounded-full" style={{ background: c, boxShadow: `0 0 5px ${c}` }} />
                          ))}
                        </span>
                      )}
                      {isToday && (
                        <span className="grim-mono absolute top-2 right-2 text-xs tracking-wider-2 uppercase" style={{ color: "oklch(0.20 0.03 40)" }}>
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
                    className="h-19.5 bg-grim-bg-overlay/20 border border-grim-line"
                    style={{ borderRadius: 1 }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          {categories.length > 0 && (
            <>
              <div className="grim-rule" />
              <div className="flex gap-4.5 flex-wrap items-center">
                <div className="flex items-center gap-1.75">
                  <span className="w-2.25 h-2.25 rounded-full" style={{ background: "radial-gradient(circle, var(--grim-ember-2), var(--grim-ember))", boxShadow: "0 0 5px var(--grim-ember)" }} />
                  <span className="grim-mono text-xs tracking-wider-2 text-grim-ink-3 uppercase">Today</span>
                </div>
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1.75">
                    <span className="w-2.25 h-2.25 rounded-full" style={{ background: cat.color, boxShadow: `0 0 5px ${cat.color}` }} />
                    <span className="grim-mono text-xs tracking-wider-2 text-grim-ink-3 uppercase">{cat.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Selected-day rail */}
        <section className="grim-tome py-5.5 px-6">
          <div className="grim-tome-head mb-3.5">
            <h3 className="grim-tome-title text-xl">The Chosen Day</h3>
          </div>
          {selectedDay !== null ? (
            <>
              <div
                className={`font-display text-7xl ${isCurrentDay(selectedDay) ? "text-grim-ember-2" : "text-grim-gold"}`}
                style={{ lineHeight: 0.9 }}
              >
                {selectedDay}
              </div>
              <div className="font-head text-lg tracking-wider text-grim-ink-2 mt-1">
                {selWeekdayName} · {selTenday}
              </div>
              <div className="grim-mono text-sm tracking-wider-3 text-grim-ink-4 uppercase mt-0.75">
                {monthName} {selectedDay} · {yearLabel(viewYear)}{isCurrentDay(selectedDay) ? " · present" : ""}
              </div>

              <div className="grim-rule" />

              <div className="grim-label mb-2.5">Observances</div>
              {selectedDayEvents.length === 0 ? (
                <div className="text-lg text-grim-ink-4 italic">
                  A quiet day. Nothing is written.
                </div>
              ) : (
                <div className="grim-stack gap-2.5">
                  {selectedDayEvents.map((e, i) => {
                    const color = getCategoryColor(e.event.category, categories);
                    const cat = categories.find((c) => c.id === e.event.category);
                    return (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="w-1.75 h-1.75 rounded-full mt-1.5 shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                        <div>
                          <div className="font-head text-lg text-grim-ink tracking-wide">{e.event.name}</div>
                          {cat && (
                            <div className="grim-mono text-xs tracking-widest text-grim-ink-3 uppercase mt-0.25">{cat.name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-lg text-grim-ink-4 italic">
              Select a day to consult the record.
            </div>
          )}
        </section>
      </div>

      {/* Chronicle of events */}
      {monthEvents.length > 0 && (
        <>
          <div className="grim-tome-head mb-4.5">
            <h3 className="grim-tome-title">Observances of the Moon</h3>
            <span className="grim-tome-sub">festivals &amp; holy days of {monthName}</span>
          </div>

          <div className="grid grid-cols-2 gap-4.5">
            {monthEvents.map((e, i) => {
              const color = getCategoryColor(e.event.category, categories);
              const cat = categories.find((c) => c.id === e.event.category);
              const dateLabel = buildDateLabel(e.event, months);
              return (
                <section key={i} className="grim-tome py-5 px-6" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="font-head text-3xl text-grim-gold tracking-wide m-0" style={{ lineHeight: 1.05 }}>{e.event.name}</h4>
                      <div className="grim-mono text-sm tracking-wider-2 text-grim-ink-3 uppercase mt-1.5">{dateLabel}</div>
                    </div>
                    {cat && (
                      <span className="grim-chip shrink-0" style={{ color, borderColor: `${color}88` }}>✦ {cat.name}</span>
                    )}
                  </div>
                  <p className="mt-2.5 mx-0 mb-0 text-xl text-grim-ink-2" style={{ lineHeight: 1.55 }}>{e.event.description}</p>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Ornament */}
      <div className="grim-rule-ornament mt-9 mx-0 mb-0 text-center">
        <span className="grim-rule-ornament-glyph">❦</span>
      </div>

    </div>
  );
}
