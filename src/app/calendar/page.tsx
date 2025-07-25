"use client";

import { useState } from "react";
import calendarData from "@/data/calendar.json";
import {
  CalendarMonth,
  CalendarWeekday,
  CalendarData,
} from "@/types/interfaces";

function getMonthName(
  monthIdx: number,
  months: CalendarMonth[],
  opts?: { withPronunciation?: boolean }
) {
  const month = months[monthIdx - 1];
  if (!month) return "";
  if (opts?.withPronunciation && month.pronunciation) {
    return <span title={month.pronunciation}>{month.name}</span>;
  }
  return month.name;
}

function getDayName(
  dayIdx: number,
  weekdays: CalendarWeekday[],
  opts?: { withPronunciation?: boolean }
) {
  const wd = weekdays[dayIdx % weekdays.length];
  if (!wd) return "";
  if (opts?.withPronunciation && wd.pronunciation) {
    return <span title={wd.pronunciation}>{wd.name}</span>;
  }
  return wd.name;
}

export default function CalendarPage() {
  const {
    current: initialCurrent,
    static: staticData,
    events,
    categories,
  } = calendarData as CalendarData;
  const months = staticData.months;
  const weekdays = staticData.weekdays;
  const eventList = events;
  const categoryList = categories;

  // State for navigation
  const [viewYear, setViewYear] = useState(initialCurrent.year);
  const [viewMonth, setViewMonth] = useState(initialCurrent.month);

  // Find events for the viewed month/year, hide dmOnly events by default
  const currentMonthEvents = eventList.filter(
    (e) => e.date?.month === viewMonth && e.date?.year === viewYear && !e.dmOnly
  );

  // Helper to check if a day is the current day
  const isCurrentDay = (day: number) =>
    viewYear === initialCurrent.year &&
    viewMonth === initialCurrent.month &&
    day === initialCurrent.day;

  // Navigation handlers
  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(months.length);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (viewMonth === months.length) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToPrevYear = () => setViewYear((y) => y - 1);
  const goToNextYear = () => setViewYear((y) => y + 1);

  // Days in this month
  const daysInMonth = months[viewMonth - 1].length;
  // Break days into tenday weeks
  const tendayWeeks: number[][] = [];
  for (let i = 1; i <= daysInMonth; i += 10) {
    tendayWeeks.push(
      Array.from({ length: Math.min(10, daysInMonth - i + 1) }, (_, j) => i + j)
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Calendar: {calendarData.name}
        </h1>
        <div className="mb-6 text-center text-gray-700 dark:text-gray-300">
          <span className="font-semibold">Current Date:</span>{" "}
          {getDayName(initialCurrent.day, weekdays, {
            withPronunciation: true,
          })}
          ,{" "}
          {getMonthName(initialCurrent.month, months, {
            withPronunciation: true,
          })}{" "}
          {initialCurrent.day}, Year {initialCurrent.year}
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={goToPrevYear}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
          >
            « Prev Year
          </button>
          <button
            onClick={goToPrevMonth}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
          >
            ‹ Prev Month
          </button>
          <span className="font-semibold text-gray-900 dark:text-white">
            {getMonthName(viewMonth, months, { withPronunciation: true })}{" "}
            {viewYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
          >
            Next Month ›
          </button>
          <button
            onClick={goToNextYear}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
          >
            Next Year »
          </button>
        </div>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg">
            <thead>
              <tr>
                {weekdays.map((wd) => (
                  <th
                    key={wd.id}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-semibold border-b border-gray-300 dark:border-gray-700"
                    title={wd.pronunciation || undefined}
                  >
                    {wd.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tendayWeeks.map((week, weekIdx) => (
                <tr key={weekIdx}>
                  {week.map((day) => (
                    <td
                      key={day}
                      className={`px-2 py-2 text-center border-b border-gray-200 dark:border-gray-700 ${
                        isCurrentDay(day)
                          ? "bg-blue-200 dark:bg-blue-800 font-bold"
                          : ""
                      }`}
                    >
                      {day}
                    </td>
                  ))}
                  {/* Fill empty cells if week is less than 10 days */}
                  {Array.from({ length: 10 - week.length }).map((_, i) => (
                    <td
                      key={`empty-${i}`}
                      className="px-2 py-2 text-center border-b border-gray-200 dark:border-gray-700"
                    ></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Events This Month
          </h2>
          {currentMonthEvents.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No events this month.
            </p>
          ) : (
            <ul className="space-y-2">
              {currentMonthEvents.map((event) => {
                const category = categoryList.find(
                  (c) => c.id === event.category
                );
                return (
                  <li
                    key={event.id}
                    className="p-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {event.name}
                      </span>
                      {category && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ background: category.color, color: "#fff" }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {getMonthName(event.date.month, months, {
                        withPronunciation: true,
                      })}{" "}
                      {Array.isArray(event.date.day)
                        ? event.date.day.join("-")
                        : event.date.day}
                      , Year {event.date.year}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 text-sm">
                      {event.description}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
