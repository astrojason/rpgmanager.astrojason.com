import { describe, expect, it } from 'vitest';
import { statusChipClass } from '@/utils/chipClass';

describe('statusChipClass', () => {
  it('returns the alive chip class', () => {
    expect(statusChipClass('alive')).toBe('grim-chip is-alive');
    expect(statusChipClass('Alive')).toBe('grim-chip is-alive');
  });

  it('returns the deceased chip class for deceased or dead status', () => {
    expect(statusChipClass('deceased')).toBe('grim-chip is-deceased');
    expect(statusChipClass('dead')).toBe('grim-chip is-deceased');
    expect(statusChipClass('DEAD')).toBe('grim-chip is-deceased');
  });

  it('returns the unknown chip class for anything else', () => {
    expect(statusChipClass('missing')).toBe('grim-chip is-unknown');
    expect(statusChipClass(undefined)).toBe('grim-chip is-unknown');
    expect(statusChipClass('')).toBe('grim-chip is-unknown');
  });
});
