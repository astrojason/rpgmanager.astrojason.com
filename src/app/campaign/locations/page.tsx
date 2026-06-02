"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsAdmin } from "@/utils/adminCheck";
import { usePageTracking } from "@/utils/referrerTracking";
import InteractiveImage from "@/components/InteractiveImage";
import { Location } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

export default function LocationsPage() {
  const [selectedArea, setSelectedArea] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  usePageTracking();

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await authFetch("/api/data/locations");
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []);

  const mainLocation = locations.length > 0 ? locations[0] : null;
  const sublocations = useMemo(() => mainLocation?.locations || [], [mainLocation]);

  useEffect(() => {
    const selected = searchParams.get("selected");
    const fragment = window.location.hash.slice(1);

    if (selectedArea === null) {
      let location: Location | undefined;

      if (selected) {
        if (mainLocation && mainLocation.id === selected) location = mainLocation;
        if (!location) location = sublocations.find((loc: Location) => loc.id === selected);
      }

      if (!location && fragment) {
        const searchName = decodeURIComponent(fragment).replace(/-/g, " ").toLowerCase();
        if (mainLocation && mainLocation.name.toLowerCase() === searchName) location = mainLocation;
        if (!location) location = sublocations.find((loc: Location) => loc.name.toLowerCase() === searchName);
      }

      if (location) {
        setSelectedArea(location);
        const url = new URL(window.location.href);
        url.searchParams.set("selected", location.id);
        url.hash = "";
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, mainLocation, sublocations, selectedArea]);

  const handleAreaClick = (area: Location) => {
    setSelectedArea(area);
    const url = new URL(window.location.href);
    url.searchParams.set("selected", area.id);
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
  };

  const handleCloseDetail = () => {
    setSelectedArea(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("selected");
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
  };

  if (loading) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  // isAdmin used for future admin controls
  void isAdmin;

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="grim-page-eyebrow">Cartographica</div>
          <h1 className="grim-page-title">Azorian&apos;s Bounty</h1>
          <p className="grim-page-sub">
            The known world, mapped in trembling ink.{sublocations.length > 0 ? ` ${sublocations.length} places of note.` : ""}
          </p>
        </div>
        <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em", textAlign: "right", textTransform: "uppercase" }}>
          <div>scale ⋅ 1 league per inch</div>
          <div style={{ marginTop: 2 }}>scribed by Master · year 427</div>
        </div>
      </div>

      {/* Map + detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: selectedArea ? "1fr 320px" : "1fr", gap: 18, marginBottom: 28, transition: "grid-template-columns 0.2s ease" }}>

        {/* Map */}
        <InteractiveImage
          src={mainLocation?.mapImg || "/images/maps/azorians_bounty.jpg"}
          alt="Azorian's Bounty"
          width={2048}
          height={1536}
          locations={sublocations}
          onAreaClick={handleAreaClick}
          selectedLocationId={selectedArea?.id || null}
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 85vw, 1600px"
          className="max-w-full h-auto"
        />

        {/* Location detail panel */}
        {selectedArea && (
          <aside style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0, position: "sticky", top: 0, alignSelf: "flex-start" }}>
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              {/* Header image slot */}
              <div style={{ position: "relative", height: 140, background: "var(--grim-bg-3)" }}>
                <div className="grim-img-slot" style={{ width: "100%", height: "100%", borderRadius: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>no image on file</div>
                </div>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, oklch(0.13 0.030 290 / 0.95))" }} />
                <div style={{ position: "absolute", bottom: 10, left: 14, right: 36 }}>
                  <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ember-2)", letterSpacing: ".22em", textTransform: "uppercase" }}>
                    location
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--grim-gold)", lineHeight: 1.1, marginTop: 2 }}>{selectedArea.name}</div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  style={{ position: "absolute", top: 8, right: 8, background: "oklch(0.12 0.025 290 / 0.85)", border: "1px solid var(--grim-line)", color: "var(--grim-ink-3)", cursor: "pointer", padding: "2px 7px", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "14px 18px 18px" }}>
                {selectedArea.pronunciation && (
                  <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-3)", letterSpacing: ".14em", marginBottom: 8 }}>
                    pronounced {selectedArea.pronunciation}
                  </div>
                )}
                <p style={{ fontSize: 13, color: "var(--grim-ink-2)", lineHeight: 1.5, margin: "0 0 12px" }}>
                  {selectedArea.teaser}
                </p>
                <div className="grim-rule" />
                <button
                  className="grim-btn is-ember"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => router.push(`/campaign/locations/${selectedArea.id}`)}
                >
                  Open the Gazetteer ›
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Location card grid */}
      {sublocations.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 className="grim-h-section">Places of the Bounty</h2>
            <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ink-3)", textTransform: "uppercase" }}>
              {sublocations.length} locations charted
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {sublocations.map((location) => (
              <div
                key={location.id}
                onClick={() => router.push(`/campaign/locations/${location.id}`)}
                className="grim-tome"
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  border: `1px solid ${selectedArea?.id === location.id ? "var(--grim-gold-2)" : "var(--grim-line)"}`,
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", lineHeight: 1, letterSpacing: ".01em", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {location.name}
                </div>
                {location.pronunciation && (
                  <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", letterSpacing: ".12em", marginBottom: 6 }}>
                    {location.pronunciation}
                  </div>
                )}
                {location.teaser && (
                  <div style={{ fontSize: 12, color: "var(--grim-ink-2)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    {location.teaser}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
