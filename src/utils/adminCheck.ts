import { useState, useEffect } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';

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

// Hook to use admin status in React components with Firebase authentication
export function useIsAdmin(): boolean {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        if (!auth) {
            setIsAdmin(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Get user's ID token to check custom claims
                    const tokenResult = await user.getIdTokenResult();
                    const userRole = tokenResult.claims.role as string || null;
                    const adminStatus = userRole === 'admin';

                    setIsAdmin(adminStatus);

                    // Store in localStorage for synchronous access in other parts of the app
                    localStorage.setItem('isFirebaseAdmin', adminStatus.toString());
                } catch (error) {
                    console.error('Error checking user role:', error);
                    setIsAdmin(false);
                    localStorage.removeItem('isFirebaseAdmin');
                }
            } else {
                setIsAdmin(false);
                localStorage.removeItem('isFirebaseAdmin');
            }
        });

        return () => unsubscribe();
    }, []);

    // Return false during SSR and before client hydration
    if (!isClient) {
        return false;
    }

    return isAdmin;
}
