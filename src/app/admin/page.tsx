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
    <Link href={href} className="no-underline text-inherit block">
      <div className="grim-tome py-5 px-5.5 cursor-pointer flex gap-4 items-center">
        <div
          className="w-13 h-13 shrink-0 flex items-center justify-center font-display text-4xl border"
          style={{
            background: TINT_BG[tint],
            color: "oklch(0.94 0.05 70)",
            borderColor: TINT_BORDER[tint],
            borderRadius: 1,
            boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)",
          }}
        >{glyph}</div>
        <div className="flex-1 min-w-0">
          <div className="font-head text-xl tracking-wider uppercase text-grim-ink">{title}</div>
          <div className="grim-mono text-sm tracking-wider-2 text-grim-ink-3 uppercase mt-1">{sub}</div>
        </div>
        {count != null && (
          <div className="text-right shrink-0">
            <div className="font-display text-4xl text-grim-gold leading-none">{count}</div>
            <div className="grim-mono text-xs tracking-wider-4 text-grim-ink-4 uppercase mt-0.5">entries</div>
          </div>
        )}
        <span className={`text-grim-ink-4 font-display text-2xl ${count != null ? "ml-2" : "ml-0"}`}>›</span>
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
    <div className="pt-9 px-12 pb-20">

      {/* Masthead */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Master&apos;s hand</div>
          <h1 className="grim-page-title text-7xl">The Scriptorium</h1>
          <p className="grim-page-sub">Tend the tomes of the campaign — souls, banners, errands, and the turning of the world&apos;s calendar.</p>
        </div>
        {user && (
          <div className="text-right pb-1.5 shrink-0">
            <div className="grim-label mb-1">Signed in as</div>
            <div className="font-display text-3xl text-grim-gold leading-none">The Master</div>
            <div className="flex gap-1.5 justify-end mt-1.5 items-center">
              <span className="grim-chip is-ember">admin</span>
              <span className="grim-mono text-sm text-grim-ink-3 tracking-wider-3">{user.email}</span>
            </div>
          </div>
        )}
      </header>

      {/* Quick overview ledger */}
      <section className="grim-tome is-bordered mb-7.5 p-0 overflow-hidden">
        <div className="grid grid-cols-4">
          {([
            { n: counts.npcs,      l: "Souls inscribed", glyph: "☥", tint: "ember"  as Tint },
            { n: counts.quests,    l: "Errands afoot",   glyph: "✦", tint: "moss"   as Tint },
            { n: counts.locations, l: "Places mapped",   glyph: "✠", tint: "arcane" as Tint },
            { n: counts.factions,  l: "Banners raised",  glyph: "⚑", tint: "gold"   as Tint },
          ] as { n: number | undefined; l: string; glyph: string; tint: Tint }[]).map((s, i) => (
            <div
              key={i}
              className={`py-5.5 px-6.5 ${i > 0 ? "border-l border-grim-line" : ""}`}
              style={{ background: "linear-gradient(180deg, oklch(0.17 0.035 285), oklch(0.135 0.030 290))" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-2xl" style={{ color: TINT_BORDER[s.tint] }}>{s.glyph}</span>
                <span className="grim-mono text-xs tracking-widest-4 text-grim-ink-4 uppercase">{s.l}</span>
              </div>
              <div className="font-display text-6xl text-grim-gold" style={{ lineHeight: 0.9, textShadow: "0 0 28px oklch(0.72 0.165 48 / 0.15)" }}>
                {s.n ?? <span className="text-3xl text-grim-ink-4">—</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tomes of Record */}
      <section className="mb-7.5">
        <h2 className="grim-h-section">Tomes of Record</h2>
        <div className="grid grid-cols-3 gap-3.5">
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

      <div className="text-center pt-1 px-0 pb-2.5 text-grim-ink-4 font-display text-4xl tracking-widest">❦</div>

      {/* Instruments of the Master */}
      <section>
        <h2 className="grim-h-section">Instruments of the Master</h2>
        <div className="grid grid-cols-3 gap-3.5">
          {TOOL_TOMES.map((t, i) => (
            <AdminTome key={i} {...t} />
          ))}
        </div>
      </section>

    </div>
  );
}
