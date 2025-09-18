// Removed unused imports to clear ESLint warnings
// import { useState, useEffect } from 'react';
// import { auth } from '@/firebase/client';
// import { onAuthStateChanged } from 'firebase/auth';

// Firebase-based admin check utility
export function isUserAdmin(): boolean {
    // This function is primarily for server-side or immediate checks
    // For React components, prefer using useIsAdmin hook

    if (typeof window === 'undefined') {
        // Server-side rendering - cannot check Firebase auth
        return false;
    }

    // Fallback to localStorage for immediate synchronous checks
    // This should be set by the useIsAdmin hook after Firebase auth is verified
    const isLocalAdmin = localStorage.getItem('isFirebaseAdmin') === 'true';

    return isLocalAdmin;
}

// Hook to use admin status in React components, respects impersonation
import { useUserRole } from './role';
export function useIsAdmin(): boolean {
    const role = useUserRole();
    return role === 'admin';
}
