// Simple admin check utility
// You can expand this based on your authentication system

export function isUserAdmin(): boolean {
    // For now, we'll check for a simple condition
    // You might want to replace this with actual authentication logic

    if (typeof window === 'undefined') {
        // Server-side rendering
        return false;
    }

    // Check for admin flag in localStorage, URL parameter
    const isLocalAdmin = localStorage.getItem('isAdmin') === 'true';
    const isUrlAdmin = window.location.search.includes('admin=true');

    // Removed automatic development mode admin access
    // const isDevelopment = process.env.NODE_ENV === 'development';

    // Return true if any admin condition is met
    return isLocalAdmin || isUrlAdmin;
}

// Hook to use admin status in React components
export function useIsAdmin(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return isUserAdmin();
}
