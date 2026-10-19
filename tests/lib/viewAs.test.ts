import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getViewAsPlayer, setViewAsPlayer, subscribeViewAs, useViewAsPlayer } from '@/lib/viewAs';

afterEach(() => setViewAsPlayer(false));

describe('viewAs store', () => {
  it('defaults to off', () => {
    expect(getViewAsPlayer()).toBe(false);
  });

  it('notifies subscribers only when the value changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeViewAs(listener);
    setViewAsPlayer(true);
    setViewAsPlayer(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setViewAsPlayer(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('exposes the value through a hook that re-renders on change', () => {
    const { result } = renderHook(() => useViewAsPlayer());
    expect(result.current).toBe(false);
    act(() => setViewAsPlayer(true));
    expect(result.current).toBe(true);
  });
});
