"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function CampaignAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return <>{children}</>;
}
