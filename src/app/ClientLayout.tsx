"use client";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SideNavigation from "@/components/SideNavigation";
import { ImpersonationContext } from "@/lib/ImpersonationContext";

const ImpersonationToolbarWrapper = dynamic(() => import("@/components/ImpersonationToolbarWrapper"), { ssr: false });


// import { useImpersonation } from "@/lib/ImpersonationContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | undefined>(undefined);
  const [realUserId, setRealUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem("impersonatedUserId") : undefined;
    if (stored) setImpersonatedUserId(stored);
  }, []);
  useEffect(() => {
    // Listen for real user changes
    if (typeof window === 'undefined') return;
    import("@/firebase/client").then(({ auth }) => {
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        if (auth) {
          onAuthStateChanged(auth, (user) => {
            setRealUserId(user?.uid || undefined);
          });
        }
      });
    });
  }, []);
  const contextValue = {
    impersonatedUserId,
    setImpersonatedUserId: (uid?: string) => {
      setImpersonatedUserId(uid);
      if (typeof window !== 'undefined') {
        if (uid) sessionStorage.setItem("impersonatedUserId", uid);
        else sessionStorage.removeItem("impersonatedUserId");
      }
    },
  };
  // Use a key to force a re-mount of the app (except the impersonation bar) when user or impersonation changes
  const effectiveKey = `${realUserId || "nouser"}-${impersonatedUserId || "noimpersonation"}`;
  return (
    <ImpersonationContext.Provider value={contextValue}>
      <ImpersonationToolbarWrapper />
      <div key={effectiveKey} className="flex min-h-dvh w-full">
        <SideNavigation className="flex-shrink-0" />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </ImpersonationContext.Provider>
  );
}
