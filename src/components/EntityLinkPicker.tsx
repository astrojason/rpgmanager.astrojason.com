"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export type LinkEntityType = "npc" | "pc" | "location" | "quest" | "item" | "faction" | "deity";

export interface LinkEntity {
  id: string;
  name: string;
  type: LinkEntityType;
  url: string;
}

interface EntityLinkPickerProps {
  entities: LinkEntity[];
  onSelect: (entity: LinkEntity) => void;
  onClose: () => void;
}

type Tab = LinkEntityType | "all";

const TYPE_LABELS: Record<LinkEntityType, string> = {
  npc: "NPCs",
  pc: "PCs",
  location: "Locations",
  quest: "Quests",
  item: "Items",
  faction: "Factions",
  deity: "Deities",
};

const TYPE_SINGULAR: Record<LinkEntityType, string> = {
  npc: "NPC",
  pc: "PC",
  location: "Location",
  quest: "Quest",
  item: "Item",
  faction: "Faction",
  deity: "Deity",
};

const TYPE_COLOR: Record<LinkEntityType, string> = {
  npc: "var(--grim-ember)",
  pc: "var(--grim-gold)",
  location: "var(--grim-arcane)",
  quest: "var(--grim-gold)",
  item: "var(--grim-moss)",
  faction: "var(--grim-arcane)",
  deity: "var(--grim-gold)",
};

export default function EntityLinkPicker({ entities, onSelect, onClose }: EntityLinkPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const availableTypes = Array.from(new Set(entities.map((e) => e.type))) as LinkEntityType[];

  const q = search.toLowerCase();
  const filtered = entities.filter(
    (e) =>
      (activeTab === "all" || e.type === activeTab) &&
      e.name.toLowerCase().includes(q)
  );

  const tabClass = (tab: Tab) =>
    `py-2 px-3.5 font-head text-sm tracking-wider-3 uppercase cursor-pointer border-none whitespace-nowrap transition-colors duration-150 ${
      activeTab === tab ? "bg-grim-ember" : "bg-transparent"
    }`;

  const tabTextStyle = (tab: Tab): React.CSSProperties => ({
    color: activeTab === tab ? "oklch(0.98 0.02 80)" : "var(--grim-ink-3)",
  });

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-grim-backdrop/60"
      style={{ zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-grim-bg-2 border border-grim-line rounded-md flex flex-col overflow-hidden"
        style={{ width: 480, maxWidth: "90vw", maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between py-3 px-4 border-b border-grim-line">
          <span className="font-head text-lg tracking-widest uppercase text-grim-ink">
            Link Entity
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-grim-ink-3 p-0.5"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-wrap border-b border-grim-line bg-grim-bg-3">
          <button type="button" className={tabClass("all")} style={tabTextStyle("all")} onClick={() => setActiveTab("all")}>
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={tabClass(type)}
              style={tabTextStyle(type)}
              onClick={() => setActiveTab(type)}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            autoFocus
            className="bg-transparent border-l border-grim-line text-grim-ink font-body text-base py-1.5 px-2.5 outline-none"
            style={{ width: 120 }}
          />
        </div>

        {/* Entity list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-grim-ink-4 font-body text-lg">
              No entities found
            </div>
          ) : (
            filtered.map((entity) => (
              <button
                key={`${entity.type}-${entity.id}`}
                type="button"
                onClick={() => onSelect(entity)}
                className="flex items-center gap-2.5 w-full py-2 px-4 bg-transparent border-none border-b border-grim-line-2 cursor-pointer text-left transition-colors duration-100"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "oklch(0.72 0.165 48 / 0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  className="font-head text-xs tracking-wider-2 uppercase min-w-14"
                  style={{ color: TYPE_COLOR[entity.type] }}
                >
                  {TYPE_SINGULAR[entity.type]}
                </span>
                <span className="font-body text-lg text-grim-ink-2">
                  {entity.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
