"use client";

import { useState } from "react";

interface EntityItem {
  id: string;
  name: string;
}

interface EntityTagPickerProps {
  npcs: EntityItem[];
  locations: EntityItem[];
  quests?: EntityItem[];
  items?: EntityItem[];
  selectedNpcs: string[];
  selectedLocations: string[];
  selectedQuests?: string[];
  selectedItems?: string[];
  onNpcsChange: (ids: string[]) => void;
  onLocationsChange: (ids: string[]) => void;
  onQuestsChange?: (ids: string[]) => void;
  onItemsChange?: (ids: string[]) => void;
}

type Tab = "npcs" | "locations" | "quests" | "items";

export default function EntityTagPicker({
  npcs,
  locations,
  quests = [],
  items = [],
  selectedNpcs,
  selectedLocations,
  selectedQuests = [],
  selectedItems = [],
  onNpcsChange,
  onLocationsChange,
  onQuestsChange,
  onItemsChange,
}: EntityTagPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("npcs");

  const q = search.toLowerCase();
  const filteredNpcs = npcs.filter(n => n.name.toLowerCase().includes(q));
  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(q));
  const filteredQuests = quests.filter(qt => qt.name.toLowerCase().includes(q));
  const filteredItems = items.filter(it => it.name.toLowerCase().includes(q));

  const toggleNpc = (id: string) => {
    onNpcsChange(selectedNpcs.includes(id) ? selectedNpcs.filter(x => x !== id) : [...selectedNpcs, id]);
  };
  const toggleLocation = (id: string) => {
    onLocationsChange(selectedLocations.includes(id) ? selectedLocations.filter(x => x !== id) : [...selectedLocations, id]);
  };
  const toggleQuest = (id: string) => {
    if (!onQuestsChange) return;
    onQuestsChange(selectedQuests.includes(id) ? selectedQuests.filter(x => x !== id) : [...selectedQuests, id]);
  };
  const toggleItem = (id: string) => {
    if (!onItemsChange) return;
    onItemsChange(selectedItems.includes(id) ? selectedItems.filter(x => x !== id) : [...selectedItems, id]);
  };

  const totalSelected = selectedNpcs.length + selectedLocations.length + selectedQuests.length + selectedItems.length;

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "7px 14px",
    fontFamily: "var(--font-head)",
    fontSize: 11,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "none",
    background: activeTab === tab ? "var(--grim-ember)" : "transparent",
    color: activeTab === tab ? "oklch(0.98 0.02 80)" : "var(--grim-ink-3)",
    transition: "background 0.15s",
  });

  return (
    <div>
      <div className="grim-label" style={{ marginBottom: 8 }}>
        Tagged Souls, Places, Errands &amp; Relics
        {totalSelected > 0 && (
          <span className="grim-chip is-ember" style={{ marginLeft: 8, fontSize: 10, padding: "1px 7px" }}>
            {totalSelected}
          </span>
        )}
      </div>

      {totalSelected > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {selectedNpcs.map(id => {
            const n = npcs.find(x => x.id === id);
            if (!n) return null;
            return (
              <span key={id} className="grim-chip is-ember" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggleNpc(id)}>
                {n.name} ×
              </span>
            );
          })}
          {selectedLocations.map(id => {
            const l = locations.find(x => x.id === id);
            if (!l) return null;
            return (
              <span key={id} className="grim-chip is-arcane" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggleLocation(id)}>
                {l.name} ×
              </span>
            );
          })}
          {selectedQuests.map(id => {
            const qt = quests.find(x => x.id === id);
            if (!qt) return null;
            return (
              <span key={id} className="grim-chip is-faction" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggleQuest(id)}>
                {qt.name} ×
              </span>
            );
          })}
          {selectedItems.map(id => {
            const it = items.find(x => x.id === id);
            if (!it) return null;
            return (
              <span key={id} className="grim-chip" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "oklch(0.55 0.090 145 / 0.18)", border: "1px solid oklch(0.55 0.090 145 / 0.45)", color: "var(--grim-moss)" }} onClick={() => toggleItem(id)}>
                ⚔ {it.name} ×
              </span>
            );
          })}
        </div>
      )}

      <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--grim-line)" }}>
          <button type="button" style={tabStyle("npcs")} onClick={() => setActiveTab("npcs")}>
            NPCs ({selectedNpcs.length}/{npcs.length})
          </button>
          <button type="button" style={tabStyle("locations")} onClick={() => setActiveTab("locations")}>
            Locations ({selectedLocations.length}/{locations.length})
          </button>
          {quests.length > 0 && onQuestsChange && (
            <button type="button" style={tabStyle("quests")} onClick={() => setActiveTab("quests")}>
              Quests ({selectedQuests.length}/{quests.length})
            </button>
          )}
          {items.length > 0 && onItemsChange && (
            <button type="button" style={tabStyle("items")} onClick={() => setActiveTab("items")}>
              Items ({selectedItems.length}/{items.length})
            </button>
          )}
          <div style={{ flex: 1 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter…"
            style={{
              background: "transparent",
              border: "none",
              borderLeft: "1px solid var(--grim-line)",
              color: "var(--grim-ink)",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              padding: "6px 10px",
              outline: "none",
              width: 120,
            }}
          />
        </div>

        <div style={{ maxHeight: 180, overflowY: "auto", padding: "6px 0" }}>
          {activeTab === "npcs" ? (
            filteredNpcs.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No NPCs found</div>
            ) : (
              filteredNpcs.map(n => (
                <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedNpcs.includes(n.id) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedNpcs.includes(n.id)} onChange={() => toggleNpc(n.id)} style={{ accentColor: "var(--grim-ember)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{n.name}</span>
                </label>
              ))
            )
          ) : activeTab === "locations" ? (
            filteredLocations.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No locations found</div>
            ) : (
              filteredLocations.map(l => (
                <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedLocations.includes(l.id) ? "oklch(0.55 0.15 285 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedLocations.includes(l.id)} onChange={() => toggleLocation(l.id)} style={{ accentColor: "var(--grim-arcane)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{l.name}</span>
                </label>
              ))
            )
          ) : activeTab === "quests" ? (
            filteredQuests.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No quests found</div>
            ) : (
              filteredQuests.map(qt => (
                <label key={qt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedQuests.includes(qt.id) ? "oklch(0.85 0.12 85 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedQuests.includes(qt.id)} onChange={() => toggleQuest(qt.id)} style={{ accentColor: "var(--grim-gold)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{qt.name}</span>
                </label>
              ))
            )
          ) : (
            filteredItems.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No items found</div>
            ) : (
              filteredItems.map(it => (
                <label key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedItems.includes(it.id) ? "oklch(0.55 0.090 145 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedItems.includes(it.id)} onChange={() => toggleItem(it.id)} style={{ accentColor: "var(--grim-moss)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{it.name}</span>
                </label>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
