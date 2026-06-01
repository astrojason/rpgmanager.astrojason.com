"use client";

import { useState } from "react";

interface EntityItem {
  id: string;
  name: string;
}

interface EntityTagPickerProps {
  npcs: EntityItem[];
  locations: EntityItem[];
  selectedNpcs: string[];
  selectedLocations: string[];
  onNpcsChange: (ids: string[]) => void;
  onLocationsChange: (ids: string[]) => void;
}

export default function EntityTagPicker({
  npcs,
  locations,
  selectedNpcs,
  selectedLocations,
  onNpcsChange,
  onLocationsChange,
}: EntityTagPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"npcs" | "locations">("npcs");

  const q = search.toLowerCase();
  const filteredNpcs = npcs.filter(n => n.name.toLowerCase().includes(q));
  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(q));

  const toggleNpc = (id: string) => {
    onNpcsChange(
      selectedNpcs.includes(id)
        ? selectedNpcs.filter(x => x !== id)
        : [...selectedNpcs, id]
    );
  };

  const toggleLocation = (id: string) => {
    onLocationsChange(
      selectedLocations.includes(id)
        ? selectedLocations.filter(x => x !== id)
        : [...selectedLocations, id]
    );
  };

  const totalSelected = selectedNpcs.length + selectedLocations.length;

  const tabStyle = (tab: "npcs" | "locations"): React.CSSProperties => ({
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
        Tagged Souls & Places
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
              <span
                key={id}
                className="grim-chip is-ember"
                style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => toggleNpc(id)}
              >
                {n.name} ×
              </span>
            );
          })}
          {selectedLocations.map(id => {
            const l = locations.find(x => x.id === id);
            if (!l) return null;
            return (
              <span
                key={id}
                className="grim-chip is-arcane"
                style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => toggleLocation(id)}
              >
                {l.name} ×
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
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                No NPCs found
              </div>
            ) : (
              filteredNpcs.map(n => (
                <label
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 14px",
                    cursor: "pointer",
                    background: selectedNpcs.includes(n.id) ? "oklch(0.72 0.165 48 / 0.12)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedNpcs.includes(n.id)}
                    onChange={() => toggleNpc(n.id)}
                    style={{ accentColor: "var(--grim-ember)" }}
                  />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                    {n.name}
                  </span>
                </label>
              ))
            )
          ) : (
            filteredLocations.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                No locations found
              </div>
            ) : (
              filteredLocations.map(l => (
                <label
                  key={l.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 14px",
                    cursor: "pointer",
                    background: selectedLocations.includes(l.id) ? "oklch(0.55 0.15 285 / 0.12)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(l.id)}
                    onChange={() => toggleLocation(l.id)}
                    style={{ accentColor: "var(--grim-arcane)" }}
                  />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                    {l.name}
                  </span>
                </label>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
