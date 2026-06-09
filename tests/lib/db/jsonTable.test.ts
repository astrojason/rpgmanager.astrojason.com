import { describe, expect, it } from 'vitest';
import { deleteById, getAllJSON, insertJSON, updateJSON } from '@/lib/db/jsonTable';
import { mockDb } from '../../test-utils';

describe('jsonTable helpers', () => {
  it('parses stored JSON rows', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ data: JSON.stringify({ id: '1', name: 'entry' }) }] });

    const rows = await getAllJSON<{ id: string; name: string }>('test_table');

    expect(mockDb.execute).toHaveBeenCalledWith(expect.stringContaining('SELECT data FROM test_table'));
    expect(rows).toEqual([{ id: '1', name: 'entry' }]);
  });

  it('inserts JSON payload with provided id', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    await insertJSON('test_table', 'abc', { value: 42 });

    expect(mockDb.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining('INSERT INTO test_table'),
      args: ['abc', JSON.stringify({ value: 42 })],
    });
  });

  it('updates JSON payload and returns affected rows', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 2 });

    const affected = await updateJSON('test_table', 'abc', { value: 'changed' });

    expect(affected).toBe(2);
    expect(mockDb.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining('UPDATE test_table'),
      args: [JSON.stringify({ value: 'changed' }), 'abc'],
    });
  });

  it('deletes by id and returns count', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    const deleted = await deleteById('test_table', 'abc');

    expect(deleted).toBe(1);
    expect(mockDb.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining('DELETE FROM test_table'),
      args: ['abc'],
    });
  });
});
