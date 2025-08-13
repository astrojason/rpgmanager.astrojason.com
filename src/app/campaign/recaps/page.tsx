"use client";

import { useState, useRef } from "react";
import { marked } from "marked";
import recapsData from "@/data/session_recaps.json";

interface Recap {
  date: string;
  title: string;
  recap: string;
}

export default function RecapsPage() {
  const allRecaps: Recap[] = recapsData;
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [search, setSearch] = useState('');
  const [activeRecap, setActiveRecap] = useState<string | null>(null);
  const recapRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredRecaps = allRecaps
    .filter(
      (recap) =>
        recap.title.toLowerCase().includes(search.toLowerCase()) ||
        recap.recap.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

  // Scroll to recap when selected in sidebar
  const handleJumpToRecap = (date: string) => {
    setActiveRecap(date);
    setTimeout(() => {
      recapRefs.current[date]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Main Content Area */}
      <div className="flex-1 flex justify-center">
        <div className="max-w-4xl w-full mx-auto py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Session Recaps</h1>
          {/* Search and Sort Controls */}
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Recaps</label>
              <input
                type="text"
                placeholder="Search recaps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2 justify-end items-end">
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-md transition-colors duration-200"
              >
                Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>
              <button
                onClick={() => setSearch("")}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
              >
                Clear Search
              </button>
            </div>
          </div>
          <div className="space-y-6">
            {filteredRecaps.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No recaps found.</p>
            ) : (
              filteredRecaps.map((recap) => (
                <div
                  key={recap.date}
                  ref={el => {
                    recapRefs.current[recap.date] = el;
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 scroll-mt-24 transition-all duration-200 ${activeRecap === recap.date ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/10" : ""}`}
                  id={`recap-${recap.date}`}
                >
                  <div className="text-sm text-gray-500 mb-1">{recap.date}</div>
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{recap.title}</h2>
                  <div
                    className="prose prose-neutral"
                    dangerouslySetInnerHTML={{ __html: marked.parse(recap.recap) }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Right Sidebar - Recap List (styled like NPCs) */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full sticky top-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sessions ({filteredRecaps.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredRecaps.map((recap) => (
              <button
                key={recap.date}
                onClick={() => handleJumpToRecap(recap.date)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  activeRecap === recap.date
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">{recap.date}</div>
                <div className="font-medium truncate text-gray-900 dark:text-white">{recap.title}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
