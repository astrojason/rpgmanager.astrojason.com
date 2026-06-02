"use client";

import { useState } from "react";
import { auth } from "@/firebase/client";
import { signOut } from "firebase/auth";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

export default function SignOutButton() {
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (!auth) {
      setError("Authentication not initialized — cannot sign out.");
      return;
    }
    try {
      await signOut(auth);
      window.location.href = "/auth";
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  return (
    <div>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}
      <button
        onClick={handleSignOut}
        className="grim-btn is-ghost"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Sign Out
      </button>
    </div>
  );
}
