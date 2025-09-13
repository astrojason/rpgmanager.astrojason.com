// Import type definitions for data structures used to build links
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

// Create a mapping of entity names to their destination URLs.
// Data loading is intentionally omitted here; prefer passing pre-fetched
// data into a variant of this function in the future if needed.
function createEntityLinkMap(): Map<string, LinkMapping> {
    if (cachedLinkMap) {
        return cachedLinkMap;
    }

    const linkMap = new Map<string, LinkMapping>();

    cachedLinkMap = linkMap;
    return linkMap;
}

// Function to convert [[{NAME}]] references to links
export function convertMarkdownLinks(markdownText: string, isAdmin: boolean = false): string {
    const linkMap = createEntityLinkMap();

    // Regex to match [[{NAME}]] patterns
    const linkRegex = /\[\[([^\]]+)\]\]/g;

    return markdownText.replace(linkRegex, (_match, entityName) => {
        // Mark unused parameter as intentionally ignored to satisfy strict TS flags
        void _match;
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
