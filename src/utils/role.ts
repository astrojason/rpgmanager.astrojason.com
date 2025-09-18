"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useImpersonation } from '@/lib/ImpersonationContext';
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';

export type UserRole = 'admin' | 'dm' | 'player' | null;

// Helper to fetch role for a given UID (impersonated or real)
async function fetchUserRole(uid: string | undefined): Promise<UserRole> {
  if (!uid) return null;
  // Try to fetch from /api/users or similar endpoint if available
  // For now, fallback to localStorage or null
  // TODO: Replace with real API call if available
  const userRoles = JSON.parse(localStorage.getItem('userRoles') || '{}');
  if (userRoles[uid]) return userRoles[uid];
  return null;
}

export function useUserRole(): UserRole {
  const [role, setRole] = useState<UserRole>(null);
  const { impersonatedUserId } = useImpersonation();
  const effectiveUserId = useEffectiveUserId();

  useEffect(() => {
    if (impersonatedUserId) {
      // If impersonating, fetch the role for that user
      fetchUserRole(impersonatedUserId).then(setRole);
      return;
    }
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const r = (token.claims.role as string) || null;
        if (r === 'admin' || r === 'dm' || r === 'player') setRole(r as UserRole);
        else setRole(null);
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

