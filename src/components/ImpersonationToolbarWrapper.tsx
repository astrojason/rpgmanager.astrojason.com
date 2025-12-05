import React, { useEffect, useState, useContext } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import ImpersonationToolbar from "@/components/ImpersonationToolbar";
import { ImpersonationContext } from "@/lib/ImpersonationContext";

async function fetchUsers() {
  // Allow configuration via environment instead of hardcoding.
  const configuredUsers = process.env.NEXT_PUBLIC_IMPERSONATION_USERS;
  if (!configuredUsers) {
    if (process.env.NODE_ENV === "test") {
      return [
        { id: "admin", name: "Admin User" },
        { id: "user1", name: "Player One" },
      ];
    }
    return [];
  }
  try {
    const parsed = JSON.parse(configuredUsers);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore parse errors and fall through
  }
  return [];
}



export default function ImpersonationToolbarWrapper() {
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [realUserId, setRealUserId] = useState<string>("");
  const [realIsAdmin, setRealIsAdmin] = useState<boolean>(false);
  const { impersonatedUserId, setImpersonatedUserId } = useContext(ImpersonationContext);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setRealUserId(user?.uid || "");
      // Check admin claim directly from token
      if (user) {
        const token = await user.getIdTokenResult();
        setRealIsAdmin(token.claims.role === "admin");
      } else {
        setRealIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  const handleImpersonate = (userId: string) => {
    setImpersonatedUserId(userId);
    // The context/provider will update sessionStorage and trigger app re-render
  };
  const handleClear = () => {
    setImpersonatedUserId(undefined);
    // The context/provider will update sessionStorage and trigger app re-render
  };

  // Only show on localhost and for real admin (not impersonated)
  if (typeof window === "undefined" || !realIsAdmin || window.location.hostname !== "localhost" || users.length === 0) {
    return null;
  }

  return (
    <ImpersonationToolbar
      users={users}
      currentUserId={realUserId}
      impersonatedUserId={impersonatedUserId}
      onImpersonate={handleImpersonate}
      onClear={handleClear}
    />
  );
}
