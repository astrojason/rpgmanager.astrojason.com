import { useEffect, useState } from 'react';

interface ReferrerInfo {
    label: string;
    url: string;
}

export function useReferrerInfo(): ReferrerInfo {
    const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo>({
        label: 'Campaign',
        url: '/campaign'
    });

    useEffect(() => {
        // Get the referrer from document.referrer or session storage
        const referrer = document.referrer || sessionStorage.getItem('lastPage') || '';

        const timer = window.setTimeout(() => {
            // Parse the referrer URL to determine the appropriate back button
            if (referrer) {
                try {
                    const referrerUrl = new URL(referrer);
                    const pathname = referrerUrl.pathname;

                    if (pathname.includes('/campaign/locations')) {
                        setReferrerInfo({
                            label: 'Locations',
                            url: referrerUrl.pathname + referrerUrl.search // Preserve query params like ?selected=id
                        });
                    } else if (pathname.includes('/campaign/factions')) {
                        setReferrerInfo({
                            label: 'Factions',
                            url: referrerUrl.pathname + referrerUrl.search // Preserve query params like ?selected=id
                        });
                    } else if (pathname.includes('/campaign/npcs')) {
                        setReferrerInfo({
                            label: 'NPCs',
                            url: referrerUrl.pathname + referrerUrl.search // Preserve query params like ?selected=id
                        });
                    } else if (pathname.includes('/campaign/pcs')) {
                        setReferrerInfo({
                            label: 'PCs',
                            url: referrerUrl.pathname + referrerUrl.search // Preserve query params like ?selected=id
                        });
                    } else if (pathname.includes('/campaign/recaps')) {
                        setReferrerInfo({
                            label: 'Session Recaps',
                            url: '/campaign/recaps'
                        });
                    } else if (pathname.includes('/campaign')) {
                        setReferrerInfo({
                            label: 'Campaign',
                            url: '/campaign'
                        });
                    }
                } catch {
                    // Invalid URL, keep default
                    console.warn('Invalid referrer URL:', referrer);
                }
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    return referrerInfo;
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
