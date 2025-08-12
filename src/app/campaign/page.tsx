"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function CampaignLanding() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Welcome to Your Campaign</h1>
        <p className="mb-8 text-gray-700 dark:text-gray-300 text-lg">
          This is your campaign landing page. From here, you can access locations, characters, quests, and more.
        </p>
        <div className="flex flex-col gap-4 items-center">
          <a href="/campaign/locations" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Locations</a>
          <a href="/campaign/calendar" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Calendar</a>
          <a href="/campaign/pcs" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Player Characters</a>
          <a href="/campaign/npcs" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">NPCs</a>
          <a href="/campaign/factions" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Factions</a>
          <a href="/campaign/deities" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Deities</a>
          <a href="/campaign/items" className="px-6 py-2 bg-yellow-700 hover:bg-yellow-800 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Items</a>
          <a href="/campaign/lore" className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Lore</a>
          <a href="/campaign/pronunciations" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Pronunciations</a>
          <a href="/campaign/quests" className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Quests</a>
          <a href="/campaign/recaps" className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Recaps</a>
          <a href="/campaign/timeline" className="px-6 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md font-semibold transition-colors duration-200 w-full max-w-xs">Timeline</a>
        </div>
        <button
          className="mt-8 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold transition-colors duration-200"
          onClick={() => signOut(auth)}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
