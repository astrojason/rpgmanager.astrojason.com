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
    <div style={{ padding: "36px 48px 80px" }}>
      <header style={{ marginBottom: 28 }}>
        <div className="grim-page-eyebrow">Behind the Screen · Tomes</div>
        <h1 className="grim-page-title" style={{ fontSize: 58 }}>Tomes of Record</h1>
        <p className="grim-page-sub">All the campaign data — souls, banners, errands, and the world entire.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {DATA_TYPES.map((type) => (
          <Link key={type.href} href={type.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div className="grim-tome" style={{ padding: "20px 22px", cursor: "pointer", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{
                width: 52, height: 52, flexShrink: 0, borderRadius: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontSize: 28,
                background: TINT_BG[type.tint], color: "oklch(0.94 0.05 70)",
                border: "1px solid " + TINT_BORDER[type.tint],
                boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.2)",
              }}>{type.glyph}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--grim-ink)" }}>{type.name}</div>
                <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 3 }}>{type.sub}</div>
              </div>
              <span style={{ color: "var(--grim-ink-4)", fontFamily: "var(--font-display)", fontSize: 20 }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
