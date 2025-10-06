import { describe, expect, it } from 'vitest';
import {
  determineUpcomingSessionDate,
  formatSessionDate,
  getNextSundayAtPacific,
  parseSessionDate,
  daysUntil,
} from '@/utils/nextSession';

describe('next session utilities', () => {
  const reference = new Date('2024-05-13T12:00:00Z'); // Monday, May 13 2024

  it('returns stored future date when it is already upcoming', () => {
    const storedDate = '2030-12-22';
    const result = determineUpcomingSessionDate({ date: storedDate, isSkipped: false }, reference);
    const expected = parseSessionDate(storedDate);

    expect(result?.toISOString()).toEqual(expected?.toISOString());
  });

  it('falls back to the next Sunday at 7pm Pacific when no date is stored', () => {
    const result = determineUpcomingSessionDate({ isSkipped: false }, reference);
    const expected = getNextSundayAtPacific(reference);

    expect(result?.toISOString()).toEqual(expected.toISOString());
  });

  it('falls back to the next Sunday when stored date is in the past', () => {
    const result = determineUpcomingSessionDate({ date: '2024-05-01', isSkipped: false }, reference);
    const expected = getNextSundayAtPacific(reference);

    expect(result?.toISOString()).toEqual(expected.toISOString());
  });

  it('returns null when the next session is marked as skipped', () => {
    const result = determineUpcomingSessionDate({ date: '2030-12-22', isSkipped: true }, reference);

    expect(result).toBeNull();
  });

  it('formats fallback date with Pacific time wording', () => {
    const fallback = getNextSundayAtPacific(reference);
    const formatted = formatSessionDate(fallback);

    expect(formatted).toContain('Pacific');
    expect(formatted).toMatch(/Sunday/);
  });

  it('calculates days until the upcoming session relative to a reference', () => {
    const upcoming = getNextSundayAtPacific(reference);
    const diff = daysUntil(upcoming, reference);

    expect(diff).toBe(7);
  });
});
