import { describe, expect, it } from 'vitest';
import { latestSessionNumber, sessionNumberFor } from '@/utils/sessionNumber';

const r = (id: string, date: string, session_number?: number | null) => ({ id, date, session_number });

describe('latestSessionNumber', () => {
  it('returns the highest stored session number', () => {
    expect(latestSessionNumber([r('1', '2026-09-26', 107), r('2', '2026-10-04', 108), r('3', '2023-10-17', 1)])).toBe(108);
  });

  it('derives a number for unnumbered recaps newer than the last numbered one', () => {
    expect(latestSessionNumber([r('1', '2026-10-04', 108), r('2', '2026-10-11', null)])).toBe(109);
  });

  it('falls back to the recap count when nothing is numbered', () => {
    expect(latestSessionNumber([r('1', '2026-01-01'), r('2', '2026-01-08')])).toBe(2);
  });

  it('returns 0 for no recaps', () => {
    expect(latestSessionNumber([])).toBe(0);
  });
});

describe('sessionNumberFor', () => {
  const all = [r('1', '2023-10-17', 1), r('2', '2026-10-04', 108), r('3', '2026-10-11', null), r('4', '2026-10-18', null)];

  it('uses the stored session number', () => {
    expect(sessionNumberFor(all[1], all)).toBe(108);
  });

  it('counts forward from the previous numbered recap', () => {
    expect(sessionNumberFor(all[2], all)).toBe(109);
    expect(sessionNumberFor(all[3], all)).toBe(110);
  });

  it('falls back to list position when nothing earlier is numbered', () => {
    const plain = [r('a', '2024-01-01'), r('b', '2024-01-08')];
    expect(sessionNumberFor(plain[1], plain)).toBe(2);
  });

  it('returns null for a recap not in the list', () => {
    expect(sessionNumberFor(r('x', '2024-01-01'), all)).toBeNull();
  });
});
