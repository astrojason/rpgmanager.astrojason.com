"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

  // Redirect authenticated users to campaign landing
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/campaign");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const ensurePlayerRole = async (user: User) => {
    // Assign the default player role the first time a user signs in
    try {
      setAssigningRole(true);
      const functions = getFunctions();
      const assignPlayerRole = httpsCallable(functions, "assignPlayerRole");
      await assignPlayerRole();
      // Refresh the token so role claims are immediately available to the app
      await user.getIdToken(true);
    } catch (err) {
      console.error("Failed to assign default role", err);
    } finally {
      setAssigningRole(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Authentication not initialized");
      return;
    }
    
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user) await ensurePlayerRole(cred.user);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user) await ensurePlayerRole(cred.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Authentication not initialized");
      return;
    }
    
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) await ensurePlayerRole(cred.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 56px" }}>
      <div className="grim-tome is-bordered" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="grim-page-eyebrow" style={{ marginBottom: 4 }}>Azorian&apos;s Bounty</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-gold)", margin: 0, lineHeight: 1 }}>
            {mode === "signin" ? "A Summoning" : "Inscribe Thyself"}
          </h2>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", fontStyle: "italic", marginTop: 6 }}>
            {mode === "signin" ? "The codex awaits the worthy." : "Join the campaign roster."}
          </div>
        </div>

        <hr className="grim-rule" style={{ marginBottom: 20 }}/>

        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)",
              color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15,
              padding: "10px 14px", outline: "none", borderRadius: 1
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: "var(--grim-bg-2)", border: "1px solid var(--grim-line-2)",
              color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15,
              padding: "10px 14px", outline: "none", borderRadius: 1
            }}
          />
          {error && <div style={{ color: "var(--grim-blood-2)", fontSize: 13, fontFamily: "var(--font-mono)" }}>{error}</div>}
          <button type="submit" disabled={loading} className="grim-btn is-ember" style={{ justifyContent: "center", padding: "12px 14px", fontSize: 13 }}>
            {loading || assigningRole ? "Loading..." : mode === "signin" ? "Enter the Codex" : "Sign Up"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div className="grim-rule" style={{ margin: 0, flex: 1 }}/>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>or</span>
          <div className="grim-rule" style={{ margin: 0, flex: 1 }}/>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="grim-btn is-ghost"
          style={{ width: "100%", justifyContent: "center", gap: 10, padding: "12px 14px" }}
        >
          <svg style={{ width: 18, height: 18 }} viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.36 30.18 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.13 13.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.43-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.66 7.04l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.09c-1.01-2.97-1.01-6.21 0-9.18l-7.98-6.2C.99 16.36 0 20.05 0 24s.99 7.64 2.69 11.29l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.18 0 11.64-2.04 15.52-5.56l-7.19-5.6c-2.01 1.35-4.59 2.16-8.33 2.16-6.43 0-11.87-3.63-14.33-8.94l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          {loading ? "Loading..." : "Continue with Google"}
        </button>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            className="grim-link"
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".08em" }}
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
