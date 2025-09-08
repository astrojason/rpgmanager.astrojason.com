/**
 * Utility functions for managing weekly Sunday RPG sessions
 */

export interface SessionInfo {
    date: string;
    weekNumber: number;
    isToday: boolean;
    isTomorrow: boolean;
    daysUntil: number;
}

/**
 * Get the next Sunday date from today
 */
export function getNextSunday(): Date {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const nextSunday = new Date(today);

    // If today is Sunday, get next Sunday (7 days from now)
    if (daysUntilSunday === 0) {
        nextSunday.setDate(today.getDate() + 7);
    } else {
        nextSunday.setDate(today.getDate() + daysUntilSunday);
    }

    return nextSunday;
}

/**
 * Get session information for the next Sunday
 */
export function getNextSessionInfo(): SessionInfo {
    const today = new Date();
    const nextSunday = getNextSunday();
    const daysUntil = Math.ceil((nextSunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate week number (arbitrary starting point)
    const startDate = new Date('2025-01-05'); // First Sunday of 2025
    const weeksDiff = Math.floor((nextSunday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

    return {
        date: nextSunday.toISOString().split('T')[0], // YYYY-MM-DD format
        weekNumber: weeksDiff + 1,
        isToday: daysUntil === 0,
        isTomorrow: daysUntil === 1,
        daysUntil
    };
}

/**
 * Format date for display
 */
export function formatSessionDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Generate a template for next session data
 */
export function generateNextSessionTemplate(customDate?: string, isSkipped: boolean = false): object {
    const sessionInfo = getNextSessionInfo();
    const date = customDate || sessionInfo.date;

    if (isSkipped) {
        return {
            date,
            agenda: "Session skipped",
            reminders: [],
            currentGameDate: "TBD",
            notes: "",
            lastUpdated: new Date().toISOString().split('T')[0],
            isSkipped: true,
            skipReason: "Reason for skipping session"
        };
    }

    return {
        date,
        agenda: "To be determined - check with DM before session",
        reminders: [
            "Bring character sheets and dice",
            "Review last session's recap",
            "Check spell slots and remaining abilities",
            "Prepare your character's goals for this session"
        ],
        currentGameDate: "TBD",
        notes: "Session details will be updated before game day",
        lastUpdated: new Date().toISOString().split('T')[0],
        isSkipped: false,
        skipReason: ""
    };
}

/**
 * Generate a skipped session template
 */
export function generateSkippedSessionTemplate(date: string, reason: string): object {
    return {
        date,
        agenda: "Session skipped",
        reminders: [],
        currentGameDate: "No change from last session",
        notes: `Session was skipped. ${reason}`,
        lastUpdated: new Date().toISOString().split('T')[0],
        isSkipped: true,
        skipReason: reason
    };
}

/**
 * Check if it's time to update session info (e.g., after a session)
 */
export function shouldUpdateSessionInfo(lastSessionDate: string): boolean {
    const lastSession = new Date(lastSessionDate);
    const today = new Date();

    // If last session was yesterday or before, it's time to update
    return (today.getTime() - lastSession.getTime()) > (1000 * 60 * 60 * 24);
}
