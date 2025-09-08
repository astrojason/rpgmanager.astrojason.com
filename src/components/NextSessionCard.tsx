"use client";

import { useState } from "react";
import { useIsAdmin } from "@/utils/adminCheck";
import nextSessionData from "@/data/next_session.json";

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

  // Don't render if session is skipped
  if (sessionData.isSkipped) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            Session Skipped
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {formatDate(sessionData.date)}
            </div>
            {isAdmin && (
              <button 
                className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                onClick={() => {
                  // Handle un-skip session functionality
                  console.log("Un-skip session clicked");
                }}
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
            {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
          </div>
          {isAdmin && (
            <button 
              className="text-xs px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-full transition-colors"
              onClick={() => {
                // Handle skip session functionality
                console.log("Skip session clicked");
              }}
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
            <p className="text-slate-600 dark:text-slate-400">{formatDate(sessionData.date)}</p>
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
