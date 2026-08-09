import { CalendarCategory, CalendarEvent, CalendarMonth } from "@/types/interfaces";

export const AB_OFFSET = 1308; // Tyr'amryn year = AB year + AB_OFFSET

export function yearLabel(abYear: number): string {
  return `AB ${abYear} / T ${abYear + AB_OFFSET}`;
}

export function dayStart(d: number | number[]): number {
  return Array.isArray(d) ? d[0] : d;
}

export function dayEnd(d: number | number[]): number {
  return Array.isArray(d) ? d[d.length - 1] : d;
}

export function getCategoryColor(categoryId: string | null, categories: CalendarCategory[]): string {
  if (!categoryId) return "var(--grim-ink-3)";
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.color || "var(--grim-ink-3)";
}

export function eventSpanInMonth(
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

/** Days-since-epoch ordinal for a (month, day, year) triple, using the campaign's own month lengths — lets events from different months/years be sorted and compared. */
export function ordinalDate(month: number, day: number, year: number, months: CalendarMonth[]): number {
  const yearLength = months.reduce((sum, m) => sum + m.length, 0) || 1;
  const daysBeforeMonth = months.slice(0, month - 1).reduce((sum, m) => sum + m.length, 0);
  return year * yearLength + daysBeforeMonth + day;
}

export function buildDateLabel(event: CalendarEvent, months: { name: string }[]): string {
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
