import { useSyncExternalStore } from "react";

// In-memory only: a reload returns a GM to their normal view rather than leaving them stuck as a player.
let viewAsPlayer = false;
const listeners = new Set<() => void>();

export function getViewAsPlayer(): boolean {
  return viewAsPlayer;
}

export function setViewAsPlayer(value: boolean): void {
  if (viewAsPlayer === value) return;
  viewAsPlayer = value;
  listeners.forEach(listener => listener());
}

export function subscribeViewAs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useViewAsPlayer(): boolean {
  return useSyncExternalStore(subscribeViewAs, getViewAsPlayer, () => false);
}
