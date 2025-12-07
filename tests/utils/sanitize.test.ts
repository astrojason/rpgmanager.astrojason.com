import { describe, expect, it } from 'vitest';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

describe('sanitize helpers', () => {
  it('normalizes blank and literal null/undefined strings', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText('  ')).toBe('');
    expect(sanitizeText('null')).toBe('');
    expect(sanitizeText('undefined')).toBe('');
    expect(sanitizeText(' Keeper ')).toBe('Keeper');
  });

  it('returns undefined for optional empty values', () => {
    expect(sanitizeOptionalText(null)).toBeUndefined();
    expect(sanitizeOptionalText('')).toBeUndefined();
    expect(sanitizeOptionalText('null')).toBeUndefined();
    expect(sanitizeOptionalText('Sunset')).toBe('Sunset');
  });

  it('guards invalid image sources', () => {
    expect(safeImageSrc(null)).toBeUndefined();
    expect(safeImageSrc('')).toBeUndefined();
    expect(safeImageSrc('null')).toBeUndefined();
    expect(safeImageSrc('http://example.com/image.png')).toBe('http://example.com/image.png');
    expect(safeImageSrc('/images/local.png')).toBe('/images/local.png');
    expect(safeImageSrc('notaurl')).toBeUndefined();
  });
});
