"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NPC, Location, Faction, Item, Deity, CalendarWeekday, CalendarMonth, CalendarData } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

const FILTERS = [
  { id: "all",       label: "All Tongues" },
  { id: "npcs",      label: "Souls" },
  { id: "locations", label: "Places" },
  { id: "factions",  label: "Banners" },
  { id: "items",     label: "Relics" },
  { id: "deities",   label: "Divinities" },
  { id: "months",    label: "Months" },
  { id: "days",      label: "Days" },
];

function PronGrid({ items }: { items: Array<{ name: string; pronunciation?: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="py-3.5 px-4 bg-grim-bg-overlay/60 border border-grim-line flex flex-col gap-1.5">
          <div className="font-head text-xl text-grim-ink tracking-wide">{item.name}</div>
          <div className="grim-mono text-lg text-grim-ember-2 tracking-wider">
            {item.pronunciation || <span className="text-grim-ink-4">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PronSection({ glyph, title, items }: { glyph: string; title: string; items: Array<{ name: string; pronunciation?: string }> }) {
  return (
    <section className="grim-tome mb-5.5">
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

  const { data: npcData = [], isPending: loading } = useQuery<NPC[]>({
    queryKey: ['/api/data/npcs'],
    queryFn: () => authFetch('/api/data/npcs').then(r => r.ok ? r.json() : []),
  });
  const { data: locationData = [] } = useQuery<Location[]>({
    queryKey: ['/api/data/locations'],
    queryFn: () => authFetch('/api/data/locations').then(r => r.ok ? r.json() : []),
  });
  const { data: factionData = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
  });
  const { data: itemData = [] } = useQuery<Item[]>({
    queryKey: ['/api/data/items'],
    queryFn: () => authFetch('/api/data/items').then(r => r.ok ? r.json() : []),
  });
  const { data: deityData = [] } = useQuery<Deity[]>({
    queryKey: ['/api/data/deities'],
    queryFn: () => authFetch('/api/data/deities').then(r => r.ok ? r.json() : []),
  });
  const { data: calendarData = null } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: () => authFetch('/api/data/calendar').then(r => r.ok ? r.json() : null),
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
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

  const visibleItems = itemData
    .filter((it) => !it.hidden && it.pronunciation)
    .map((it) => ({ name: it.name, pronunciation: it.pronunciation }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const visibleDeities = deityData
    .filter((d) => !d.hidden && d.pronunciation)
    .map((d) => ({ name: d.name, pronunciation: d.pronunciation }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

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
  const filteredItems     = (activeFilter === "all" || activeFilter === "items")     ? filterItems(visibleItems)     : [];
  const filteredDeities   = (activeFilter === "all" || activeFilter === "deities")   ? filterItems(visibleDeities)   : [];
  const filteredMonths    = (activeFilter === "all" || activeFilter === "months")    ? filterItems(calendarMonths)   : [];
  const filteredWeekdays  = (activeFilter === "all" || activeFilter === "days")      ? filterItems(calendarWeekdays) : [];

  const totalResults = filteredNPCs.length + filteredLocations.length + filteredFactions.length + filteredItems.length + filteredDeities.length + filteredMonths.length + filteredWeekdays.length;

  return (
    <div className="pt-9 px-14 pb-20 overflow-y-auto h-full">

      {/* Page header */}
      <div className="flex justify-between items-end mb-5.5">
        <div>
          <div className="grim-page-eyebrow">The Appendix of Tongues</div>
          <h1 className="grim-page-title">How It Is Said</h1>
          <p className="grim-page-sub">A scrivener&apos;s guide to the names, places, and banners of the Bounty — that no DM stumble mid-sentence.</p>
        </div>
        <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2 text-right uppercase">
          {totalResults} pronunciations
        </div>
      </div>

      {/* Search + filter bar */}
      <section className="flex gap-3 items-stretch mb-6">
        <div className="relative flex-1 min-w-70">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Sound out a name or place…"
            className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
          />
          <span
            className="absolute left-3.5 text-grim-gold-2 text-2xl pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >✦</span>
        </div>
        <div className="flex gap-1 p-1 bg-grim-bg-3 border border-grim-line">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`grim-btn ${activeFilter === f.id ? "is-ember" : "is-ghost"} py-1.5 px-3.5 border ${activeFilter === f.id ? "border-grim-ember" : "border-transparent"} ${activeFilter === f.id ? "" : "bg-transparent"}`}
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
        <PronSection glyph="⚑" title="Banners & Orders" items={filteredFactions} />
      )}
      {filteredItems.length > 0 && (
        <PronSection glyph="⚔" title="Relics & Artefacts" items={filteredItems} />
      )}
      {filteredDeities.length > 0 && (
        <PronSection glyph="✦" title="Divinities & Powers" items={filteredDeities} />
      )}
      {filteredMonths.length > 0 && (
        <PronSection glyph="☽" title="Months of the Realm" items={filteredMonths} />
      )}
      {filteredWeekdays.length > 0 && (
        <PronSection glyph="✦" title="Days of the Tenday" items={filteredWeekdays} />
      )}

      {/* Empty state */}
      {totalResults === 0 && (
        <div className="text-center py-15 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3 mb-2">~ no tongues found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mb-4.5">
            Adjust your search or filter
          </div>
          <button
            className="grim-btn is-ghost py-2 px-5"
            onClick={() => { setSearchTerm(""); setActiveFilter("all"); }}
          >
            Show All Pronunciations
          </button>
        </div>
      )}
    </div>
  );
}
