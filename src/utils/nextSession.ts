const PACIFIC_TIMEZONE = "America/Los_Angeles";
const SESSION_HOUR = 19; // 7 PM
const SESSION_MINUTE = 0;

export interface NextSessionLike {
  date?: string | null;
  isSkipped?: boolean | null;
}

const MILLIS_PER_MINUTE = 60 * 1000;

function getPacificOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const timeZonePart = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  const match = /GMT([+-]\d{1,2})(?::?(\d{2}))?/.exec(timeZonePart);

  if (!match) {
    return 0;
  }

  const hours = Math.abs(parseInt(match[1], 10));
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const sign = match[1].startsWith("-") ? -1 : 1;

  return sign * (hours * 60 + minutes);
}

function buildPacificDate(year: number, month: number, day: number, hour = SESSION_HOUR, minute = SESSION_MINUTE): Date {
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute);
  const reference = new Date(utcMillis);
  const offsetMinutes = getPacificOffsetMinutes(reference);
  return new Date(utcMillis - offsetMinutes * MILLIS_PER_MINUTE);
}

export function parseSessionDate(raw?: string | Date | null): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return buildPacificDate(year, month, day);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getNextSundayAtPacific(reference: Date = new Date()): Date {
  const pacificNow = new Date(reference.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }));
  const dayOfWeek = pacificNow.getDay();
  let daysUntilSunday = (7 - dayOfWeek) % 7;

  if (daysUntilSunday === 0) {
    const currentHour = pacificNow.getHours();
    const currentMinute = pacificNow.getMinutes();
    if (currentHour > SESSION_HOUR || (currentHour === SESSION_HOUR && currentMinute >= SESSION_MINUTE)) {
      daysUntilSunday = 7;
    }
  }

  const candidate = new Date(pacificNow);
  candidate.setDate(candidate.getDate() + daysUntilSunday);

  const year = candidate.getFullYear();
  const month = candidate.getMonth() + 1;
  const day = candidate.getDate();

  return buildPacificDate(year, month, day);
}

export function determineUpcomingSessionDate(
  data: NextSessionLike | null,
  reference: Date = new Date()
): Date | null {
  if (!data || data.isSkipped) {
    return null;
  }

  const parsed = parseSessionDate(data.date);
  if (parsed && parsed.getTime() >= reference.getTime()) {
    return parsed;
  }

  return getNextSundayAtPacific(reference);
}

export function formatSessionDate(date: Date | null): string {
  if (!date) return "Date TBD";

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)} Pacific`;
}

export function daysUntil(date: Date | null, reference: Date = new Date()): number | null {
  if (!date) return null;
  const diff = date.getTime() - reference.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
