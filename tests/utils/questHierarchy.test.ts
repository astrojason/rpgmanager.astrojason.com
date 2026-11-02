import { describe, expect, it } from 'vitest';
import { getChildQuests, getParentCandidates, getParentQuest } from '@/utils/questHierarchy';
import type { Quest } from '@/types/interfaces';

const q = (id: string, parent_id?: string | null): Quest => ({ id, name: `Quest ${id}`, notes: [], status: 'active', parent_id });

// 1 -> 2 -> 3, 4 is standalone, 5 is another child of 1
const quests = [q('1'), q('2', '1'), q('3', '2'), q('4'), q('5', '1')];

describe('questHierarchy', () => {
  it('finds the direct children of a quest', () => {
    expect(getChildQuests(quests, '1').map(c => c.id)).toEqual(['2', '5']);
    expect(getChildQuests(quests, '4')).toEqual([]);
  });

  it('finds the parent of a quest, or null when there is none or it is not loaded', () => {
    expect(getParentQuest(quests, quests[1])?.id).toBe('1');
    expect(getParentQuest(quests, quests[0])).toBeNull();
    expect(getParentQuest(quests, q('9', '404'))).toBeNull();
  });

  it('excludes the quest itself and all its descendants from parent candidates', () => {
    expect(getParentCandidates(quests, '1').map(c => c.id)).toEqual(['4']);
    expect(getParentCandidates(quests, '2').map(c => c.id)).toEqual(['1', '4', '5']);
    expect(getParentCandidates(quests, '4').map(c => c.id)).toEqual(['1', '2', '3', '5']);
  });
});
