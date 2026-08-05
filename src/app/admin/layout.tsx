"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_SECTIONS = [
  {
    label: "Codex",
    items: [
      { id: "overview", name: "Dashboard", href: "/admin", glyph: "⊕" },
    ],
  },
  {
    label: "Tomes of Record",
    items: [
      { id: "npcs", name: "NPCs", href: "/admin/data/npcs", glyph: "☥" },
      { id: "pcs", name: "Player Characters", href: "/admin/data/pcs", glyph: "⚔" },
      { id: "factions", name: "Factions", href: "/admin/data/factions", glyph: "⚑" },
      { id: "quests", name: "Quests", href: "/admin/data/quests", glyph: "✦" },
      { id: "locations", name: "Locations", href: "/admin/data/locations", glyph: "✠" },
      { id: "timeline", name: "Timeline", href: "/admin/data/timeline", glyph: "☾" },
    ],
  },
  {
    label: "Instruments",
    items: [
      { id: "calendar", name: "Calendar", href: "/admin/data/calendar", glyph: "✠" },
      { id: "recaps", name: "Session Recaps", href: "/admin/data/recaps", glyph: "☾" },
      { id: "user-management", name: "User Management", href: "/admin/users", glyph: "⚙" },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const tokenResult = await u.getIdTokenResult();
          setUserRole((tokenResult.claims.role as string) || null);
        } catch {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-grim-bg">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-grim-bg">
        <div className="grim-tome py-10 px-12 max-w-105 text-center">
          <div className="font-display text-5xl text-grim-ember mb-3">⚔</div>
          <h2 className="font-head text-3xl tracking-widest uppercase text-grim-ink mb-2">Passage Denied</h2>
          <p className="text-xl text-grim-ink-3 mb-6">You must sign in to enter the Scriptorium.</p>
          <Link href="/auth" className="grim-btn is-ember inline-block py-2.5 px-6">Sign In</Link>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center bg-grim-bg">
        <div className="grim-tome py-10 px-12 max-w-105 text-center">
          <div className="font-display text-5xl text-grim-blood-2 mb-3">✠</div>
          <h2 className="font-head text-3xl tracking-widest uppercase text-grim-blood-2 mb-2">Forbidden Ward</h2>
          <p className="text-xl text-grim-ink-3 mb-1.5">Master&apos;s privileges are required beyond this threshold.</p>
          <p className="grim-mono text-sm text-grim-ink-4 tracking-wider-3 mb-6">Current role: {userRole || 'none'}</p>
          <Link href="/campaign" className="grim-btn is-ember inline-block py-2.5 px-6">Return to Campaign</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-grim-bg text-grim-ink font-body">

      {/* Admin sidebar */}
      <aside
        className="w-60 shrink-0 border-r border-grim-line flex flex-col overflow-y-auto"
        style={{ background: "linear-gradient(180deg, oklch(0.12 0.030 290) 0%, oklch(0.09 0.025 295) 100%)" }}
      >

        {/* Sidebar header */}
        <div className="pt-5.5 px-5 pb-4 border-b border-grim-line">
          <div className="grim-mono text-xs tracking-widest-4 text-grim-ink-4 uppercase mb-1">
            The Scriptorium
          </div>
          <div className="font-display text-2xl text-grim-gold leading-none">
            Master&apos;s Codex
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="grim-mono text-xs tracking-widest-4 text-grim-ink-4 uppercase px-5 mb-1.5">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2.5 py-2 px-5 no-underline text-lg border-l-2 ${isActive ? "text-grim-ember-2 border-grim-ember" : "text-grim-ink-3 border-transparent"}`}
                    style={{
                      background: isActive ? "oklch(0.40 0.10 40 / 0.12)" : "transparent",
                      transition: "color 0.15s, background 0.15s",
                    }}
                  >
                    <span className="font-display text-xl w-5 text-center shrink-0">{item.glyph}</span>
                    <span className="font-head text-lg tracking-wider">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="py-3.5 px-5 border-t border-grim-line">
          <Link
            href="/campaign"
            className="flex items-center gap-2 no-underline text-grim-ink-4 text-base"
          >
            <span className="font-display text-lg">‹</span>
            <span className="grim-mono text-xs tracking-wider-4 uppercase">Back to Campaign</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
