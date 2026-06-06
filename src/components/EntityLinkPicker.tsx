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
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--grim-bg-2)",
          border: "1px solid var(--grim-line)",
          borderRadius: 6,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--grim-line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-head)",
              fontSize: 13,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--grim-ink)",
            }}
          >
            Link Entity
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--grim-ink-3)", padding: 2 }}
          >
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tabs + Search */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            borderBottom: "1px solid var(--grim-line)",
            background: "var(--grim-bg-3)",
          }}
        >
          <button type="button" style={tabStyle("all")} onClick={() => setActiveTab("all")}>
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              style={tabStyle(type)}
              onClick={() => setActiveTab(type)}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            autoFocus
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

        {/* Entity list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "16px",
                color: "var(--grim-ink-4)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              No entities found
            </div>
          ) : (
            filtered.map((entity) => (
              <button
                key={`${entity.type}-${entity.id}`}
                type="button"
                onClick={() => onSelect(entity)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--grim-line-2)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "oklch(0.72 0.165 48 / 0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: "var(--font-head)",
                    fontSize: 9,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: TYPE_COLOR[entity.type],
                    minWidth: 58,
                  }}
                >
                  {TYPE_SINGULAR[entity.type]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: "var(--grim-ink-2)",
                  }}
                >
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
