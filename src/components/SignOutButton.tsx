import { auth } from "@/firebase/client";
import { signOut } from "firebase/auth";

import React from "react";

async function handleSignOut() {
  if (!auth) {
    alert("Authentication not initialized");
    return;
  }
  
  try {
    await signOut(auth);
    window.location.href = "/auth";
  } catch {
    alert("Sign out failed");
  }
}

export default function SignOutButton() {
  return (
    <button
      onClick={handleSignOut}
      className="grim-btn is-ghost"
      style={{ width: "100%", justifyContent: "center" }}
    >
      Sign Out
    </button>
  );
}
