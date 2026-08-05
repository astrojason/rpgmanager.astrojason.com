"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import Image from "next/image";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import { statusChipClass } from "@/utils/chipClass";

export default function PCsPage() {
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  usePageTracking();

  const { data: pcsData = [], isPending: loading } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.ok ? r.json() : []),
  });
  const { data: factionData = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
  });

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const hasValidImage = (src?: string | null) => Boolean(safeImageSrc(src));

  const activeCount = pcsData.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "alive" || s === "active";
  }).length;
  const deceasedCount = pcsData.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "deceased" || s === "dead";
  }).length;

  const FILTERS = [
    { id: "all", label: "All", count: pcsData.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "deceased", label: "Departed", count: deceasedCount },
  ];

  const filteredPCs = pcsData.filter((pc) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      pc.name?.toLowerCase().includes(term) ||
      pc.nickname?.toLowerCase().includes(term) ||
      pc.race?.toLowerCase().includes(term) ||
      pc.hometown?.toLowerCase().includes(term) ||
      pc.class?.toLowerCase().includes(term);
    const s = (pc.status || "").toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (s === "alive" || s === "active")) ||
      (statusFilter === "deceased" && (s === "deceased" || s === "dead"));
    return matchesSearch && matchesStatus;
  });

  const sortedPCs = [...filteredPCs].sort((a, b) =>
    (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Mustering the fellowship&hellip;
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

      {/* Page header */}
      <div className="flex justify-between items-end mb-5.5">
        <div>
          <div className="grim-page-eyebrow">The Fellowship of the Bounty</div>
          <h1 className="grim-page-title">Player Characters</h1>
          <p className="grim-page-sub">{pcsData.length} souls sworn to the cause.</p>
        </div>
      </div>

      {/* Search + status filters */}
      <section className="flex gap-3 items-stretch mb-5.5">
        <div className="relative flex-1 min-w-70">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek a name, a calling, a homeland…"
            className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
          />
          <span
            className="absolute left-3.5 text-grim-gold-2 text-2xl"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >✦</span>
        </div>
        <div className="flex gap-1 p-1 bg-grim-bg-3 border border-grim-line overflow-hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`grim-btn ${statusFilter === f.id ? "is-ember" : "is-ghost"} py-1.5 px-3 border ${statusFilter === f.id ? "border-grim-ember" : "border-transparent"} ${statusFilter === f.id ? "" : "bg-transparent"}`}
            >
              {f.label}
              <span className="grim-mono text-sm opacity-70 ml-0.5">{f.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* PC card grid */}
      <section>
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="grim-h-section">Of those who walk the Bounty</h2>
          <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
            sorted alphabetical · {sortedPCs.length} of {pcsData.length}
          </div>
        </div>

        {sortedPCs.length === 0 ? (
          <div className="text-center py-12 px-6 text-grim-ink-4">
            <div className="font-display text-5xl text-grim-ink-3">~ no souls found ~</div>
            <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">
              Adjust thy search or filters
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sortedPCs.map((pc) => (
              <div
                key={pc.id}
                onClick={() => router.push(`/campaign/pcs/${pc.id}`)}
                className="grim-tome p-0 overflow-hidden cursor-pointer grid border border-grim-line"
                style={{ gridTemplateColumns: "38% 1fr", transition: "transform 0.15s ease, border-color 0.15s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
              >
                {/* Portrait */}
                <div className="relative aspect-square">
                  {hasValidImage(pc.image) ? (
                    <Image
                      src={safeImageSrc(pc.image)!}
                      alt={pc.name || ""}
                      fill
                      className="object-cover object-top"
                      style={{ filter: pc.status === "Deceased" ? "grayscale(0.7)" : "none" }}
                    />
                  ) : (
                    <div className="grim-img-slot is-portrait w-full h-full" />
                  )}
                  <div className="absolute top-1.75 left-1.75">
                    <span className={`${statusChipClass(pc.status)} text-xs py-0.5 px-1.5`}>
                      {pc.status === "Deceased" ? "Departed" : pc.status || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="pt-2.5 px-3 pb-3 flex flex-col justify-start">
                  <div className="font-display text-2xl text-grim-gold leading-none tracking-normal truncate">
                    {pc.name || "Unknown"}
                  </div>
                  {pc.nickname && (
                    <div className="text-sm text-grim-ink-4 mt-0.5 truncate">
                      &ldquo;{pc.nickname}&rdquo;
                    </div>
                  )}
                  <div className="grim-mono text-xs text-grim-ink-3 tracking-wider-3 uppercase mt-1 truncate">
                    {pc.class}{pc.race ? ` · ${pc.race}` : ""}
                  </div>
                  {pc.hometown && (
                    <div className="grim-mono text-xs text-grim-ink-4 tracking-widest mt-0.5 truncate">
                      ⌖ {pc.hometown}
                    </div>
                  )}
                  {pc.factions && pc.factions.length > 0 && (
                    <div className="mt-auto pt-1.75 border-t border-dashed border-grim-line">
                      <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 uppercase truncate">
                        ⚑ {getFactionName(pc.factions[0])}
                      </div>
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
