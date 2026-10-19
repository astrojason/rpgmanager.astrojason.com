import { describe, expect, it } from 'vitest';
import { QUEST_STATUS_OPTIONS, isQuestEnded } from '@/utils/questStatus';

describe('questStatus', () => {
  it('offers exactly active, completed, closed and undiscovered', () => {
    expect(QUEST_STATUS_OPTIONS.map(o => o.value)).toEqual(['active', 'completed', 'closed', 'undiscovered']);
  });

  it('has no rumored option', () => {
    expect(QUEST_STATUS_OPTIONS.some(o => o.value === 'rumored')).toBe(false);
  });

  it('labels each option for display', () => {
    expect(QUEST_STATUS_OPTIONS.map(o => o.label)).toEqual(['Active', 'Completed', 'Closed', 'Undiscovered']);
  });

  it('treats completed and closed as ended', () => {
    expect(isQuestEnded('completed')).toBe(true);
    expect(isQuestEnded('closed')).toBe(true);
  });

  it('treats active, undiscovered and empty as not ended', () => {
    expect(isQuestEnded('active')).toBe(false);
    expect(isQuestEnded('undiscovered')).toBe(false);
    expect(isQuestEnded(undefined)).toBe(false);
  });
});
