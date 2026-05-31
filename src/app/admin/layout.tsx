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
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grim-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grim-bg)" }}>
        <div className="grim-tome" style={{ padding: "40px 48px", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ember)", marginBottom: 12 }}>⚔</div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink)", marginBottom: 8 }}>Passage Denied</h2>
          <p style={{ fontSize: 15, color: "var(--grim-ink-3)", marginBottom: 24 }}>You must sign in to enter the Scriptorium.</p>
          <Link href="/auth" className="grim-btn is-ember" style={{ display: "inline-block", padding: "10px 24px" }}>Sign In</Link>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grim-bg)" }}>
        <div className="grim-tome" style={{ padding: "40px 48px", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-blood-2)", marginBottom: 12 }}>✠</div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-blood-2)", marginBottom: 8 }}>Forbidden Ward</h2>
          <p style={{ fontSize: 15, color: "var(--grim-ink-3)", marginBottom: 6 }}>Master&apos;s privileges are required beyond this threshold.</p>
          <p className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em", marginBottom: 24 }}>Current role: {userRole || 'none'}</p>
          <Link href="/campaign" className="grim-btn is-ember" style={{ display: "inline-block", padding: "10px 24px" }}>Return to Campaign</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", background: "var(--grim-bg)", color: "var(--grim-ink)", fontFamily: "var(--font-body)" }}>

      {/* Admin sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: "linear-gradient(180deg, oklch(0.12 0.030 290) 0%, oklch(0.09 0.025 295) 100%)",
        borderRight: "1px solid var(--grim-line)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>

        {/* Sidebar header */}
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid var(--grim-line)" }}>
          <div className="grim-mono" style={{ fontSize: 8, letterSpacing: ".22em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginBottom: 4 }}>
            The Scriptorium
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1 }}>
            Master&apos;s Codex
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <div className="grim-mono" style={{ fontSize: 8, letterSpacing: ".22em", color: "var(--grim-ink-4)", textTransform: "uppercase", padding: "0 20px", marginBottom: 6 }}>
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 20px",
                      textDecoration: "none",
                      color: isActive ? "var(--grim-ember-2)" : "var(--grim-ink-3)",
                      background: isActive ? "oklch(0.40 0.10 40 / 0.12)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--grim-ember)" : "2px solid transparent",
                      transition: "color 0.15s, background 0.15s",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{item.glyph}</span>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".04em" }}>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--grim-line)" }}>
          <Link
            href="/campaign"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--grim-ink-4)", fontSize: 12 }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>‹</span>
            <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase" }}>Back to Campaign</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
