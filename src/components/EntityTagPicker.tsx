"use client";

import { useState } from "react";

interface EntityItem {
  id: string;
  name: string;
}

interface EntityTagPickerProps {
  npcs: EntityItem[];
  locations?: EntityItem[];
  quests?: EntityItem[];
  items?: EntityItem[];
  factions?: EntityItem[];
  deities?: EntityItem[];
  pcs?: EntityItem[];
  selectedNpcs: string[];
  selectedLocations?: string[];
  selectedQuests?: string[];
  selectedItems?: string[];
  selectedFactions?: string[];
  selectedDeities?: string[];
  selectedPcs?: string[];
  onNpcsChange: (ids: string[]) => void;
  onLocationsChange?: (ids: string[]) => void;
  onQuestsChange?: (ids: string[]) => void;
  onItemsChange?: (ids: string[]) => void;
  onFactionsChange?: (ids: string[]) => void;
  onDeitiesChange?: (ids: string[]) => void;
  onPcsChange?: (ids: string[]) => void;
}

type Tab = "npcs" | "locations" | "quests" | "items" | "factions" | "deities" | "pcs";

export default function EntityTagPicker({
  npcs,
  locations = [],
  quests = [],
  items = [],
  factions = [],
  deities = [],
  pcs = [],
  selectedNpcs,
  selectedLocations = [],
  selectedQuests = [],
  selectedItems = [],
  selectedFactions = [],
  selectedDeities = [],
  selectedPcs = [],
  onNpcsChange,
  onLocationsChange,
  onQuestsChange,
  onItemsChange,
  onFactionsChange,
  onDeitiesChange,
  onPcsChange,
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
  const filteredPcs = pcs.filter(p => p.name.toLowerCase().includes(q));

  const toggle = (id: string, selected: string[], onChange: (ids: string[]) => void) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const totalSelected =
    selectedNpcs.length + selectedLocations.length + selectedQuests.length +
    selectedItems.length + selectedFactions.length + selectedDeities.length + selectedPcs.length;

  const tabClass = (tab: Tab) =>
    `py-2 px-3.5 font-head text-sm tracking-wider-3 uppercase cursor-pointer border-none transition-colors duration-150 ${
      activeTab === tab ? "bg-grim-ember" : "bg-transparent"
    }`;

  const tabTextStyle = (tab: Tab): React.CSSProperties => ({
    color: activeTab === tab ? "oklch(0.98 0.02 80)" : "var(--grim-ink-3)",
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
      return <div className="py-3 px-3.5 text-grim-ink-4 font-body text-lg">{emptyMsg}</div>;
    }
    return items.map(item => (
      <label key={item.id} className={`flex items-center gap-2.5 py-1.5 px-3.5 cursor-pointer ${selected.includes(item.id) ? "bg-grim-ember/12" : "bg-transparent"}`}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id, selected, onChange)} style={{ accentColor: accent }} />
        <span className="font-body text-lg text-grim-ink-2">{item.name}</span>
      </label>
    ));
  }

  return (
    <div>
      <div className="grim-label mb-2">
        Tagged Souls, Places, Errands, Relics, Banners &amp; Divinities
        {totalSelected > 0 && (
          <span className="grim-chip is-ember ml-2 text-sm py-0 px-2">
            {totalSelected}
          </span>
        )}
      </div>

      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {selectedNpcs.map(id => {
            const n = npcs.find(x => x.id === id);
            return n ? (
              <span key={id} className="grim-chip is-ember text-sm cursor-pointer flex items-center gap-1" onClick={() => toggle(id, selectedNpcs, onNpcsChange)}>
                {n.name} ×
              </span>
            ) : null;
          })}
          {selectedLocations.map(id => {
            const l = locations.find(x => x.id === id);
            return l ? (
              <span key={id} className="grim-chip is-arcane text-sm cursor-pointer flex items-center gap-1" onClick={() => toggle(id, selectedLocations, onLocationsChange ?? (() => {}))}>
                {l.name} ×
              </span>
            ) : null;
          })}
          {selectedPcs.map(id => {
            const p = pcs.find(x => x.id === id);
            return p ? (
              <span key={id} className="grim-chip text-sm cursor-pointer flex items-center gap-1 bg-grim-moss/18 border border-grim-moss/45 text-grim-moss" onClick={() => toggle(id, selectedPcs, onPcsChange ?? (() => {}))}>
                {p.name} ×
              </span>
            ) : null;
          })}
          {selectedQuests.map(id => {
            const qt = quests.find(x => x.id === id);
            return qt ? (
              <span key={id} className="grim-chip is-faction text-sm cursor-pointer flex items-center gap-1" onClick={() => toggle(id, selectedQuests, onQuestsChange ?? (() => {}))}>
                {qt.name} ×
              </span>
            ) : null;
          })}
          {selectedItems.map(id => {
            const it = items.find(x => x.id === id);
            return it ? (
              <span key={id} className="grim-chip text-sm cursor-pointer flex items-center gap-1 bg-grim-moss/18 border border-grim-moss/45 text-grim-moss" onClick={() => toggle(id, selectedItems, onItemsChange ?? (() => {}))}>
                ⚔ {it.name} ×
              </span>
            ) : null;
          })}
          {selectedFactions.map(id => {
            const f = factions.find(x => x.id === id);
            return f ? (
              <span key={id} className="grim-chip text-sm cursor-pointer flex items-center gap-1 bg-grim-arcane-bg border border-grim-arcane-border text-grim-arcane" onClick={() => toggle(id, selectedFactions, onFactionsChange ?? (() => {}))}>
                ⚑ {f.name} ×
              </span>
            ) : null;
          })}
          {selectedDeities.map(id => {
            const d = deities.find(x => x.id === id);
            return d ? (
              <span key={id} className="grim-chip text-sm cursor-pointer flex items-center gap-1 bg-grim-gold-bg border border-grim-gold-border text-grim-gold" onClick={() => toggle(id, selectedDeities, onDeitiesChange ?? (() => {}))}>
                ✦ {d.name} ×
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="border border-grim-line-2 bg-grim-bg-3">
        <div className="flex flex-wrap border-b border-grim-line">
          <button type="button" className={tabClass("npcs")} style={tabTextStyle("npcs")} onClick={() => setActiveTab("npcs")}>
            NPCs ({selectedNpcs.length}/{npcs.length})
          </button>
          {locations.length > 0 && onLocationsChange && (
            <button type="button" className={tabClass("locations")} style={tabTextStyle("locations")} onClick={() => setActiveTab("locations")}>
              Locations ({selectedLocations.length}/{locations.length})
            </button>
          )}
          {pcs.length > 0 && onPcsChange && (
            <button type="button" className={tabClass("pcs")} style={tabTextStyle("pcs")} onClick={() => setActiveTab("pcs")}>
              PCs ({selectedPcs.length}/{pcs.length})
            </button>
          )}
          {quests.length > 0 && onQuestsChange && (
            <button type="button" className={tabClass("quests")} style={tabTextStyle("quests")} onClick={() => setActiveTab("quests")}>
              Quests ({selectedQuests.length}/{quests.length})
            </button>
          )}
          {items.length > 0 && onItemsChange && (
            <button type="button" className={tabClass("items")} style={tabTextStyle("items")} onClick={() => setActiveTab("items")}>
              Items ({selectedItems.length}/{items.length})
            </button>
          )}
          {factions.length > 0 && onFactionsChange && (
            <button type="button" className={tabClass("factions")} style={tabTextStyle("factions")} onClick={() => setActiveTab("factions")}>
              Factions ({selectedFactions.length}/{factions.length})
            </button>
          )}
          {deities.length > 0 && onDeitiesChange && (
            <button type="button" className={tabClass("deities")} style={tabTextStyle("deities")} onClick={() => setActiveTab("deities")}>
              Deities ({selectedDeities.length}/{deities.length})
            </button>
          )}
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter…"
            className="bg-transparent border-l border-grim-line text-grim-ink font-body text-base py-1.5 px-2.5 outline-none"
            style={{ width: 120 }}
          />
        </div>

        <div className="max-h-44 overflow-y-auto py-1.5 px-0">
          {activeTab === "npcs" ? (
            filteredNpcs.length === 0
              ? <div className="py-3 px-3.5 text-grim-ink-4 font-body text-lg">No NPCs found</div>
              : filteredNpcs.map(n => (
                <label key={n.id} className={`flex items-center gap-2.5 py-1.5 px-3.5 cursor-pointer ${selectedNpcs.includes(n.id) ? "bg-grim-ember/12" : "bg-transparent"}`}>
                  <input type="checkbox" checked={selectedNpcs.includes(n.id)} onChange={() => toggle(n.id, selectedNpcs, onNpcsChange)} className="accent-grim-ember" />
                  <span className="font-body text-lg text-grim-ink-2">{n.name}</span>
                </label>
              ))
          ) : activeTab === "locations" ? (
            filteredLocations.length === 0
              ? <div className="py-3 px-3.5 text-grim-ink-4 font-body text-lg">No locations found</div>
              : filteredLocations.map(l => (
                <label key={l.id} className="flex items-center gap-2.5 py-1.5 px-3.5 cursor-pointer" style={{ background: selectedLocations.includes(l.id) ? "oklch(0.55 0.15 285 / 0.12)" : "transparent" }}>
                  <input type="checkbox" checked={selectedLocations.includes(l.id)} onChange={() => toggle(l.id, selectedLocations, onLocationsChange ?? (() => {}))} className="accent-grim-arcane" />
                  <span className="font-body text-lg text-grim-ink-2">{l.name}</span>
                </label>
              ))
          ) : activeTab === "pcs" ? (
            renderList(filteredPcs, selectedPcs, onPcsChange, "var(--grim-moss)", "No PCs found")
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
