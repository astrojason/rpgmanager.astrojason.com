"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsAdmin } from "@/utils/adminCheck";
import { usePageTracking } from "@/utils/referrerTracking";
import InteractiveImage from "@/components/InteractiveImage";
import { Location } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import { useQuery } from "@tanstack/react-query";

export default function LocationsPage() {
  const [selectedArea, setSelectedArea] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  usePageTracking();

  const { data: locations = [], isPending: loading, error: queryError } = useQuery<Location[]>({
    queryKey: ['/api/data/locations'],
    queryFn: () => authFetch('/api/data/locations').then(r => r.json()),
  });

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
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  // isAdmin used for future admin controls
  void isAdmin;

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div className="flex justify-between items-end mb-5.5">
        <div>
          <div className="grim-page-eyebrow">Cartographica</div>
          <h1 className="grim-page-title">Azorian&apos;s Bounty</h1>
          <p className="grim-page-sub">
            The known world, mapped in trembling ink.{sublocations.length > 0 ? ` ${sublocations.length} places of note.` : ""}
          </p>
        </div>
        <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2 text-right uppercase">
          <div>scale ⋅ 1 league per inch</div>
          <div className="mt-0.5">scribed by Master · year 427</div>
        </div>
      </div>

      {/* Map + detail panel */}
      <div
        className="grid gap-4.5 mb-7"
        style={{ gridTemplateColumns: selectedArea ? "1fr 320px" : "1fr", transition: "grid-template-columns 0.2s ease" }}
      >

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
          <aside className="flex flex-col gap-3.5 min-h-0 sticky top-0 self-start">
            <div className="grim-tome p-0 overflow-hidden">
              {/* Header image slot */}
              <div className="relative h-35 bg-grim-bg-3">
                <div className="grim-img-slot w-full h-full rounded-none">
                  <div className="font-display text-sm text-grim-ink-4 tracking-wider-3 uppercase">no image on file</div>
                </div>
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, oklch(0.13 0.030 290 / 0.95))" }} />
                <div className="absolute bottom-2.5 left-3.5 right-9">
                  <div className="grim-mono text-xs text-grim-ember-2 tracking-widest-4 uppercase">
                    location
                  </div>
                  <div className="font-display text-3xl text-grim-gold mt-0.5" style={{ lineHeight: 1.1 }}>{selectedArea.name}</div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="absolute top-2 right-2 border border-grim-line text-grim-ink-3 cursor-pointer py-0.5 px-1.75 font-mono text-lg leading-none"
                  style={{ background: "oklch(0.12 0.025 290 / 0.85)" }}
                >
                  ×
                </button>
              </div>

              <div className="pt-3.5 px-4.5 pb-4.5">
                {selectedArea.pronunciation && (
                  <div className="grim-mono text-sm text-grim-ink-3 tracking-wider-3 mb-2">
                    pronounced {selectedArea.pronunciation}
                  </div>
                )}
                <p className="text-lg text-grim-ink-2 leading-normal mt-0 mx-0 mb-3">
                  {selectedArea.teaser}
                </p>
                <div className="grim-rule" />
                <button
                  className="grim-btn is-ember w-full justify-center"
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
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="grim-h-section">Places of the Bounty</h2>
            <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
              {sublocations.length} locations charted
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {sublocations.map((location) => (
              <div
                key={location.id}
                onClick={() => router.push(`/campaign/locations/${location.id}`)}
                className={`grim-tome py-3.5 px-4 cursor-pointer border ${selectedArea?.id === location.id ? "border-grim-gold-2" : "border-grim-line"}`}
                style={{ transition: "border-color 0.15s ease" }}
              >
                <div className="font-display text-2xl text-grim-gold leading-none tracking-normal mb-1.25 truncate">
                  {location.name}
                </div>
                {location.pronunciation && (
                  <div className="grim-mono text-xs text-grim-ink-4 tracking-wider-2 mb-1.5">
                    {location.pronunciation}
                  </div>
                )}
                {location.teaser && (
                  <div className="text-base text-grim-ink-2 line-clamp-3" style={{ lineHeight: 1.4 }}>
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
