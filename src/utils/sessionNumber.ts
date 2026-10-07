// Real campaign session numbers. Recaps store `session_number`; recaps without one
// (e.g. newly written ones) count forward from the nearest earlier numbered recap.

export interface NumberedRecap {
  id?: string;
  date: string;
  session_number?: number | null;
}

function byDate<T extends NumberedRecap>(recaps: T[]): T[] {
  return [...recaps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function hasNumber(r: NumberedRecap): r is NumberedRecap & { session_number: number } {
  return typeof r.session_number === 'number' && Number.isFinite(r.session_number);
}

export function sessionNumberFor(recap: NumberedRecap, all: NumberedRecap[]): number | null {
  const sorted = byDate(all);
  const key = (r: NumberedRecap) => r.id ?? r.date;
  const idx = sorted.findIndex(r => key(r) === key(recap));
  if (idx === -1) return null;
  if (hasNumber(sorted[idx])) return sorted[idx].session_number;
  for (let i = idx - 1; i >= 0; i--) {
    const prev = sorted[i];
    if (hasNumber(prev)) return prev.session_number + (idx - i);
  }
  return idx + 1;
}

export function latestSessionNumber(all: NumberedRecap[]): number {
  if (!all.length) return 0;
  const sorted = byDate(all);
  return sessionNumberFor(sorted[sorted.length - 1], sorted) ?? all.length;
}
