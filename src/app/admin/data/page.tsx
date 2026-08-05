"use client";

import Link from "next/link";

const DATA_TYPES = [
  { glyph: "☥", name: "NPCs",             href: "/admin/data/npcs",      sub: "Souls & strangers",      tint: "ember" },
  { glyph: "⚑", name: "Factions",          href: "/admin/data/factions",  sub: "Banners & cabals",       tint: "gold" },
  { glyph: "✠", name: "Locations",         href: "/admin/data/locations", sub: "Towns & landmarks",      tint: "arcane" },
  { glyph: "⚔", name: "Player Characters", href: "/admin/data/pcs",       sub: "The fellowship",         tint: "moss" },
  { glyph: "✦", name: "Quests",            href: "/admin/data/quests",    sub: "Errands & threads",      tint: "ember" },
  { glyph: "✠", name: "Calendar",          href: "/admin/data/calendar",  sub: "World calendar & dates", tint: "gold" },
  { glyph: "☾", name: "Timeline",          href: "/admin/data/timeline",  sub: "Events of the realm",    tint: "arcane" },
  { glyph: "✎", name: "Session Recaps",    href: "/admin/data/recaps",    sub: "Chronicle the sessions", tint: "arcane" },
  { glyph: "⚔", name: "Items",             href: "/admin/data/items",     sub: "Relics & artefacts",     tint: "gold" },
  { glyph: "✦", name: "Deities",           href: "/admin/data/deities",   sub: "Gods & divine forces",   tint: "gold" },
] as const;

const TINT_BG: Record<string, string> = {
  ember:  "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.25 0.08 35))",
  arcane: "linear-gradient(180deg, oklch(0.30 0.10 285), oklch(0.20 0.06 290))",
  gold:   "linear-gradient(180deg, oklch(0.45 0.10 80), oklch(0.30 0.08 78))",
  moss:   "linear-gradient(180deg, oklch(0.38 0.09 145), oklch(0.24 0.06 145))",
};
const TINT_BORDER: Record<string, string> = {
  ember:  "var(--grim-ember)",
  arcane: "var(--grim-arcane)",
  gold:   "var(--grim-gold-2)",
  moss:   "oklch(0.55 0.090 145)",
};

export default function DataManagementPage() {
  return (
    <div className="pt-9 px-12 pb-20">
      <header className="mb-7">
        <div className="grim-page-eyebrow">Behind the Screen · Tomes</div>
        <h1 className="grim-page-title text-7xl">Tomes of Record</h1>
        <p className="grim-page-sub">All the campaign data — souls, banners, errands, and the world entire.</p>
      </header>

      <div className="grid grid-cols-3 gap-3.5">
        {DATA_TYPES.map((type) => (
          <Link key={type.href} href={type.href} className="no-underline text-inherit block">
            <div className="grim-tome py-5 px-5.5 cursor-pointer flex gap-4 items-center">
              <div
                className="w-13 h-13 shrink-0 flex items-center justify-center font-display text-4xl border"
                style={{
                  background: TINT_BG[type.tint],
                  color: "oklch(0.94 0.05 70)",
                  borderColor: TINT_BORDER[type.tint],
                  borderRadius: 1,
                  boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)",
                }}
              >{type.glyph}</div>
              <div className="flex-1 min-w-0">
                <div className="font-head text-xl tracking-wider uppercase text-grim-ink">{type.name}</div>
                <div className="grim-mono text-sm tracking-wider-2 text-grim-ink-3 uppercase mt-1">{type.sub}</div>
              </div>
              <span className="text-grim-ink-4 font-display text-2xl">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
