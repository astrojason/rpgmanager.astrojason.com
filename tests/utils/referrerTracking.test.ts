import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getDefaultBackInfo, usePageTracking, useReferrerInfo } from '@/utils/referrerTracking';

describe('referrer tracking helpers', () => {
  it('returns sensible defaults for known page types', () => {
    expect(getDefaultBackInfo('npcs')).toEqual({ label: 'NPCs', url: '/campaign/npcs' });
    expect(getDefaultBackInfo('pcs')).toEqual({ label: 'PCs', url: '/campaign/pcs' });
    expect(getDefaultBackInfo('factions')).toEqual({ label: 'Factions', url: '/campaign/factions' });
    expect(getDefaultBackInfo('locations')).toEqual({ label: 'Locations', url: '/campaign/locations' });
  });

  it('falls back to campaign for unknown types', () => {
    // @ts-expect-error deliberate bad input
    expect(getDefaultBackInfo('other')).toEqual({ label: 'Campaign', url: '/campaign' });
  });

  it('derives referrer label from document.referrer', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://example.com/campaign/pcs?selected=1',
      configurable: true,
    });
    const { result } = renderHook(() => useReferrerInfo());
    expect(result.current.label).toBe('PCs');
    expect(result.current.url).toContain('/campaign/pcs');
  });

  it('stores last page on mount', () => {
    const setItem = vi.spyOn(window.sessionStorage.__proto__, 'setItem');
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: 'https://app.test/campaign' };

    renderHook(() => usePageTracking());

    expect(setItem).toHaveBeenCalledWith('lastPage', 'https://app.test/campaign');
    setItem.mockRestore();
    window.location = originalLocation;
  });
});
