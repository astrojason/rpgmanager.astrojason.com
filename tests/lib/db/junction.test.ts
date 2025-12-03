import { describe, expect, it } from 'vitest';
import { ensureJunction, loadJunctionMap, replaceJunctionForKey } from '@/lib/db/junction';
import { mockDb } from '../../test-utils';

describe('junction helpers', () => {
  it('ensures junction table schema exists', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    await ensureJunction('npc_factions', 'npc_id', 'faction_id');

    expect(mockDb.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS npc_factions'));
  });

  it('loads rows into keyed map', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { a: '1', b: '2' },
        { a: '1', b: '3' },
        { a: '2', b: '1' },
      ],
    });

    const result = await loadJunctionMap('npc_factions', 'npc_id', 'faction_id');

    expect(result.get('1')).toEqual(['2', '3']);
    expect(result.get('2')).toEqual(['1']);
  });

  it('replaces existing relations for a key', async () => {
    mockDb.execute.mockResolvedValue({ rowsAffected: 1 });

    await replaceJunctionForKey('pc_factions', 'pc_id', 'faction_id', '10', ['1', '2']);

    expect(mockDb.execute).toHaveBeenNthCalledWith(1, {
      sql: 'DELETE FROM pc_factions WHERE pc_id=?',
      args: ['10'],
    });
    expect(mockDb.execute).toHaveBeenNthCalledWith(2, {
      sql: 'INSERT OR IGNORE INTO pc_factions (pc_id,faction_id) VALUES (?,?)',
      args: ['10', '1'],
    });
    expect(mockDb.execute).toHaveBeenNthCalledWith(3, {
      sql: 'INSERT OR IGNORE INTO pc_factions (pc_id,faction_id) VALUES (?,?)',
      args: ['10', '2'],
    });
  });
});
