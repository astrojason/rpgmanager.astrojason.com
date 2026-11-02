import type { Quest } from '@/types/interfaces';

export function getChildQuests(quests: Quest[], questId: string): Quest[] {
  return quests.filter(q => q.parent_id != null && String(q.parent_id) === String(questId));
}

export function getParentQuest(quests: Quest[], quest: Quest): Quest | null {
  if (quest.parent_id == null) return null;
  return quests.find(q => String(q.id) === String(quest.parent_id)) ?? null;
}

/** Quests that may be chosen as the parent of `questId`: everything except itself and its descendants. */
export function getParentCandidates(quests: Quest[], questId: string): Quest[] {
  const excluded = new Set<string>([String(questId)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const q of quests) {
      if (q.parent_id != null && excluded.has(String(q.parent_id)) && !excluded.has(String(q.id))) {
        excluded.add(String(q.id));
        grew = true;
      }
    }
  }
  return quests.filter(q => !excluded.has(String(q.id)));
}
