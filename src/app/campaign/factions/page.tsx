"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import Image from "next/image";
import { Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import { useQuery } from "@tanstack/react-query";

const FACTION_CRESTS: Record<string, string> = {
  "Ship Crew": "☾",
  "Criminal Organization": "⚔",
  "Political Organization": "✶",
  "City Watch": "✠",
  "Spy Network": "◈",
  "Adventuring Guild": "⚡",
  "City Guard": "⚓",
  "Druid Circle": "❧",
  "Guild": "⚙",
};

function getFactionCrest(type: string): string {
  return FACTION_CRESTS[type] || "⚑";
}

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "grim-chip is-alive";
  if (s === "destroyed" || s === "disbanded" || s === "dead") return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

export default function FactionsPage() {
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const router = useRouter();
  usePageTracking();

  const { data: factionData = [], isPending: loading, error: queryError } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => {
      if (!r.ok) throw new Error(`Failed to load factions (${r.status})`);
      return r.json();
    }),
  });

  const filtered = factionData.filter((faction) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      faction.name.toLowerCase().includes(term) ||
      (faction.description || "").toLowerCase().includes(term) ||
      (faction.goals || "").toLowerCase().includes(term) ||
      (faction.location || "").toLowerCase().includes(term);
    const matchesType = typeFilter === "" || faction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  const uniqueTypes = [...new Set(factionData.map((f) => f.type))].sort();

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Mustering the banners&hellip;
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <div className="grim-page-eyebrow">Volume the Fifth</div>
        <h1 className="grim-page-title">The Banners &amp; Factions</h1>
        <p className="grim-page-sub">{factionData.length} banner{factionData.length !== 1 ? "s" : ""} recorded; every alliance, guild, and power that moves the world.</p>
      </div>

      {/* Search + type filter */}
      <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek a banner, a cause, a seat of power…"
            style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16, padding: "12px 16px 12px 42px", outline: "none" }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18 }}>⚑</span>
        </div>
        {uniqueTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: typeFilter ? "var(--grim-ink)" : "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 14, padding: "12px 14px", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </section>

      {/* Faction card grid */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 className="grim-h-section">Of those who hold power</h2>
          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
            sorted alphabetical · {sorted.length} of {factionData.length}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ no banners found ~</div>
            <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>Adjust thy search or filters</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {sorted.map((faction) => (
              <div
                key={faction.id}
                onClick={() => router.push(`/campaign/factions/${faction.id}`)}
                className="grim-tome"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid var(--grim-line)",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
              >
                {/* Banner image or gradient header */}
                <div style={{ position: "relative", height: 80 }}>
                  {safeImageSrc(faction.image) ? (
                    <Image
                      src={safeImageSrc(faction.image)!}
                      alt={faction.name}
                      fill
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.20 0.08 40) 100%)" }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, oklch(0.10 0.025 290 / 0.75))" }} />
                  <div style={{ position: "absolute", top: 8, left: 10, fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold)" }}>
                    {getFactionCrest(faction.type)}
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <span className={statusChipClass(faction.status)} style={{ fontSize: 9, padding: "2px 6px" }}>
                      {faction.status || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: "10px 14px 14px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1.1, letterSpacing: ".01em" }}>
                    {faction.name}
                  </div>
                  <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 3 }}>
                    {faction.type}{faction.location ? ` · ${faction.location}` : ""}
                  </div>
                  {faction.description && (
                    <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.45, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {faction.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
