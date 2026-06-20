"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";

const TINT_BG = {
  ember:  "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))",
  arcane: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))",
  blood:  "linear-gradient(180deg, oklch(0.38 0.16 22), oklch(0.25 0.12 22))",
  gold:   "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))",
  moss:   "linear-gradient(180deg, oklch(0.38 0.09 145), oklch(0.24 0.06 145))",
} as const;

const TINT_BORDER = {
  ember:  "var(--grim-ember)",
  arcane: "var(--grim-arcane)",
  blood:  "var(--grim-blood-2)",
  gold:   "var(--grim-gold-2)",
  moss:   "oklch(0.55 0.090 145)",
} as const;

type Tint = keyof typeof TINT_BG;

interface Counts {
  npcs?: number;
  pcs?: number;
  quests?: number;
  locations?: number;
  factions?: number;
}

const DATA_TOMES: { glyph: string; title: string; sub: string; tint: Tint; href: string; countKey: keyof Counts | null }[] = [
  { glyph: "☥", title: "NPCs",             sub: "Souls & strangers",      tint: "ember",  href: "/admin/data/npcs",      countKey: "npcs" },
  { glyph: "⚔", title: "Player Characters", sub: "The fellowship",         tint: "moss",   href: "/admin/data/pcs",       countKey: "pcs" },
  { glyph: "⚑", title: "Factions",          sub: "Banners & cabals",       tint: "gold",   href: "/admin/data/factions",  countKey: "factions" },
  { glyph: "✦", title: "Quests",            sub: "Errands & threads",      tint: "ember",  href: "/admin/data/quests",    countKey: "quests" },
  { glyph: "✠", title: "Locations",         sub: "Towns & landmarks",      tint: "arcane", href: "/admin/data/locations", countKey: "locations" },
  { glyph: "☾", title: "Timeline",          sub: "Events of the realm",    tint: "arcane", href: "/admin/data/timeline",  countKey: null },
];

const TOOL_TOMES: { glyph: string; title: string; sub: string; tint: Tint; href: string }[] = [
  { glyph: "⚙", title: "User Management",     sub: "Roles & permissions",       tint: "blood",  href: "/admin/users" },
  { glyph: "✠", title: "Calendar Management", sub: "World calendar & events",   tint: "gold",   href: "/admin/data/calendar" },
  { glyph: "☾", title: "Session Recaps",      sub: "Chronicle the sessions",    tint: "arcane", href: "/admin/data/recaps" },
];

function AdminTome({ glyph, title, sub, count, tint, href }: {
  glyph: string; title: string; sub: string; count?: number; tint: Tint; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="grim-tome" style={{ padding: "20px 22px", cursor: "pointer", display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{
          width: 52, height: 52, flexShrink: 0, borderRadius: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontSize: 30,
          background: TINT_BG[tint], color: "oklch(0.94 0.05 70)",
          border: "1px solid " + TINT_BORDER[tint],
          boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)",
        }}>{glyph}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--grim-ink)" }}>{title}</div>
          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 3 }}>{sub}</div>
        </div>
        {count != null && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-gold)", lineHeight: 1 }}>{count}</div>
            <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".16em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 2 }}>entries</div>
          </div>
        )}
        <span style={{ color: "var(--grim-ink-4)", fontFamily: "var(--font-display)", fontSize: 20, marginLeft: count != null ? 8 : 0 }}>›</span>
      </div>
    </Link>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const { data: npcsData = [] } = useQuery<unknown[]>({ queryKey: ['/api/data/npcs'], queryFn: () => authFetch('/api/data/npcs').then(r => r.ok ? r.json() : []) });
  const { data: questsData = [] } = useQuery<unknown[]>({ queryKey: ['/api/data/quests'], queryFn: () => authFetch('/api/data/quests').then(r => r.ok ? r.json() : []) });
  const { data: locationsData = [] } = useQuery<unknown[]>({ queryKey: ['/api/data/locations'], queryFn: () => authFetch('/api/data/locations').then(r => r.ok ? r.json() : []) });
  const { data: factionsData = [] } = useQuery<unknown[]>({ queryKey: ['/api/data/factions'], queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []) });
  const { data: pcsData = [] } = useQuery<unknown[]>({ queryKey: ['/api/data/pcs'], queryFn: () => authFetch('/api/data/pcs').then(r => r.ok ? r.json() : []) });

  const counts: Counts = {
    npcs: npcsData.length,
    quests: questsData.length,
    locations: locationsData.length,
    factions: factionsData.length,
    pcs: pcsData.length,
  };

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Masthead */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Master&apos;s hand</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>The Scriptorium</h1>
          <p className="grim-page-sub">Tend the tomes of the campaign — souls, banners, errands, and the turning of the world&apos;s calendar.</p>
        </div>
        {user && (
          <div style={{ textAlign: "right", paddingBottom: 6, flexShrink: 0 }}>
            <div className="grim-label" style={{ marginBottom: 4 }}>Signed in as</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold)", lineHeight: 1 }}>The Master</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6, alignItems: "center" }}>
              <span className="grim-chip is-ember">admin</span>
              <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)", letterSpacing: ".14em" }}>{user.email}</span>
            </div>
          </div>
        )}
      </header>

      {/* Quick overview ledger */}
      <section className="grim-tome is-bordered" style={{ marginBottom: 30, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {([
            { n: counts.npcs,      l: "Souls inscribed", glyph: "☥", tint: "ember"  as Tint },
            { n: counts.quests,    l: "Errands afoot",   glyph: "✦", tint: "moss"   as Tint },
            { n: counts.locations, l: "Places mapped",   glyph: "✠", tint: "arcane" as Tint },
            { n: counts.factions,  l: "Banners raised",  glyph: "⚑", tint: "gold"   as Tint },
          ] as { n: number | undefined; l: string; glyph: string; tint: Tint }[]).map((s, i) => (
            <div key={i} style={{ padding: "22px 26px", borderLeft: i > 0 ? "1px solid var(--grim-line)" : "none", background: "linear-gradient(180deg, oklch(0.17 0.035 285), oklch(0.135 0.030 290))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: TINT_BORDER[s.tint] }}>{s.glyph}</span>
                <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{s.l}</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-gold)", lineHeight: 0.9, textShadow: "0 0 28px oklch(0.72 0.165 48 / 0.15)" }}>
                {s.n ?? <span style={{ fontSize: 24, color: "var(--grim-ink-4)" }}>—</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tomes of Record */}
      <section style={{ marginBottom: 30 }}>
        <h2 className="grim-h-section">Tomes of Record</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {DATA_TOMES.map((t, i) => (
            <AdminTome
              key={i}
              glyph={t.glyph}
              title={t.title}
              sub={t.sub}
              tint={t.tint}
              href={t.href}
              count={t.countKey != null ? counts[t.countKey] : undefined}
            />
          ))}
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "4px 0 10px", color: "var(--grim-ink-4)", fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: ".10em" }}>❦</div>

      {/* Instruments of the Master */}
      <section>
        <h2 className="grim-h-section">Instruments of the Master</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {TOOL_TOMES.map((t, i) => (
            <AdminTome key={i} {...t} />
          ))}
        </div>
      </section>

    </div>
  );
}
