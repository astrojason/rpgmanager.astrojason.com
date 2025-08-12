"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/campaign");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Welcome to RPG Manager</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">Please sign in to access your campaign.</p>
        <a
          href="/auth"
          className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors duration-200"
        >
          Sign In
        </a>
        <div className="mt-8 text-gray-400 text-sm animate-pulse">Checking authentication...</div>
      </div>
    </div>
  );
}
