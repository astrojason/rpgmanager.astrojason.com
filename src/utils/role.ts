import { useEffect, useState } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';

export type UserRole = 'admin' | 'dm' | 'player' | null;

export function useUserRole(): UserRole {
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
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
  }, []);

  return role;
}

export function useIsDM(): boolean {
  const role = useUserRole();
  return role === 'dm' || role === 'admin';
}
