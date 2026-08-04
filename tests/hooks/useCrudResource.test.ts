import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrudResource } from '@/hooks/useCrudResource';

interface Widget {
  id: string;
  name: string;
}

function createTestClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createTestClient() }, children);
}

function baseConfig(overrides: Partial<Parameters<typeof useCrudResource<Widget>>[0]> = {}) {
  return {
    endpoint: '/api/data/widgets',
    getId: (w: Widget) => w.id,
    validate: (formData: Partial<Widget>) => (formData.name ? null : 'Name is required'),
    successMessage: (isCreating: boolean) => (isCreating ? 'Widget created.' : 'Widget updated.'),
    deleteConfirmMessage: (w: Widget) => `Delete "${w.name}"?`,
    deleteSuccessMessage: 'Widget deleted.',
    ...overrides,
  };
}

describe('useCrudResource', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('loads the list from the endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Alpha' }],
    });

    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: '1', name: 'Alpha' }]);
    expect(global.fetch).toHaveBeenCalledWith('/api/data/widgets', expect.anything());
  });

  it('surfaces a load error when the list fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const { result } = renderHook(
      () => useCrudResource<Widget>(baseConfig({ loadErrorMessage: 'Failed to load widgets' })),
      { wrapper }
    );

    await waitFor(() => expect(result.current.queryError).toBeTruthy());
    expect(result.current.queryError?.message).toBe('Failed to load widgets');
  });

  it('walks through create/edit/view/cancel state transitions', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleCreate({ name: '' }));
    expect(result.current.isCreating).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.selected).toBeNull();

    const widget: Widget = { id: '1', name: 'Alpha' };
    act(() => result.current.handleEdit(widget));
    expect(result.current.isEditing).toBe(true);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.selected).toEqual(widget);
    expect(result.current.formData).toEqual(widget);

    act(() => result.current.handleView(widget));
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.selected).toEqual(widget);
    expect(result.current.formData).toEqual({});

    act(() => result.current.handleEdit(widget));
    act(() => result.current.handleCancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.formData).toEqual({});
  });

  it('blocks save on validation failure without calling the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleCreate({}));
    await act(async () => { await result.current.handleSave(); });

    expect(result.current.error).toBe('Name is required');
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the initial list load
  });

  it('creates a record, selects the server response, and shows a success message', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // list load
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { id: 'srv-1', name: 'Alpha' } }) }) // POST
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // refetch after invalidate

    global.fetch = fetchMock;
    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleCreate({ name: 'Alpha' }));
    await act(async () => { await result.current.handleSave(); });

    expect(result.current.selected).toEqual({ id: 'srv-1', name: 'Alpha' });
    expect(result.current.isCreating).toBe(false);
    expect(result.current.success).toBe('Widget created.');

    const [, saveCall] = fetchMock.mock.calls;
    expect(saveCall[0]).toBe('/api/data/widgets');
    expect(saveCall[1]).toMatchObject({ method: 'POST' });

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.success).toBe('');
  });

  it('deselects after save when selectAfterSave is false', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { id: 'srv-1', name: 'Alpha' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    global.fetch = fetchMock;

    const { result } = renderHook(
      () => useCrudResource<Widget>(baseConfig({ selectAfterSave: false })),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleCreate({ name: 'Alpha' }));
    await act(async () => { await result.current.handleSave(); });

    expect(result.current.selected).toBeNull();
  });

  it('surfaces a save error and keeps isSaving false afterward', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, text: async () => 'boom' });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleCreate({ name: 'Alpha' }));
    await act(async () => { await result.current.handleSave(); });

    expect(result.current.error).toContain('boom');
    expect(result.current.isSaving).toBe(false);
  });

  it('opens a confirm dialog on delete and performs the DELETE request on confirm', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: '1', name: 'Alpha' }] })
      .mockResolvedValueOnce({ ok: true }) // DELETE
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // refetch
    global.fetch = fetchMock;

    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const widget: Widget = { id: '1', name: 'Alpha' };
    act(() => result.current.handleView(widget));
    act(() => result.current.handleDelete(widget));

    expect(result.current.confirmState?.message).toBe('Delete "Alpha"?');

    await act(async () => { await result.current.confirmState!.onConfirm(); });

    expect(result.current.confirmState).toBeNull();
    expect(result.current.selected).toBeNull();
    expect(result.current.success).toBe('Widget deleted.');
    const deleteCall = fetchMock.mock.calls[1];
    expect(deleteCall[0]).toBe('/api/data/widgets?id=1');
    expect(deleteCall[1]).toMatchObject({ method: 'DELETE' });
  });

  it('exposes raw setSuccess/setSelected escape hatches for bespoke page flows', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const widget: Widget = { id: '1', name: 'Alpha' };
    act(() => result.current.setSelected(widget));
    expect(result.current.selected).toEqual(widget);

    act(() => result.current.setSuccess('Review complete!'));
    expect(result.current.success).toBe('Review complete!');
  });

  it('surfaces a delete error without clearing the selection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: '1', name: 'Alpha' }] })
      .mockResolvedValueOnce({ ok: false, text: async () => 'cannot delete' });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useCrudResource<Widget>(baseConfig()), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const widget: Widget = { id: '1', name: 'Alpha' };
    act(() => result.current.handleView(widget));
    act(() => result.current.handleDelete(widget));
    await act(async () => { await result.current.confirmState!.onConfirm(); });

    expect(result.current.error).toContain('cannot delete');
    expect(result.current.selected).toEqual(widget);
  });
});
