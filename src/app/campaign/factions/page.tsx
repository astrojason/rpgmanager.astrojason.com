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
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Mustering the banners&hellip;
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      {/* Page header */}
      <div className="mb-5.5">
        <div className="grim-page-eyebrow">Volume the Fifth</div>
        <h1 className="grim-page-title">The Banners &amp; Factions</h1>
        <p className="grim-page-sub">{factionData.length} banner{factionData.length !== 1 ? "s" : ""} recorded; every alliance, guild, and power that moves the world.</p>
      </div>

      {/* Search + type filter */}
      <section className="flex gap-3 items-stretch mb-5.5 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek a banner, a cause, a seat of power…"
            className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
          />
          <span
            className="absolute left-3.5 text-grim-gold-2 text-2xl"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >⚑</span>
        </div>
        {uniqueTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`bg-grim-bg-3 border border-grim-line-2 font-body text-lg py-3 px-3.5 outline-none cursor-pointer ${typeFilter ? "text-grim-ink" : "text-grim-ink-4"}`}
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
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="grim-h-section">Of those who hold power</h2>
          <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
            sorted alphabetical · {sorted.length} of {factionData.length}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-12 px-6 text-grim-ink-4">
            <div className="font-display text-5xl text-grim-ink-3">~ no banners found ~</div>
            <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">Adjust thy search or filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sorted.map((faction) => (
              <div
                key={faction.id}
                onClick={() => router.push(`/campaign/factions/${faction.id}`)}
                className="grim-tome p-0 overflow-hidden cursor-pointer border border-grim-line"
                style={{ transition: "transform 0.15s ease, border-color 0.15s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
              >
                {/* Banner image or gradient header */}
                <div className="relative h-20">
                  {safeImageSrc(faction.image) ? (
                    <Image
                      src={safeImageSrc(faction.image)!}
                      alt={faction.name}
                      fill
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.20 0.08 40) 100%)" }} />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, oklch(0.10 0.025 290 / 0.75))" }} />
                  <div className="absolute top-2 left-2.5 font-display text-3xl text-grim-gold">
                    {getFactionCrest(faction.type)}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`${statusChipClass(faction.status)} text-xs py-0.5 px-1.5`}>
                      {faction.status || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="pt-2.5 px-3.5 pb-3.5">
                  <div className="font-display text-2xl text-grim-gold tracking-normal" style={{ lineHeight: 1.1 }}>
                    {faction.name}
                  </div>
                  <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-3 uppercase mt-0.75">
                    {faction.type}{faction.location ? ` · ${faction.location}` : ""}
                  </div>
                  {faction.description && (
                    <div className="text-base text-grim-ink-2 mt-2 line-clamp-3" style={{ lineHeight: 1.45 }}>
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
