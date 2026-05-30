import { useImpersonation } from "@/lib/ImpersonationContext";
import { useEffect, useState } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export function useEffectiveUserId(): string | undefined {
    const { impersonatedUserId } = useImpersonation();
    const [realUserId, setRealUserId] = useState<string | undefined>(
        process.env.NODE_ENV === "development" ? "dev-user" : undefined
    );

    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        if (!auth) return;
        const unsub = onAuthStateChanged(auth, (user) => {
            setRealUserId(user?.uid || undefined);
        });
        return () => unsub();
    }, []);

    return impersonatedUserId || realUserId;
}
