"use client";

import timelineData from "@/data/timeline.json";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
}

export default function TimelinePage() {
  const events = timelineData as TimelineEvent[];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Campaign Timeline
        </h1>
        <div className="relative border-l-4 border-blue-300 dark:border-blue-700 ml-4">
          {events.map((event, idx) => (
            <div key={event.id} className="mb-10 ml-6 group">
              <div
                className="absolute -left-6 w-4 h-4 bg-blue-400 dark:bg-blue-700 rounded-full border-4 border-white dark:border-gray-900 group-hover:scale-110 transition-transform"
                style={{ top: `${idx * 6}rem` }}
              />
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {event.date}
                  </span>
                  <span className="text-xs text-gray-400">#{event.id}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {event.title}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
