"use client";

import { useState } from "react";
import { useIsAdmin } from "@/utils/adminCheck";
import nextSessionData from "@/data/next_session.json";
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
  const [sessionData] = useState<NextSessionData>(nextSessionData);
  const isAdmin = useIsAdmin();

  // Calculate days until next session
  const today = new Date();
  const nextSession = new Date(sessionData.date);
  const daysUntil = Math.ceil((nextSession.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/campaign" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
            ← Back to Campaign
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-8 text-white ${
            sessionData.isSkipped 
              ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {sessionData.isSkipped ? 'Session Skipped' : 'Next Session'}
                </h1>
                <p className={`text-lg ${
                  sessionData.isSkipped ? 'text-gray-200' : 'text-blue-100'
                }`}>
                  {formatDate(sessionData.date)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {sessionData.isSkipped 
                    ? '⏸️' 
                    : daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`
                  }
                </div>
                <div className={sessionData.isSkipped ? 'text-gray-200' : 'text-blue-100'}>
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

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                    📖 Current Game Date
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
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                      📅 Session Details
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                      <strong>Date:</strong> {formatDate(sessionData.date)}
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                      📖 Current Game Date
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                      {sessionData.currentGameDate}
                    </p>
                  </div>
                </div>

                {/* Session Agenda */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 text-xl flex items-center">
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
                <Link href="/campaign/recaps" className="inline-block px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-center transition-colors">
                  📚 Last Session Recap
                </Link>
                <Link href="/campaign/pcs" className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-center transition-colors">
                  👥 Player Characters
                </Link>
                <Link href="/campaign/calendar" className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-center transition-colors">
                  📅 Campaign Calendar
                </Link>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex gap-4">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                    ✏️ Edit Session Info
                  </button>
                  {sessionData.isSkipped ? (
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors">
                      ▶️ Un-skip Session
                    </button>
                  ) : (
                    <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors">
                      ⏸️ Mark as Skipped
                    </button>
                  )}
                  <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors">
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
