"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRealUserRole } from "@/utils/role";
import { setViewAsPlayer, useViewAsPlayer } from "@/lib/viewAs";

export default function ViewAsPlayerControl() {
  const realRole = useRealUserRole();
  const viewAsPlayer = useViewAsPlayer();
  const queryClient = useQueryClient();

  if (realRole !== "admin" && realRole !== "dm") return null;

  const toggle = (value: boolean) => {
    setViewAsPlayer(value);
    // Cached responses were filtered for the previous role, so refetch everything.
    queryClient.invalidateQueries();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3">
      {viewAsPlayer ? (
        <>
          <span className="grim-chip is-arcane">&#9670; Viewing as Player</span>
          <button className="grim-btn is-ember" onClick={() => toggle(false)}>
            Back to GM view
          </button>
        </>
      ) : (
        <button className="grim-btn is-ghost" onClick={() => toggle(true)}>
          View as Player
        </button>
      )}
    </div>
  );
}
