"use client";

import { useState, useEffect } from "react";
import { NPC, Location, Faction, CalendarWeekday, CalendarMonth, CalendarData } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

const FILTERS = [
  { id: "all",       label: "All Tongues" },
  { id: "npcs",      label: "Souls" },
  { id: "locations", label: "Places" },
  { id: "factions",  label: "Banners" },
  { id: "months",    label: "Months" },
  { id: "days",      label: "Days" },
];

function PronGrid({ items }: { items: Array<{ name: string; pronunciation?: string }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: "14px 16px", background: "oklch(0.14 0.025 290 / 0.6)", border: "1px solid var(--grim-line)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--grim-ink)", letterSpacing: ".02em" }}>{item.name}</div>
          <div className="grim-mono" style={{ fontSize: 13, color: "var(--grim-ember-2)", letterSpacing: ".04em" }}>
            {item.pronunciation || <span style={{ color: "var(--grim-ink-4)" }}>—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PronSection({ glyph, title, items }: { glyph: string; title: string; items: Array<{ name: string; pronunciation?: string }> }) {
  return (
    <section className="grim-tome" style={{ marginBottom: 22 }}>
      <div className="grim-tome-head">
        <h3 className="grim-tome-title">{glyph} {title}</h3>
        <span className="grim-tome-sub">{items.length} entries</span>
      </div>
      <PronGrid items={items} />
    </section>
  );
}

export default function PronunciationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [npcData, setNpcData] = useState<NPC[]>([]);
  const [locationData, setLocationData] = useState<Location[]>([]);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [npcsRes, locsRes, factRes, calRes] = await Promise.all([
          authFetch('/api/data/npcs'),
          authFetch('/api/data/locations'),
          authFetch('/api/data/factions'),
          authFetch('/api/data/calendar'),
        ]);
        if (npcsRes.ok && locsRes.ok && factRes.ok && calRes.ok) {
          setNpcData(await npcsRes.json());
          setLocationData(await locsRes.json());
          setFactionData(await factRes.json());
          setCalendarData(await calRes.json());
        }
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the appendix&hellip;
        </div>
      </div>
    );
  }

  const flattenLocations = (data: Location[]): Array<{ name: string; pronunciation?: string }> => {
    let result: Array<{ name: string; pronunciation?: string }> = [];
    for (const loc of data) {
      result.push({ name: loc.name, pronunciation: loc.pronunciation });
      if (Array.isArray(loc.locations)) result = result.concat(flattenLocations(loc.locations));
    }
    return result;
  };

  const visibleNPCs = npcData
    .filter((npc) => !npc.hidden && !npc.nameHidden && !npc.hide_name)
    .map((npc) => ({ name: npc.name || npc.aka || "", pronunciation: npc.pronunciation || "" }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const allLocations = flattenLocations(locationData);
  const calendarMonths: CalendarMonth[] = calendarData?.static?.months ?? [];
  const calendarWeekdays: CalendarWeekday[] = calendarData?.static?.weekdays ?? [];

  const filterItems = (items: Array<{ name: string; pronunciation?: string }>) =>
    items.filter(
      (item) =>
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.pronunciation && item.pronunciation.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const filteredNPCs      = (activeFilter === "all" || activeFilter === "npcs")      ? filterItems(visibleNPCs)      : [];
  const filteredLocations = (activeFilter === "all" || activeFilter === "locations") ? filterItems(allLocations)     : [];
  const filteredFactions  = (activeFilter === "all" || activeFilter === "factions")  ? filterItems(factionData)      : [];
  const filteredMonths    = (activeFilter === "all" || activeFilter === "months")    ? filterItems(calendarMonths)   : [];
  const filteredWeekdays  = (activeFilter === "all" || activeFilter === "days")      ? filterItems(calendarWeekdays) : [];

  const totalResults = filteredNPCs.length + filteredLocations.length + filteredFactions.length + filteredMonths.length + filteredWeekdays.length;

  return (
    <div style={{ padding: "36px 56px 80px", overflowY: "auto", height: "100%" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="grim-page-eyebrow">The Appendix of Tongues</div>
          <h1 className="grim-page-title">How It Is Said</h1>
          <p className="grim-page-sub">A scrivener&apos;s guide to the names, places, and banners of the Bounty — that no DM stumble mid-sentence.</p>
        </div>
        <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em", textAlign: "right", textTransform: "uppercase" }}>
          {totalResults} pronunciations
        </div>
      </div>

      {/* Search + filter bar */}
      <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 24 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Sound out a name or place…"
            style={{
              width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)",
              color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16,
              padding: "12px 16px 12px 42px", outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18, pointerEvents: "none" }}>✦</span>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`grim-btn ${activeFilter === f.id ? "is-ember" : "is-ghost"}`}
              style={{
                padding: "6px 14px",
                border: "1px solid " + (activeFilter === f.id ? "var(--grim-ember)" : "transparent"),
                background: activeFilter === f.id ? undefined : "transparent",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sections */}
      {filteredNPCs.length > 0 && (
        <PronSection glyph="☥" title="Souls & Strangers" items={filteredNPCs} />
      )}
      {filteredLocations.length > 0 && (
        <PronSection glyph="✠" title="Places of the Realm" items={filteredLocations} />
      )}
      {filteredFactions.length > 0 && (
        <PronSection glyph="⚑" title="Banners & Relics" items={filteredFactions} />
      )}
      {filteredMonths.length > 0 && (
        <PronSection glyph="☽" title="Months of the Realm" items={filteredMonths} />
      )}
      {filteredWeekdays.length > 0 && (
        <PronSection glyph="✦" title="Days of the Tenday" items={filteredWeekdays} />
      )}

      {/* Empty state */}
      {totalResults === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>~ no tongues found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 18 }}>
            Adjust your search or filter
          </div>
          <button
            className="grim-btn is-ghost"
            style={{ padding: "8px 20px" }}
            onClick={() => { setSearchTerm(""); setActiveFilter("all"); }}
          >
            Show All Pronunciations
          </button>
        </div>
      )}
    </div>
  );
}
