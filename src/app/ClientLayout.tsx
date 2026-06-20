"use client";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import SideNavigation from "@/components/SideNavigation";
import { ImpersonationContext } from "@/lib/ImpersonationContext";

const ImpersonationToolbarWrapper = dynamic(() => import("@/components/ImpersonationToolbarWrapper"), { ssr: false });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | undefined>(undefined);
  const [realUserId, setRealUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem("impersonatedUserId") : undefined;
    if (stored) setImpersonatedUserId(stored);
  }, []);
  useEffect(() => {
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
  const effectiveKey = `${realUserId || "nouser"}-${impersonatedUserId || "noimpersonation"}`;
  return (
    <QueryClientProvider client={queryClient}>
      <ImpersonationContext.Provider value={contextValue}>
        <ImpersonationToolbarWrapper />
        <div key={effectiveKey} className="grim-screen">
          <SideNavigation />
          <main className="grim-main" style={{ padding: 0 }}>
            <Suspense>{children}</Suspense>
          </main>
        </div>
      </ImpersonationContext.Provider>
    </QueryClientProvider>
  );
}
