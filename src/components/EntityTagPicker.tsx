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
  factions?: EntityItem[];
  deities?: EntityItem[];
  selectedNpcs: string[];
  selectedLocations: string[];
  selectedQuests?: string[];
  selectedItems?: string[];
  selectedFactions?: string[];
  selectedDeities?: string[];
  onNpcsChange: (ids: string[]) => void;
  onLocationsChange: (ids: string[]) => void;
  onQuestsChange?: (ids: string[]) => void;
  onItemsChange?: (ids: string[]) => void;
  onFactionsChange?: (ids: string[]) => void;
  onDeitiesChange?: (ids: string[]) => void;
}

type Tab = "npcs" | "locations" | "quests" | "items" | "factions" | "deities";

export default function EntityTagPicker({
  npcs,
  locations,
  quests = [],
  items = [],
  factions = [],
  deities = [],
  selectedNpcs,
  selectedLocations,
  selectedQuests = [],
  selectedItems = [],
  selectedFactions = [],
  selectedDeities = [],
  onNpcsChange,
  onLocationsChange,
  onQuestsChange,
  onItemsChange,
  onFactionsChange,
  onDeitiesChange,
}: EntityTagPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("npcs");

  const q = search.toLowerCase();
  const filteredNpcs = npcs.filter(n => n.name.toLowerCase().includes(q));
  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(q));
  const filteredQuests = quests.filter(qt => qt.name.toLowerCase().includes(q));
  const filteredItems = items.filter(it => it.name.toLowerCase().includes(q));
  const filteredFactions = factions.filter(f => f.name.toLowerCase().includes(q));
  const filteredDeities = deities.filter(d => d.name.toLowerCase().includes(q));

  const toggle = (id: string, selected: string[], onChange: (ids: string[]) => void) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const totalSelected =
    selectedNpcs.length + selectedLocations.length + selectedQuests.length +
    selectedItems.length + selectedFactions.length + selectedDeities.length;

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

  function renderList(
    items: EntityItem[],
    selected: string[],
    onChange: ((ids: string[]) => void) | undefined,
    accent: string,
    emptyMsg: string
  ) {
    if (!onChange) return null;
    if (items.length === 0) {
      return <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>{emptyMsg}</div>;
    }
    return items.map(item => (
      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selected.includes(item.id) ? `oklch(0.72 0.165 48 / 0.12)` : "transparent" }}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id, selected, onChange)} style={{ accentColor: accent }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{item.name}</span>
      </label>
    ));
  }

  return (
    <div>
      <div className="grim-label" style={{ marginBottom: 8 }}>
        Tagged Souls, Places, Errands, Relics, Banners &amp; Divinities
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
            return n ? (
              <span key={id} className="grim-chip is-ember" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggle(id, selectedNpcs, onNpcsChange)}>
                {n.name} ×
              </span>
            ) : null;
          })}
          {selectedLocations.map(id => {
            const l = locations.find(x => x.id === id);
            return l ? (
              <span key={id} className="grim-chip is-arcane" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggle(id, selectedLocations, onLocationsChange)}>
                {l.name} ×
              </span>
            ) : null;
          })}
          {selectedQuests.map(id => {
            const qt = quests.find(x => x.id === id);
            return qt ? (
              <span key={id} className="grim-chip is-faction" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => toggle(id, selectedQuests, onQuestsChange ?? (() => {}))}>
                {qt.name} ×
              </span>
            ) : null;
          })}
          {selectedItems.map(id => {
            const it = items.find(x => x.id === id);
            return it ? (
              <span key={id} className="grim-chip" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "oklch(0.55 0.090 145 / 0.18)", border: "1px solid oklch(0.55 0.090 145 / 0.45)", color: "var(--grim-moss)" }} onClick={() => toggle(id, selectedItems, onItemsChange ?? (() => {}))}>
                ⚔ {it.name} ×
              </span>
            ) : null;
          })}
          {selectedFactions.map(id => {
            const f = factions.find(x => x.id === id);
            return f ? (
              <span key={id} className="grim-chip" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "oklch(0.50 0.14 285 / 0.18)", border: "1px solid oklch(0.50 0.14 285 / 0.45)", color: "var(--grim-arcane)" }} onClick={() => toggle(id, selectedFactions, onFactionsChange ?? (() => {}))}>
                ⚑ {f.name} ×
              </span>
            ) : null;
          })}
          {selectedDeities.map(id => {
            const d = deities.find(x => x.id === id);
            return d ? (
              <span key={id} className="grim-chip" style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "oklch(0.55 0.10 60 / 0.18)", border: "1px solid oklch(0.55 0.10 60 / 0.45)", color: "var(--grim-gold)" }} onClick={() => toggle(id, selectedDeities, onDeitiesChange ?? (() => {}))}>
                ✦ {d.name} ×
              </span>
            ) : null;
          })}
        </div>
      )}

      <div style={{ border: "1px solid var(--grim-line-2)", background: "var(--grim-bg-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--grim-line)" }}>
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
          {factions.length > 0 && onFactionsChange && (
            <button type="button" style={tabStyle("factions")} onClick={() => setActiveTab("factions")}>
              Factions ({selectedFactions.length}/{factions.length})
            </button>
          )}
          {deities.length > 0 && onDeitiesChange && (
            <button type="button" style={tabStyle("deities")} onClick={() => setActiveTab("deities")}>
              Deities ({selectedDeities.length}/{deities.length})
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
            filteredNpcs.length === 0
              ? <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No NPCs found</div>
              : filteredNpcs.map(n => (
                <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedNpcs.includes(n.id) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedNpcs.includes(n.id)} onChange={() => toggle(n.id, selectedNpcs, onNpcsChange)} style={{ accentColor: "var(--grim-ember)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{n.name}</span>
                </label>
              ))
          ) : activeTab === "locations" ? (
            filteredLocations.length === 0
              ? <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>No locations found</div>
              : filteredLocations.map(l => (
                <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", cursor: "pointer", background: selectedLocations.includes(l.id) ? "oklch(0.55 0.15 285 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedLocations.includes(l.id)} onChange={() => toggle(l.id, selectedLocations, onLocationsChange)} style={{ accentColor: "var(--grim-arcane)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>{l.name}</span>
                </label>
              ))
          ) : activeTab === "quests" ? (
            renderList(filteredQuests, selectedQuests, onQuestsChange, "var(--grim-gold)", "No quests found")
          ) : activeTab === "items" ? (
            renderList(filteredItems, selectedItems, onItemsChange, "var(--grim-moss)", "No items found")
          ) : activeTab === "factions" ? (
            renderList(filteredFactions, selectedFactions, onFactionsChange, "var(--grim-arcane)", "No factions found")
          ) : (
            renderList(filteredDeities, selectedDeities, onDeitiesChange, "var(--grim-gold)", "No deities found")
          )}
        </div>
      </div>
    </div>
  );
}
