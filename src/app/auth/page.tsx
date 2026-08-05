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
      setError(err instanceof Error ? err.message : "Failed to assign default role");
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
    <div className="min-h-full flex items-center justify-center py-9 px-14">
      <div className="grim-tome is-bordered w-full max-w-105">
        <div className="text-center mb-6">
          <div className="grim-page-eyebrow mb-1">Azorian&apos;s Bounty</div>
          <h2 className="font-display text-5xl text-grim-gold m-0 leading-none">
            {mode === "signin" ? "A Summoning" : "Inscribe Thyself"}
          </h2>
          <div className="font-body text-lg text-grim-ink-3 italic mt-1.5">
            {mode === "signin" ? "The codex awaits the worthy." : "Join the campaign roster."}
          </div>
        </div>

        <hr className="grim-rule mb-5"/>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-grim-bg-2 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            style={{ borderRadius: 1 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-grim-bg-2 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            style={{ borderRadius: 1 }}
          />
          {error && <div className="text-grim-blood-2 text-lg font-mono">{error}</div>}
          <button type="submit" disabled={loading} className="grim-btn is-ember justify-center py-3 px-3.5 text-lg">
            {loading || assigningRole ? "Loading..." : mode === "signin" ? "Enter the Codex" : "Sign Up"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="grim-rule m-0 flex-1"/>
          <span className="font-mono text-sm text-grim-ink-4 tracking-wider-3 uppercase">or</span>
          <div className="grim-rule m-0 flex-1"/>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="grim-btn is-ghost w-full justify-center gap-2.5 py-3 px-3.5"
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.36 30.18 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.13 13.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.43-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.66 7.04l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.09c-1.01-2.97-1.01-6.21 0-9.18l-7.98-6.2C.99 16.36 0 20.05 0 24s.99 7.64 2.69 11.29l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.18 0 11.64-2.04 15.52-5.56l-7.19-5.6c-2.01 1.35-4.59 2.16-8.33 2.16-6.43 0-11.87-3.63-14.33-8.94l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          {loading ? "Loading..." : "Continue with Google"}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="grim-link bg-transparent border-none cursor-pointer font-head text-lg tracking-widest"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
