// Removed unused imports to clear ESLint warnings
// import { useState, useEffect } from 'react';
// import { auth } from '@/firebase/client';
// import { onAuthStateChanged } from 'firebase/auth';

// Firebase-based admin check utility
export function isUserAdmin(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    // This is a convenience read; real enforcement happens via token claims.
    return localStorage.getItem('isFirebaseAdmin') === 'true';
}

// Hook to use admin status in React components, respects impersonation
import { useUserRole } from './role';
export function useIsAdmin(): boolean {
    const role = useUserRole();
    return role === 'admin';
}
