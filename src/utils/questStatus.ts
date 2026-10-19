export const QUEST_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "undiscovered", label: "Undiscovered" },
] as const;

export function isQuestEnded(status?: string | null): boolean {
  return status === "completed" || status === "closed";
}
