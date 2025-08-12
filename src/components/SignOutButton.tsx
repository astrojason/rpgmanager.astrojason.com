import { auth } from "@/firebase/client";
import { signOut } from "firebase/auth";

import React from "react";

async function handleSignOut() {
  try {
    await signOut(auth);
    window.location.href = "/auth";
  } catch (error) {
    alert("Sign out failed");
  }
}

export default function SignOutButton() {
  return (
    <button
      onClick={handleSignOut}
      className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors duration-200 mt-2"
    >
      Sign Out
    </button>
  );
}
