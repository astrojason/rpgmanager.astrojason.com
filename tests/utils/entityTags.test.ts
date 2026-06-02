import { describe, expect, it } from 'vitest';
import { getRecentlyTaggedNpcs, getRecapsForQuest } from '@/utils/entityTags';
import { NPC, SessionRecap } from '@/types/interfaces';

const npc = (id: string, hidden = false): NPC => ({
  id,
  name: `NPC ${id}`,
  pronunciation: '',
  race: 'Human',
  gender: 'unknown',
  location: '',
  status: 'alive',
  description: '',
  hidden,
});

const recap = (id: string, tagged_npcs: string[]): SessionRecap => ({
  id,
  date: `2026-01-0${id}`,
  title: `Session ${id}`,
  recap: '',
  tagged_npcs,
});

describe('getRecentlyTaggedNpcs', () => {
  it('returns NPCs from most recent recap first', () => {
    const npcs = [npc('1'), npc('2')];
    const recaps = [recap('1', ['1']), recap('2', ['2'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs);
    expect(result.map(n => n.id)).toEqual(['2', '1']);
  });

  it('deduplicates NPCs across recaps', () => {
    const npcs = [npc('1')];
    const recaps = [recap('1', ['1']), recap('2', ['1'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('expands to older recaps when recent recap has fewer than limit', () => {
    const npcs = [npc('1'), npc('2'), npc('3')];
    const recaps = [recap('10', ['1']), recap('5', ['2', '3'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs, 3);
    expect(result.map(n => n.id)).toEqual(['1', '2', '3']);
  });

  it('returns empty array when no recaps have tags', () => {
    const npcs = [npc('1')];
    const recaps = [recap('1', [])];
    expect(getRecentlyTaggedNpcs(recaps, npcs)).toEqual([]);
  });

  it('filters out hidden NPCs', () => {
    const npcs = [npc('1', true), npc('2')];
    const recaps = [recap('1', ['1', '2'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs);
    expect(result.map(n => n.id)).toEqual(['2']);
  });

  it('limits NPCs drawn from older recaps but not the most recent', () => {
    const npcs = [npc('1'), npc('2'), npc('3'), npc('4')];
    // Most recent recap (id=10) has NPCs 1 and 2 — both always included.
    // Older recap (id=5) has NPCs 3 and 4 — limit=2 is already met after NPC 2.
    const recaps = [recap('10', ['1', '2']), recap('5', ['3', '4'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs, 2);
    expect(result.map(n => n.id)).toEqual(['1', '2']);
  });

  it('returns empty array when recaps list is empty', () => {
    expect(getRecentlyTaggedNpcs([], [npc('1')])).toEqual([]);
  });

  it('skips NPCs not in the npcs list', () => {
    const npcs = [npc('2')];
    const recaps = [recap('1', ['1', '2'])];
    const result = getRecentlyTaggedNpcs(recaps, npcs);
    expect(result.map(n => n.id)).toEqual(['2']);
  });
});

const recapWithQuests = (id: string, tagged_quests: string[]): SessionRecap => ({
  id,
  date: `2026-01-0${id}`,
  title: `Session ${id}`,
  recap: '',
  tagged_quests,
});

describe('getRecapsForQuest', () => {
  it('returns recaps that tag the given quest', () => {
    const recaps = [recapWithQuests('1', ['q1']), recapWithQuests('2', ['q2'])];
    expect(getRecapsForQuest(recaps, 'q1').map(r => r.id)).toEqual(['1']);
  });

  it('returns multiple recaps sorted newest first', () => {
    const recaps = [recapWithQuests('1', ['q1']), recapWithQuests('3', ['q1']), recapWithQuests('2', ['q1'])];
    const result = getRecapsForQuest(recaps, 'q1');
    expect(result.map(r => r.date)).toEqual(['2026-01-03', '2026-01-02', '2026-01-01']);
  });

  it('returns empty array when quest has no tagged recaps', () => {
    const recaps = [recapWithQuests('1', ['q2'])];
    expect(getRecapsForQuest(recaps, 'q1')).toEqual([]);
  });

  it('returns empty array when recaps list is empty', () => {
    expect(getRecapsForQuest([], 'q1')).toEqual([]);
  });
});
