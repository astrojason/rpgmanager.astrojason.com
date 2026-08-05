import { describe, expect, it, vi } from 'vitest';
import { safeJsonParse } from '@/lib/apiHelpers';

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('["a","b"]', [])).toEqual(['a', 'b']);
  });

  it('returns the fallback for malformed JSON instead of throwing', () => {
    expect(safeJsonParse('The Breake...', [])).toEqual([]);
  });

  it('returns the fallback for null/undefined input', () => {
    expect(safeJsonParse(null, [])).toEqual([]);
    expect(safeJsonParse(undefined, [])).toEqual([]);
  });

  it('logs a warning with the offending value when parsing fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    safeJsonParse('not json', []);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not json'));
    warn.mockRestore();
  });
});
