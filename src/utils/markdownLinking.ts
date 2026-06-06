// Import type definitions for data structures used to build links
interface LinkMapping {
    name: string;
    url: string;
    type: 'faction' | 'location' | 'npc' | 'pc';
}

export interface AutoLinkEntity {
    id: string;
    name: string;
    aliases?: string[];
    url: string;
    type: 'npc' | 'location' | 'item' | 'faction' | 'deity' | 'pc';
}

// Cache for the link map to avoid repeated computations
let cachedLinkMap: Map<string, LinkMapping> | null = null;

// Function to reset cache (useful for development)
export function resetLinkMapCache() {
    cachedLinkMap = null;
}

// Optional helper to pre-seed the link map (handy in tests or preloaded contexts)
export function seedLinkMap(entries: LinkMapping[]) {
    cachedLinkMap = new Map(
        entries.map((entry) => [entry.name.trim().toLowerCase(), entry])
    );
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
export function convertMarkdownLinks(markdownText: string, isAdmin: boolean = false, autoLinkEntities: AutoLinkEntity[] = []): string {
    const linkMap = createEntityLinkMap();

    // Build a name→entity map for O(1) fallback lookup
    const entityFallback = new Map<string, AutoLinkEntity>();
    for (const e of autoLinkEntities) {
        entityFallback.set(e.name.trim().toLowerCase(), e);
        for (const alias of e.aliases ?? []) {
            if (alias.trim()) entityFallback.set(alias.trim().toLowerCase(), e);
        }
    }

    // Regex to match [[{NAME}]] patterns
    const linkRegex = /\[\[([^\]]+)\]\]/g;

    return markdownText.replace(linkRegex, (_match, entityName) => {
        void _match;
        const normalizedName = entityName.trim().toLowerCase();
        const linkData = linkMap.get(normalizedName);

        if (linkData) {
            const typeClass = getTypeClass(linkData.type);
            return `<a href="${linkData.url}" class="${typeClass}" title="${linkData.type}: ${linkData.name}">${entityName.trim()}</a>`;
        }

        // Fall back to autoLinkEntities — creates a proper <a> so autoLinkEntitiesInHtml skips it
        const autoEntity = entityFallback.get(normalizedName);
        if (autoEntity) {
            return `<a href="${autoEntity.url}" class="grim-link">${entityName.trim()}</a>`;
        }

        // Unknown entity
        if (isAdmin) {
            const redLinkClass = "font-medium text-red-600 dark:text-red-400 underline decoration-2 decoration-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors duration-200";
            return `<span class="${redLinkClass}" title="Missing entity: ${entityName.trim()}">${entityName.trim()}</span>`;
        } else {
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

// Auto-link entity names in rendered HTML without touching existing anchor tags.
// Matches primary names, aliases, and first-word partials of multi-word names.
// Sorted longest-first so "Stormharbor" wins over "Storm".
export function autoLinkEntitiesInHtml(html: string, entities: AutoLinkEntity[]): string {
    if (!entities.length) return html;

    // Build a flat list of (searchName, entity) pairs including aliases and first-word partials
    type NamedEntity = { searchName: string; entity: AutoLinkEntity };
    const namedEntities: NamedEntity[] = [];

    for (const entity of entities) {
        const allNames = [entity.name, ...(entity.aliases ?? [])];
        for (const n of allNames) {
            if (!n?.trim()) continue;
            namedEntities.push({ searchName: n.trim(), entity });
        }
    }

    // Sort longest first so specific matches win over partial ones
    const sorted = namedEntities.sort((a, b) => b.searchName.length - a.searchName.length);

    // Split on HTML tags so we can skip content inside tags
    const parts = html.split(/(<[^>]*>)/g);
    let inAnchor = 0;

    return parts.map((part, i) => {
        if (i % 2 === 1) {
            // HTML tag — track anchor depth
            if (/^<a[\s>]/i.test(part)) inAnchor++;
            else if (/^<\/a>/i.test(part)) inAnchor--;
            return part;
        }

        // Text node — skip if inside an existing anchor or empty
        if (inAnchor > 0 || !part) return part;

        // Collect non-overlapping match intervals for all entities
        type Interval = { start: number; end: number; entity: AutoLinkEntity; match: string };
        const intervals: Interval[] = [];

        for (const { searchName, entity } of sorted) {
            const escaped = searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`\\b${escaped}\\b`, 'gi');
            let m;
            while ((m = re.exec(part)) !== null) {
                const start = m.index;
                const end = start + m[0].length;
                if (!intervals.some(iv => start < iv.end && end > iv.start)) {
                    intervals.push({ start, end, entity, match: m[0] });
                }
            }
        }

        if (!intervals.length) return part;

        intervals.sort((a, b) => a.start - b.start);

        let result = '';
        let pos = 0;
        for (const iv of intervals) {
            result += part.slice(pos, iv.start);
            result += `<a href="${iv.entity.url}" class="grim-link">${iv.match}</a>`;
            pos = iv.end;
        }
        result += part.slice(pos);
        return result;
    }).join('');
}

// Enhanced function to parse markdown with link conversion
export function parseMarkdownWithLinks(markdownText: string, isAdmin: boolean = false, autoLinkEntities: AutoLinkEntity[] = []): string {
    const textWithLinks = convertMarkdownLinks(markdownText, isAdmin, autoLinkEntities);
    return textWithLinks.replace(/\n/g, '<br />');
}
