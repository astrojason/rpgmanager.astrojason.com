import { useEffect, useSyncExternalStore } from 'react';

interface ReferrerInfo {
    label: string;
    url: string;
}

const defaultReferrer: ReferrerInfo = { label: 'Campaign', url: '/campaign' };

function parseReferrer(referrer: string): ReferrerInfo {
    if (!referrer) return defaultReferrer;

    try {
        const referrerUrl = new URL(referrer);
        const pathname = referrerUrl.pathname;
        const urlWithParams = referrerUrl.pathname + referrerUrl.search;

        if (pathname.includes('/campaign/locations')) {
            return { label: 'Locations', url: urlWithParams };
        }

        if (pathname.includes('/campaign/factions')) {
            return { label: 'Factions', url: urlWithParams };
        }

        if (pathname.includes('/campaign/npcs')) {
            return { label: 'NPCs', url: urlWithParams };
        }

        if (pathname.includes('/campaign/pcs')) {
            return { label: 'PCs', url: urlWithParams };
        }

        if (pathname.includes('/campaign/recaps')) {
            return { label: 'Session Recaps', url: '/campaign/recaps' };
        }

        if (pathname.includes('/campaign')) {
            return defaultReferrer;
        }
    } catch {
        console.warn('Invalid referrer URL:', referrer);
    }

    return defaultReferrer;
}

function getStoredReferrer() {
    if (typeof document === 'undefined') return '';
    return document.referrer || sessionStorage.getItem('lastPage') || '';
}

const subscribeNoop = () => () => {};

// useSyncExternalStore needs a referentially stable snapshot, so reuse the last value while it is unchanged.
let cachedReferrer: ReferrerInfo = defaultReferrer;
function getReferrerSnapshot(): ReferrerInfo {
    const resolved = parseReferrer(getStoredReferrer());
    if (resolved.label !== cachedReferrer.label || resolved.url !== cachedReferrer.url) cachedReferrer = resolved;
    return cachedReferrer;
}

export function useReferrerInfo(): ReferrerInfo {
    // The server snapshot is the default, so hydration matches and the real referrer applies on the client.
    return useSyncExternalStore(subscribeNoop, getReferrerSnapshot, () => defaultReferrer);
}

// Hook to track page visits for better referrer tracking
export function usePageTracking() {
    useEffect(() => {
        // Store current page in session storage when component mounts
        sessionStorage.setItem('lastPage', window.location.href);
    }, []);
}

// Helper function to get default back info for a specific page type
export function getDefaultBackInfo(pageType: 'npcs' | 'pcs' | 'factions' | 'locations'): ReferrerInfo {
    switch (pageType) {
        case 'npcs':
            return { label: 'NPCs', url: '/campaign/npcs' };
        case 'pcs':
            return { label: 'PCs', url: '/campaign/pcs' };
        case 'factions':
            return { label: 'Factions', url: '/campaign/factions' };
        case 'locations':
            return { label: 'Locations', url: '/campaign/locations' };
        default:
            return { label: 'Campaign', url: '/campaign' };
    }
}
