"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import Image from "next/image";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "alive") return "grim-chip is-alive";
  if (s === "deceased" || s === "dead") return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function PCsPage() {
  const [pcsData, setPcsData] = useState<PC[]>([]);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPc, setHoveredPc] = useState<PC | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  usePageTracking();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pcsResponse, factionsResponse] = await Promise.all([
          authFetch("/api/data/pcs"),
          authFetch("/api/data/factions"),
        ]);
        if (pcsResponse.ok) setPcsData(await pcsResponse.json());
        if (factionsResponse.ok) setFactionData(await factionsResponse.json());
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

  const previewPc = hoveredPc || sortedPCs[0] || null;

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Mustering the fellowship&hellip;
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="grim-page-eyebrow">The Fellowship of the Bounty</div>
          <h1 className="grim-page-title">Player Characters</h1>
          <p className="grim-page-sub">{pcsData.length} souls sworn to the cause.</p>
        </div>
      </div>

      {/* Search + status filters */}
      <section style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 22 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Seek a name, a calling, a homeland…"
            style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 16, padding: "12px 16px 12px 42px", outline: "none" }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18 }}>✦</span>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)", overflow: "hidden" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`grim-btn ${statusFilter === f.id ? "is-ember" : "is-ghost"}`}
              style={{ padding: "6px 12px", border: `1px solid ${statusFilter === f.id ? "var(--grim-ember)" : "transparent"}`, background: statusFilter === f.id ? undefined : "transparent" }}
            >
              {f.label}
              <span className="grim-mono" style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>{f.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Two-pane: card grid + sticky sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22 }}>

        {/* PC card grid */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 className="grim-h-section">Of those who walk the Bounty</h2>
            <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
              sorted alphabetical · {sortedPCs.length} of {pcsData.length}
            </div>
          </div>

          {sortedPCs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ no souls found ~</div>
              <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>
                Adjust thy search or filters
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {sortedPCs.map((pc) => (
                <div
                  key={pc.id}
                  onMouseEnter={() => setHoveredPc(pc)}
                  onMouseLeave={() => setHoveredPc(null)}
                  onClick={() => router.push(`/campaign/pcs/${pc.id}`)}
                  className="grim-tome"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "40% 1fr",
                    border: `1px solid ${hoveredPc?.id === pc.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                    transform: hoveredPc?.id === pc.id ? "translateY(-2px)" : "none",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  {/* Left: portrait at 1:1 */}
                  <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
                    {hasValidImage(pc.image) ? (
                      <Image
                        src={safeImageSrc(pc.image)!}
                        alt={pc.name || ""}
                        fill
                        style={{ objectFit: "cover", objectPosition: "center top", filter: pc.status === "Deceased" ? "grayscale(0.7)" : "none" }}
                      />
                    ) : (
                      <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%" }} />
                    )}
                    <div style={{ position: "absolute", top: 7, left: 7 }}>
                      <span className={statusChipClass(pc.status)} style={{ fontSize: 9, padding: "2px 6px" }}>
                        {pc.status === "Deceased" ? "Departed" : pc.status || "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Right: card body */}
                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pc.name || "Unknown"}
                    </div>
                    {pc.nickname && (
                      <div style={{ fontSize: 11, color: "var(--grim-ink-4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        &ldquo;{pc.nickname}&rdquo;
                      </div>
                    )}
                    <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-3)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pc.class}{pc.race ? ` · ${pc.race}` : ""}
                    </div>
                    {pc.hometown && (
                      <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.4, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {pc.hometown}
                      </div>
                    )}
                    {pc.factions && pc.factions.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px dashed var(--grim-line)" }}>
                        <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

        {/* Right sidebar: hover preview + tally */}
        <aside style={{ position: "sticky", top: 0, alignSelf: "flex-start" }}>
          {/* Hover preview */}
          <div className="grim-tome" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ position: "relative", height: 200 }}>
              {previewPc && hasValidImage(previewPc.image) ? (
                <Image
                  src={safeImageSrc(previewPc.image)!}
                  alt={previewPc.name || ""}
                  fill
                  style={{ objectFit: "cover", objectPosition: "center top", filter: previewPc.status === "Deceased" ? "grayscale(0.6)" : "none" }}
                />
              ) : (
                <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, oklch(0.10 0.025 290 / 0.85))" }} />
            </div>
            <div style={{ padding: 16 }}>
              {previewPc ? (
                <>
                  <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>Dossier Entry</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-gold)", lineHeight: 1, marginTop: 2 }}>{previewPc.name}</div>
                  {previewPc.nickname && (
                    <div style={{ fontSize: 12, color: "var(--grim-ink-3)", marginTop: 3 }}>
                      &ldquo;{previewPc.nickname}&rdquo;
                    </div>
                  )}
                  <hr className="grim-rule" />
                  <div className="grim-stack" style={{ gap: 7, fontSize: 12 }}>
                    {([
                      ["Race", previewPc.race],
                      ["Calling", previewPc.class],
                      ["Status", previewPc.status],
                      ["Hometown", previewPc.hometown],
                    ] as [string, string][]).map(([k, v], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 4, borderBottom: i < 3 ? "1px dotted var(--grim-line)" : "none" }}>
                        <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                        <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <hr className="grim-rule" />
                  <button
                    className="grim-btn is-ember"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => router.push(`/campaign/pcs/${previewPc.id}`)}
                  >
                    Open Dossier ›
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0", color: "var(--grim-ink-4)" }}>
                  <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>Hover to preview</div>
                </div>
              )}
            </div>
          </div>

          {/* Tally */}
          <div className="grim-tome">
            <h3 className="grim-tome-title" style={{ fontSize: 13, marginBottom: 0 }}>Tally of the Fellowship</h3>
            <hr className="grim-rule" style={{ margin: "10px 0 12px" }} />
            <div className="grim-stack" style={{ gap: 6, fontSize: 12 }}>
              {([
                ["Souls sworn", String(pcsData.length)],
                ["Active", String(activeCount)],
                ["Departed", String(deceasedCount)],
              ] as [string, string][]).map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--grim-ink-2)" }}>
                  <span>{k}</span>
                  <span style={{ fontFamily: "var(--font-display)", color: "var(--grim-gold)", fontSize: 16 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
