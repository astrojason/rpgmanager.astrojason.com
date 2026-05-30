"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import Image from "next/image";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";

const isActive = (status: string) => status === "Alive" || status === "Active";

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
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFullImage, setShowFullImage] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [fadeGif, setFadeGif] = useState(false);

  const router = useRouter();
  usePageTracking();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pcsResponse, factionsResponse] = await Promise.all([
          authFetch("/api/data/pcs"),
          authFetch("/api/data/factions"),
        ]);
        if (pcsResponse.ok) {
          const pcs = await pcsResponse.json();
          setPcsData(pcs);
          const firstActive = pcs.find((p: PC) => isActive(p.status)) || pcs[0] || null;
          setSelectedPc(firstActive);
        }
        if (factionsResponse.ok) {
          setFactionData(await factionsResponse.json());
        }
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedImage = safeImageSrc(selectedPc?.image);
  const selectedGif = safeImageSrc(selectedPc?.gif);

  useEffect(() => {
    if (selectedPc && selectedGif) {
      setShowGif(false);
      setFadeGif(false);
      const timer = setTimeout(() => {
        setShowGif(true);
        setTimeout(() => setFadeGif(true), 100);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowGif(false);
      setFadeGif(false);
    }
  }, [selectedPc, selectedGif]);

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const filteredPCs = pcsData.filter((pc) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      pc.name?.toLowerCase().includes(term) ||
      pc.nickname?.toLowerCase().includes(term) ||
      pc.race?.toLowerCase().includes(term) ||
      pc.hometown?.toLowerCase().includes(term) ||
      pc.class?.toLowerCase().includes(term);
    return matchesSearch && (!showActiveOnly || isActive(pc.status));
  });

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
    <>
      {/* Full image modal */}
      {showFullImage && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.85)" }}
          onClick={() => setShowFullImage(false)}
        >
          <div
            style={{ position: "relative", maxWidth: 900, width: "100%", margin: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative" }}>
              <Image
                src={selectedImage}
                alt={selectedPc?.name || ""}
                width={900}
                height={600}
                style={{ objectFit: "contain", width: "100%", height: "auto" }}
                className={`transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
              />
              {showGif && selectedGif && (
                <Image
                  src={selectedGif}
                  alt={selectedPc?.name || ""}
                  width={900}
                  height={600}
                  unoptimized
                  style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                  className={`transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"}`}
                />
              )}
            </div>
            <button
              className="grim-btn is-ghost"
              style={{ position: "absolute", top: 8, right: 8 }}
              onClick={() => setShowFullImage(false)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Two-pane layout */}
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>

        {/* Left: selected PC detail */}
        <div style={{ padding: "36px 36px 80px 56px", overflowY: "auto" }}>

          {/* Page header */}
          <div style={{ marginBottom: 20 }}>
            <div className="grim-page-eyebrow">The Fellowship of the Bounty</div>
            <h1 className="grim-page-title" style={{ fontSize: 52 }}>Player Characters</h1>
          </div>

          {selectedPc ? (
            <>
              {/* Portrait + details layout */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: 20, marginBottom: 24, alignItems: "start" }}>

                {/* Left: portrait at 1:1 */}
                <div style={{ position: "relative", aspectRatio: "1 / 1", border: "1px solid var(--grim-gold-2)", overflow: "hidden" }}>
                  {selectedImage ? (
                    <>
                      <Image
                        src={selectedImage}
                        alt={selectedPc.name || ""}
                        fill
                        style={{ objectFit: "cover", objectPosition: "center top" }}
                        className={`transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
                      />
                      {showGif && selectedGif && (
                        <Image
                          src={selectedGif}
                          alt={selectedPc.name || ""}
                          fill
                          unoptimized
                          style={{ objectFit: "cover", objectPosition: "center top" }}
                          className={`absolute top-0 left-0 w-full h-full transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"}`}
                        />
                      )}
                      <button
                        className="grim-btn is-ghost"
                        style={{ position: "absolute", top: 10, right: 10, zIndex: 10, fontSize: 18, padding: "4px 10px" }}
                        onClick={() => setShowFullImage(true)}
                        aria-label="View full image"
                      >
                        ⊙
                      </button>
                    </>
                  ) : (
                    <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%" }} />
                  )}
                </div>

                {/* Right: character header + info sections */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Character header */}
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-gold)", margin: 0, lineHeight: 0.9, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.3)" }}>
                        {selectedPc.name}
                      </h2>
                      {selectedPc.nickname && (
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--grim-ink-2)" }}>
                          &ldquo;{selectedPc.nickname}&rdquo;
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--grim-ink)", letterSpacing: ".04em", marginTop: 4 }}>
                      {selectedPc.race} · {selectedPc.class}
                    </div>
                  </div>

                  {/* Of the Person */}
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Of the Person</h3>
                    </div>
                    <div className="grim-stack" style={{ gap: 10, fontSize: 14 }}>
                      {([
                        ["Hometown", selectedPc.hometown],
                        ["Race", selectedPc.race],
                        ["Calling", selectedPc.class],
                      ] as [string, string][]).map(([k, v], i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: i < 2 ? "1px dotted var(--grim-line)" : "none" }}>
                          <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grim-rule" />
                    <span className={statusChipClass(selectedPc.status)}>
                      {selectedPc.status === "Deceased" ? "Departed" : selectedPc.status || "Unknown"}
                    </span>
                  </section>

                  {/* Sworn Allegiances */}
                  <section className="grim-tome">
                    <div className="grim-tome-head">
                      <h3 className="grim-tome-title">Sworn Allegiances</h3>
                    </div>
                    {selectedPc.factions && selectedPc.factions.length > 0 ? (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {selectedPc.factions.map((factionId) => (
                          <button
                            key={factionId}
                            className="grim-chip is-faction"
                            style={{ cursor: "pointer", fontSize: 12, padding: "5px 12px" }}
                            onClick={() => router.push(`/campaign/factions?selected=${encodeURIComponent(factionId)}`)}
                          >
                            ⚑ {getFactionName(factionId)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>
                        No recorded allegiances
                      </div>
                    )}
                  </section>
                </div>
              </div>

              {/* Open full dossier */}
              <div>
                <button
                  className="grim-btn is-ember"
                  onClick={() => router.push(`/campaign/pcs/${selectedPc.id}`)}
                >
                  Open Full Dossier ›
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--grim-ink-4)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)" }}>~ select a character ~</div>
              <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>
                Choose a member of the fellowship from the party rail
              </div>
            </div>
          )}
        </div>

        {/* Right: Party rail */}
        <aside style={{ borderLeft: "1px solid var(--grim-line)", padding: "36px 16px 80px 22px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="grim-h-section" style={{ margin: 0 }}>The Party</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em" }}>
                {filteredPCs.length}
              </span>
              <button
                className="grim-btn is-ghost"
                style={{ fontSize: 9, padding: "2px 8px" }}
                onClick={() => setShowActiveOnly((v) => !v)}
              >
                {showActiveOnly ? "All" : "Active"}
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search the party…"
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 13, padding: "8px 12px 8px 32px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 14 }}>✦</span>
          </div>

          {/* Party list */}
          <div className="grim-stack" style={{ gap: 8 }}>
            {filteredPCs.map((pc) => (
              <div
                key={pc.id}
                onClick={() => setSelectedPc(pc)}
                className="grim-tome"
                style={{
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  border: `1px solid ${selectedPc?.id === pc.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                  background: selectedPc?.id === pc.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), var(--grim-bg-3))" : undefined,
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, overflow: "hidden", position: "relative", border: "1px solid var(--grim-line-2)" }}>
                  {safeImageSrc(pc.image) ? (
                    <Image
                      src={safeImageSrc(pc.image)!}
                      alt={pc.name || ""}
                      fill
                      style={{ objectFit: "cover", objectPosition: "center top", filter: pc.status === "Deceased" ? "grayscale(0.7)" : "none" }}
                    />
                  ) : (
                    <div className="grim-img-slot is-portrait" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{
                      fontFamily: "var(--font-head)",
                      fontSize: 14,
                      color: selectedPc?.id === pc.id ? "var(--grim-ember-2)" : pc.status === "Deceased" ? "var(--grim-ink-3)" : "var(--grim-ink)",
                      letterSpacing: ".02em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textDecoration: pc.status === "Deceased" ? "line-through" : "none",
                    }}>
                      {pc.name}
                    </span>
                    {pc.nickname && (
                      <span style={{ fontSize: 11, color: "var(--grim-ink-4)", flexShrink: 0 }}>
                        &ldquo;{pc.nickname}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-ink-3)", textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pc.class} · {pc.race}
                  </div>
                  <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".10em", color: "var(--grim-ink-4)", marginTop: 1 }}>
                    {pc.hometown}
                  </div>
                </div>
                <span className={statusChipClass(pc.status)} style={{ fontSize: 8, padding: "1px 6px", flexShrink: 0 }}>
                  {pc.status === "Deceased" ? "departed" : (pc.status?.toLowerCase() || "unknown")}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
