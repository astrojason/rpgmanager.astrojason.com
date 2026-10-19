"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useImpersonation } from '@/lib/ImpersonationContext';
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';
import { useViewAsPlayer } from '@/lib/viewAs';

export type UserRole = 'admin' | 'dm' | 'player' | null;

/** The role in the signed-in user's token, ignoring any "view as player" preview. */
export function useRealUserRole(): UserRole {
  const [role, setRole] = useState<UserRole>(null);
  const { impersonatedUserId } = useImpersonation();
  const effectiveUserId = useEffectiveUserId();

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      // When impersonating, fall back to the real user's token claims to avoid trusting local storage.
      if (!user || (impersonatedUserId && impersonatedUserId !== user.uid)) {
        setRole(null);
        return;
      }

      try {
        const token = await user.getIdTokenResult(true);
        const claim = (token.claims.role as UserRole | undefined) ?? null;
        if (claim === 'admin' || claim === 'dm' || claim === 'player') {
          setRole(claim);
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      }
    });

    return () => unsub();
  }, [impersonatedUserId, effectiveUserId]);

  return role;
}

/** The effective role: a GM previewing the app as a player is treated as a player. */
export function useUserRole(): UserRole {
  const role = useRealUserRole();
  const viewAsPlayer = useViewAsPlayer();
  return viewAsPlayer && (role === 'admin' || role === 'dm') ? 'player' : role;
}

export function useIsDM(): boolean {
  const role = useUserRole();
  return role === 'dm' || role === 'admin';
}
