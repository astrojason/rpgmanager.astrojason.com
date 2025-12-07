import { describe, expect, it, vi } from 'vitest';
import { mockDb } from '../test-utils';

describe('API null/blank handling', () => {
  it('does not stringify null PC fields', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // create pcs table
      .mockResolvedValueOnce({ rows: [] }) // create junction
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: null,
            nickname: null,
            race: null,
            hometown: null,
            status: null,
            class: null,
            image: null,
            gif: null,
            player: null,
            gm_notes: null,
          },
        ],
      }) // select pcs
      .mockResolvedValueOnce({ rows: [] }); // junction rows

    const { GET } = await import('@/app/api/data/pcs/route');
    const res = await GET();
    const pcs = await res.json();
    expect(pcs).toHaveLength(1);
    expect(pcs[0]).toMatchObject({
      id: '2',
      name: '',
      race: '',
      hometown: '',
      status: '',
      class: '',
      player: null,
    });
    expect(pcs[0].nickname).toBeUndefined();
    expect(pcs[0].image).toBeUndefined();
    expect(pcs[0].gif).toBeUndefined();
    expect(pcs[0].gm_notes).toBeUndefined();
    expect(JSON.stringify(pcs[0])).not.toContain('"null"');
  });

  it('does not stringify null NPC fields', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // create npcs table
      .mockResolvedValueOnce({ rows: [] }) // create junction
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            name: null,
            aka: null,
            display_name: null,
            pronunciation: null,
            race: null,
            gender: null,
            location: null,
            status: null,
            description: null,
            background: null,
            personality: null,
            image: null,
            hidden: null,
            nameHidden: null,
            hide_name: null,
            notes: JSON.stringify([]),
            gm_notes: null,
          },
        ],
      }) // select npcs
      .mockResolvedValueOnce({ rows: [] }); // junction rows

    const { GET } = await import('@/app/api/data/npcs/route');
    const res = await GET({} as any);
    const npcs = await res.json();
    expect(npcs).toHaveLength(1);
    expect(npcs[0]).toMatchObject({
      id: '7',
      pronunciation: '',
      race: '',
      gender: '',
      location: '',
      status: '',
      description: '',
    });
    expect(npcs[0].name).toBeUndefined();
    expect(npcs[0].aka).toBeUndefined();
    expect(npcs[0].display_name).toBeUndefined();
    expect(npcs[0].background).toBeUndefined();
    expect(npcs[0].personality).toBeUndefined();
    expect(npcs[0].image).toBeUndefined();
    expect(npcs[0].gm_notes).toBeUndefined();
    expect(JSON.stringify(npcs[0])).not.toContain('"null"');
  });
});
