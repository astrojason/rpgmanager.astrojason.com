"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useImpersonation } from '@/lib/ImpersonationContext';
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';

export type UserRole = 'admin' | 'dm' | 'player' | null;

export function useUserRole(): UserRole {
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

export function useIsDM(): boolean {
  const role = useUserRole();
  return role === 'dm' || role === 'admin';
}
