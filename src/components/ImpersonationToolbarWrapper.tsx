import { useEffect, useState, useContext } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import ImpersonationToolbar from "@/components/ImpersonationToolbar";
import { ImpersonationContext } from "@/lib/ImpersonationContext";

// Dummy fetch for users; replace with real API call if available
async function fetchUsers() {
  // Example: fetch from /api/users or similar endpoint
  // Here, just return a static list for demo
  return [
    { id: "admin", name: "Admin User" },
    { id: "user1", name: "Player One" },
    { id: "user2", name: "Player Two" },
  ];
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
  if (typeof window === "undefined" || !realIsAdmin || window.location.hostname !== "localhost") return null;

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
