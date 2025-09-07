interface LinkMapping {
    name: string;
    url: string;
    type: 'faction' | 'location' | 'npc' | 'pc';
}

// Cache for the link map to avoid repeated computations
let cachedLinkMap: Map<string, LinkMapping> | null = null;

// Function to reset cache (useful for development)
export function resetLinkMapCache() {
    cachedLinkMap = null;
}

// Create a comprehensive mapping of all entities to their pages
function createEntityLinkMap(): Map<string, LinkMapping> {
    if (cachedLinkMap) {
        return cachedLinkMap;
    }

    const linkMap = new Map<string, LinkMapping>();

    try {
        // Use dynamic imports with fallbacks for better HMR compatibility
        let factionsData: any[] = [];
        let locationsData: any[] = [];
        let npcsData: any[] = [];
        let pcsData: any[] = [];

        try {
            factionsData = require("@/data/factions.json");
        } catch (e) {
            console.warn('Could not load factions data:', e);
        }

        try {
            locationsData = require("@/data/locations.json");
        } catch (e) {
            console.warn('Could not load locations data:', e);
        }

        try {
            npcsData = require("@/data/npcs.json");
        } catch (e) {
            console.warn('Could not load npcs data:', e);
        }

        try {
            pcsData = require("@/data/pcs.json");
        } catch (e) {
            console.warn('Could not load pcs data:', e);
        }

        // Add factions
        factionsData.forEach((faction: any) => {
            if (faction?.name) {
                linkMap.set(faction.name.toLowerCase(), {
                    name: faction.name,
                    url: `/campaign/factions#${encodeURIComponent(faction.name.toLowerCase().replace(/\s+/g, '-'))}`,
                    type: 'faction'
                });

                // Also add version without "The" prefix if it exists
                if (faction.name.toLowerCase().startsWith('the ')) {
                    const nameWithoutThe = faction.name.substring(4); // Remove "The "
                    linkMap.set(nameWithoutThe.toLowerCase(), {
                        name: faction.name, // Keep original name for display
                        url: `/campaign/factions#${encodeURIComponent(faction.name.toLowerCase().replace(/\s+/g, '-'))}`,
                        type: 'faction'
                    });
                }
            }
        });

        // Add locations
        locationsData.forEach((locationGroup: any) => {
            if (locationGroup?.name) {
                // Add the main location
                linkMap.set(locationGroup.name.toLowerCase(), {
                    name: locationGroup.name,
                    url: `/campaign/locations#${encodeURIComponent(locationGroup.name.toLowerCase().replace(/\s+/g, '-'))}`,
                    type: 'location'
                });

                // Add sub-locations if they exist
                if (locationGroup.locations) {
                    locationGroup.locations.forEach((location: any) => {
                        if (location?.name) {
                            linkMap.set(location.name.toLowerCase(), {
                                name: location.name,
                                url: `/campaign/locations#${encodeURIComponent(location.name.toLowerCase().replace(/\s+/g, '-'))}`,
                                type: 'location'
                            });
                        }
                    });
                }
            }
        });

        // Add NPCs
        npcsData.forEach((npc: any) => {
            if (npc?.name) {
                linkMap.set(npc.name.toLowerCase(), {
                    name: npc.name,
                    url: `/campaign/npcs#${encodeURIComponent(npc.name.toLowerCase().replace(/\s+/g, '-'))}`,
                    type: 'npc'
                });

                // Also add aliases/aka names if they exist
                if (npc.aka) {
                    linkMap.set(npc.aka.toLowerCase(), {
                        name: npc.aka,
                        url: `/campaign/npcs#${encodeURIComponent(npc.name.toLowerCase().replace(/\s+/g, '-'))}`,
                        type: 'npc'
                    });
                }
            }
        });

        // Add PCs
        pcsData.forEach((pc: any) => {
            if (pc?.name) {
                linkMap.set(pc.name.toLowerCase(), {
                    name: pc.name,
                    url: `/campaign/pcs#${encodeURIComponent(pc.name.toLowerCase().replace(/\s+/g, '-'))}`,
                    type: 'pc'
                });

                // Also add nicknames if they exist
                if (pc.nickname) {
                    linkMap.set(pc.nickname.toLowerCase(), {
                        name: pc.nickname,
                        url: `/campaign/pcs#${encodeURIComponent(pc.name.toLowerCase().replace(/\s+/g, '-'))}`,
                        type: 'pc'
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error loading data for entity link map:', error);
    }

    cachedLinkMap = linkMap;
    return linkMap;
}

// Function to convert [[{NAME}]] references to links
export function convertMarkdownLinks(markdownText: string, isAdmin: boolean = false): string {
    const linkMap = createEntityLinkMap();

    // Regex to match [[{NAME}]] patterns
    const linkRegex = /\[\[([^\]]+)\]\]/g;

    return markdownText.replace(linkRegex, (match, entityName) => {
        const normalizedName = entityName.trim().toLowerCase();
        const linkData = linkMap.get(normalizedName);

        if (linkData) {
            // Create a styled link with different colors for different types
            const typeClass = getTypeClass(linkData.type);
            return `<a href="${linkData.url}" class="${typeClass}" title="${linkData.type}: ${linkData.name}">${entityName.trim()}</a>`;
        }

        // Handle non-existent links
        if (isAdmin) {
            // For admins, show as red links indicating missing entities
            const redLinkClass = "font-medium text-red-600 dark:text-red-400 underline decoration-2 decoration-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors duration-200";
            return `<span class="${redLinkClass}" title="Missing entity: ${entityName.trim()}">${entityName.trim()}</span>`;
        } else {
            // For non-admins, remove the brackets and show as plain text
            return entityName.trim();
        }
    });
}

// Helper function to get CSS classes for different entity types
function getTypeClass(type: 'faction' | 'location' | 'npc' | 'pc'): string {
    const baseClasses = "font-medium underline decoration-2 hover:no-underline transition-colors duration-200";

    switch (type) {
        case 'faction':
            return `${baseClasses} text-purple-600 dark:text-purple-400 decoration-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20`;
        case 'location':
            return `${baseClasses} text-green-600 dark:text-green-400 decoration-green-300 hover:bg-green-100 dark:hover:bg-green-900/20`;
        case 'npc':
            return `${baseClasses} text-blue-600 dark:text-blue-400 decoration-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20`;
        case 'pc':
            return `${baseClasses} text-orange-600 dark:text-orange-400 decoration-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20`;
        default:
            return `${baseClasses} text-gray-600 dark:text-gray-400 decoration-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20`;
    }
}

// Enhanced function to parse markdown with link conversion
export function parseMarkdownWithLinks(markdownText: string, isAdmin: boolean = false): string {
    // First convert [[{NAME}]] references to links
    const textWithLinks = convertMarkdownLinks(markdownText, isAdmin);

    // Then convert newlines to <br /> tags
    return textWithLinks.replace(/\n/g, '<br />');
}
