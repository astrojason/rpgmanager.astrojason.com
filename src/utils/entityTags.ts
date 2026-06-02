import { NPC, SessionRecap } from '@/types/interfaces';

export function getRecentlyTaggedNpcs(
  recaps: SessionRecap[],
  npcs: NPC[],
  limit = 6
): NPC[] {
  const npcMap = new Map(npcs.map(n => [n.id, n]));
  const seen = new Set<string>();
  const result: NPC[] = [];

  const sorted = [...recaps].sort((a, b) => {
    const aId = parseInt(a.id || '0', 10);
    const bId = parseInt(b.id || '0', 10);
    return bId - aId;
  });

  for (let recapIdx = 0; recapIdx < sorted.length; recapIdx++) {
    if (recapIdx > 0 && result.length >= limit) return result;
    for (const id of sorted[recapIdx].tagged_npcs ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const npc = npcMap.get(id);
      if (npc && !npc.hidden) {
        result.push(npc);
        if (recapIdx > 0 && result.length >= limit) return result;
      }
    }
  }

  return result;
}
