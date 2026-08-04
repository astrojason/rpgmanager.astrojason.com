import { renderHook, act } from '@testing-library/react';
import { useListArrowNav } from '@/hooks/useListArrowNav';

interface Widget {
  id: string;
  name: string;
}

const items: Widget[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
  { id: '3', name: 'Gamma' },
];

function pressKey(key: string, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
}

describe('useListArrowNav', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('selects the first item on ArrowDown when nothing is selected', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: null, getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowDown'));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it('selects the last item on ArrowUp when nothing is selected', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: null, getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowUp'));

    expect(onSelect).toHaveBeenCalledWith(items[2]);
  });

  it('moves to the next item on ArrowDown', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: items[0], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowDown'));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it('moves to the previous item on ArrowUp', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: items[1], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowUp'));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it('clamps at the end of the list without wrapping', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: items[2], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowDown'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clamps at the start of the list without wrapping', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: items[0], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowUp'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does nothing when the list is empty', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items: [], selected: null, getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    act(() => pressKey('ArrowDown'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores arrow keys typed inside form fields', () => {
    const onSelect = vi.fn();
    renderHook(() => useListArrowNav({ items, selected: items[0], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => pressKey('ArrowDown', input));
    document.body.removeChild(input);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const onSelect = vi.fn();
    const { unmount } = renderHook(() => useListArrowNav({ items, selected: items[0], getId: (w) => w.id, dataAttr: 'data-widget-id', onSelect }));

    unmount();
    act(() => pressKey('ArrowDown'));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
