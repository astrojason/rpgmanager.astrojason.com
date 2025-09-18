"use client";

import { useState, useEffect } from "react";
import { useIsAdmin } from "@/utils/adminCheck";
import Link from "next/link";

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

export default function NextSessionPage() {
  const [sessionData, setSessionData] = useState<NextSessionData | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [daysUntil, setDaysUntil] = useState<number>(0);
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

  // Ensure this only runs on client side to prevent hydration mismatch
  useEffect(() => {
    if (!sessionData) return;
    setIsClient(true);
    
    // Calculate days until next session on client side only
    const today = new Date();
    const nextSession = new Date(sessionData.date);
    const calculatedDays = Math.ceil((nextSession.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    setDaysUntil(calculatedDays);
  }, [sessionData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `${formattedDate} at 7:00 PM Pacific`;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading session info...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Session Data Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Unable to load next session information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/campaign" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            ← Back to Campaign
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-8 text-white ${
            sessionData.isSkipped 
              ? 'bg-gradient-to-r from-stone-500 to-stone-600' 
              : 'bg-gradient-to-r from-slate-600 to-stone-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {sessionData.isSkipped ? 'Session Skipped' : 'Next Session'}
                </h1>
                <p className={`text-lg ${
                  sessionData.isSkipped ? 'text-stone-200' : 'text-slate-100'
                }`}>
                  {formatDate(sessionData.date)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {sessionData.isSkipped 
                    ? '⏸️' 
                    : !isClient ? "..." : daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`
                  }
                </div>
                <div className={sessionData.isSkipped ? 'text-stone-200' : 'text-slate-100'}>
                  {sessionData.isSkipped ? 'No session' : 'to go'}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {sessionData.isSkipped ? (
              // Skipped Session Content
              <>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg text-center">
                  <div className="text-6xl mb-4">⏸️</div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-xl">
                    No Session This Week
                  </h3>
                  {sessionData.skipReason && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      {sessionData.skipReason}
                    </p>
                  )}
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                    📖 In-world Date
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                    {sessionData.currentGameDate}
                  </p>
                </div>

                {sessionData.notes && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-xl flex items-center">
                      📝 Notes
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {sessionData.notes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Regular Session Content
              <>
                {/* Quick Info Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
                      📅 Session Details
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                      <strong>Date:</strong> {formatDate(sessionData.date)}
                    </p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                      📖 In-world date
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                      {sessionData.currentGameDate}
                    </p>
                  </div>
                </div>

                {/* Session Agenda */}
                <div className="bg-stone-50 dark:bg-stone-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3 text-xl flex items-center">
                    🎯 Session Agenda
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                    {sessionData.agenda}
                  </p>
                </div>

                {/* Session Notes */}
                {sessionData.notes && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-xl flex items-center">
                      📝 Session Notes
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {sessionData.notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Quick Links */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 text-xl">
                🔗 Quick Links
              </h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Link href="/campaign/recaps" className="inline-block px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-md text-center transition-colors">
                  📚 Last Session Recap
                </Link>
                <Link href="/campaign/pcs" className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-center transition-colors">
                  👥 Player Characters
                </Link>
                <Link href="/campaign/calendar" className="inline-block px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-center transition-colors">
                  📅 Campaign Calendar
                </Link>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex gap-4">
                  <button
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
                    onClick={async () => {
                      if (!sessionData) return;
                      const agenda = prompt('Edit session agenda:', sessionData.agenda || '');
                      if (agenda === null) return;
                      const notes = prompt('Edit session notes:', sessionData.notes || '');
                      if (notes === null) return;
                      const updatedData = {
                        ...sessionData,
                        agenda,
                        notes,
                        lastUpdated: new Date().toISOString().split('T')[0],
                      };
                      try {
                        const response = await fetch('/api/data/next-session', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updatedData),
                        });
                        if (response.ok) {
                          setSessionData(updatedData);
                        }
                      } catch (error) {
                        console.error('Error editing session:', error);
                      }
                    }}
                  >
                    ✏️ Edit Session Info
                  </button>
                  {sessionData.isSkipped ? (
                    <button
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                      onClick={async () => {
                        if (!sessionData) return;
                        const updatedData = {
                          ...sessionData,
                          isSkipped: false,
                          skipReason: '',
                          lastUpdated: new Date().toISOString().split('T')[0],
                        };
                        try {
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
                      }}
                    >
                      ▶️ Un-skip Session
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-md transition-colors"
                      onClick={async () => {
                        if (!sessionData) return;
                        const reason = prompt('Reason for skipping this session (optional):', sessionData.skipReason || '');
                        if (reason === null) return;
                        const updatedData = {
                          ...sessionData,
                          isSkipped: true,
                          skipReason: reason,
                          lastUpdated: new Date().toISOString().split('T')[0],
                        };
                        try {
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
                      }}
                    >
                      ⏸️ Mark as Skipped
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-md transition-colors"
                    onClick={async () => {
                      if (!sessionData) return;
                      // Advance to next week: increment date by 7 days
                      const currentDate = new Date(sessionData.date);
                      currentDate.setDate(currentDate.getDate() + 7);
                      const updatedData = {
                        ...sessionData,
                        date: currentDate.toISOString().split('T')[0],
                        lastUpdated: new Date().toISOString().split('T')[0],
                      };
                      try {
                        const response = await fetch('/api/data/next-session', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updatedData),
                        });
                        if (response.ok) {
                          setSessionData(updatedData);
                        }
                      } catch (error) {
                        console.error('Error advancing session:', error);
                      }
                    }}
                  >
                    ➡️ Advance to Next Week
                  </button>
                </div>
                {sessionData.lastUpdated && (
                  <p className="text-sm text-gray-500 mt-2">
                    Last updated: {sessionData.lastUpdated}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
