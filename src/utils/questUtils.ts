import { Quest, UserNote, PC } from '@/types/interfaces';

// Cache for PCs data
let pcsCache: PC[] | null = null;

// Function to load PCs data and cache it
async function loadPcsCache(): Promise<PC[]> {
    if (pcsCache) {
        return pcsCache;
    }

    try {
        const response = await fetch('/api/data/pcs');
        if (response.ok) {
            pcsCache = await response.json();
            return pcsCache || [];
        }
    } catch (error) {
        console.error('Error loading PCs cache:', error);
    }

    return [];
}

// Function to get display name for a UID - either "DM", character name, or "Unknown"
export async function getDisplayNameForUID(uid: string): Promise<string> {
    if (!uid) return 'Unknown';

    // Handle legacy authors that are not UIDs
    if (uid.includes('@') || uid === 'Admin' || uid === 'Unknown') {
        return uid;
    }

    // Check if this is the DM's UID
    if (uid === '75jk9LhhIfhqYkqV3cHsLr3ONeb2') {
        return 'DM';
    }

    // Load PCs and find character assigned to this UID
    const pcs = await loadPcsCache();
    const assignedCharacter = pcs.find(pc => pc.player === uid);

    if (assignedCharacter) {
        return assignedCharacter.name;
    }

    return 'Unknown';
}

// Function to get display name synchronously (returns "Unknown" if not cached)
export function getDisplayNameSync(uid: string): string {
    if (!uid) return 'Unknown';

    // Handle legacy authors that are not UIDs
    if (uid.includes('@') || uid === 'Admin' || uid === 'Unknown') {
        return uid;
    }

    // Check if this is the DM's UID
    if (uid === '75jk9LhhIfhqYkqV3cHsLr3ONeb2') {
        return 'DM';
    }

    // Check cached PCs data
    if (pcsCache) {
        const assignedCharacter = pcsCache.find(pc => pc.player === uid);
        if (assignedCharacter) {
            return assignedCharacter.name;
        }
    }

    return 'Unknown';
}

// Helper to reset the cached PCs list (useful in tests or when refetching)
export function clearPcsCache(): void {
    pcsCache = null;
}

export function normalizeQuestNotes(quest: Quest): UserNote[] {
    if (!quest.notes || quest.notes.length === 0) {
        return [];
    }

    // Check if it's already in the new format
    if (typeof quest.notes[0] === 'object' && 'id' in quest.notes[0]) {
        return quest.notes as UserNote[];
    }

    // Convert legacy string format to UserNote format
    return (quest.notes as string[]).map((noteContent, index) => ({
        id: `legacy-${quest.id}-${index}`,
        content: noteContent,
        timestamp: '', // No timestamp for legacy data
        author: 'Unknown'
    }));
}

export function isLegacyNote(note: UserNote): boolean {
    return !note.timestamp || note.timestamp === '';
}

export function formatNoteTimestamp(note: UserNote): string {
    if (!note.timestamp) {
        return '';
    }

    try {
        return new Date(note.timestamp).toLocaleString();
    } catch {
        return '';
    }
}

export function migrateQuestToNewFormat(quest: Quest): Quest {
    return {
        ...quest,
        notes: normalizeQuestNotes(quest)
    };
}
