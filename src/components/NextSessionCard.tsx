"use client";

import { useState, useEffect, useMemo } from "react";
import { useIsAdmin } from "@/utils/adminCheck";
import {
  daysUntil as calculateDaysUntil,
  determineUpcomingSessionDate,
  formatSessionDate,
  parseSessionDate,
} from "@/utils/nextSession";

interface NextSessionData {
  date: string;
  agenda: string;
  reminders: string[];
  currentGameDate: string;
  location?: string;
  notes?: string;
  lastUpdated?: string;
  isSkipped?: boolean;
  skipReason?: string;
}

export default function NextSessionCard() {
  const [sessionData, setSessionData] = useState<NextSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = useIsAdmin();

  // Load session data on mount
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const response = await fetch('/api/data/next-session');
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, []);

  // Handle skip/resume session
  const handleSkipSession = async () => {
    if (!sessionData) return;
    
    const reason = prompt('Reason for skipping this session (optional):');
    if (reason === null) return; // User cancelled

    try {
      const updatedData = {
        ...sessionData,
        isSkipped: true,
        skipReason: reason,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      const response = await fetch('/api/data/next-session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        setSessionData(updatedData);
      }
    } catch (error) {
      console.error('Error skipping session:', error);
    }
  };

  const handleResumeSession = async () => {
    if (!sessionData) return;

    try {
      const updatedData = {
        ...sessionData,
        isSkipped: false,
        skipReason: '',
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      const response = await fetch('/api/data/next-session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        setSessionData(updatedData);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const storedSessionDate = useMemo(() => parseSessionDate(sessionData?.date), [sessionData?.date]);
  const upcomingSessionDate = useMemo(
    () => determineUpcomingSessionDate(sessionData, new Date()),
    [sessionData]
  );
  const daysUntil = useMemo(
    () => calculateDaysUntil(upcomingSessionDate, new Date()),
    [upcomingSessionDate]
  );
  const isSkipped = sessionData?.isSkipped ?? false;
  const daysUntilLabel = useMemo(() => {
    if (isSkipped) return null;
    if (daysUntil === null) return "TBD";
    if (daysUntil === 0) return "Today!";
    if (daysUntil === 1) return "Tomorrow";
    return `${daysUntil} days`;
  }, [daysUntil, isSkipped]);

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-stone-50 dark:from-slate-900/20 dark:to-stone-900/20 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading session info...</span>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
          Session Data Unavailable
        </h2>
        <p className="text-red-600 dark:text-red-400">Unable to load next session information.</p>
      </div>
    );
  }

  // Don't render if session is skipped
  if (isSkipped) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            Session Skipped
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {formatSessionDate(storedSessionDate)}
            </div>
            {isAdmin && (
              <button 
                className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors"
                onClick={handleResumeSession}
              >
                ▶️ Resume
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <span className="text-2xl mr-3">⏸️</span>
            <div>
              <p className="font-medium">No session this week</p>
              {sessionData.skipReason && (
                <p className="text-sm">{sessionData.skipReason}</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📖 Current Game Date</h3>
            <p className="text-gray-600 dark:text-gray-400">{sessionData.currentGameDate}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-50 to-stone-50 dark:from-slate-900/20 dark:to-stone-900/20 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Next Session
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full">
            {daysUntilLabel}
          </div>
          {isAdmin && (
            <button 
              className="text-xs px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-full transition-colors"
              onClick={handleSkipSession}
            >
              ⏸️ Skip
            </button>
          )}
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">📅 When</h3>
            <p className="text-slate-600 dark:text-slate-400">{formatSessionDate(upcomingSessionDate ?? storedSessionDate)}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">📖 Current Game Date</h3>
            <p className="text-slate-600 dark:text-slate-400">{sessionData.currentGameDate}</p>
          </div>
        </div>

        <div className="space-y-4">
          {sessionData.notes && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">📝 Notes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">{sessionData.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
