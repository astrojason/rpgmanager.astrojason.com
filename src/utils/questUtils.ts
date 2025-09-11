import { Quest, QuestNote } from '@/types/interfaces';

export function normalizeQuestNotes(quest: Quest): QuestNote[] {
    if (!quest.notes || quest.notes.length === 0) {
        return [];
    }

    // Check if it's already in the new format
    if (typeof quest.notes[0] === 'object' && 'id' in quest.notes[0]) {
        return quest.notes as QuestNote[];
    }

    // Convert legacy string format to QuestNote format
    return (quest.notes as string[]).map((noteContent, index) => ({
        id: `legacy-${quest.id}-${index}`,
        content: noteContent,
        timestamp: '', // No timestamp for legacy data
        author: 'Unknown'
    }));
}

export function isLegacyNote(note: QuestNote): boolean {
    return !note.timestamp || note.timestamp === '';
}

export function formatNoteTimestamp(note: QuestNote): string {
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
