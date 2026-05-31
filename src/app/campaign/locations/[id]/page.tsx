"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Location } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

export default function LocationDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dmMode, setDmMode] = useState(false);

  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const response = await authFetch("/api/data/locations");
        if (!response.ok) throw new Error("Failed to load locations");
        const data: Location[] = await response.json();

        let found: Location | undefined;

        found = data.find((loc) => String(loc.id) === id);

        if (!found) {
          for (const parent of data) {
            if (parent.locations) {
              found = parent.locations.find((sub) => String(sub.id) === id);
              if (found) break;
            }
          }
        }

        if (!found) {
          setNotFound(true);
        } else {
          setLocation(found);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadLocation();
  }, [id]);

  useEffect(() => {
    setDmMode(isDM || isAdmin);
  }, [isDM, isAdmin]);

  const parseMarkdown = useMemo(
    () => (markdown: string) => renderMarkdownWithLinks(markdown, isAdmin),
    [isAdmin]
  );

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

  if (notFound || !location) {
    return (
      <div style={{ padding: "36px 56px 80px" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/locations")}>
          ‹ Back to the Map
        </button>
        <div style={{ marginTop: 32, textAlign: "center", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-ink-3)" }}>~ not found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>No record of this place in the codex</div>
        </div>
      </div>
    );
  }

  const subLocations = location.locations ?? [];
  const teaserFirstChar = location.teaser?.[0] ?? "";
  const teaserRest = location.teaser?.slice(1) ?? "";

  return (
    <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div className="grim-row" style={{ gap: 18 }}>
          <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/locations")}>
            ‹ Back to the Map
          </button>
          <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
            codex / locations / {location.name.toLowerCase()}
          </div>
        </div>
        <div className="grim-row" style={{ gap: 8 }}>
          {(isDM || isAdmin) && (
            <button
              className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
              onClick={() => setDmMode(!dmMode)}
            >
              <span className="grim-flame" style={{ width: 6, height: 6 }} />
              {dmMode ? "DM Sight · ON" : "DM Sight · OFF"}
            </button>
          )}
          {isAdmin && (
            <button className="grim-btn is-ghost" onClick={() => router.push("/admin/data/locations")}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Hero — image plate with title overlay */}
      <section style={{ position: "relative", marginBottom: 28, border: "1px solid var(--grim-gold-2)", overflow: "hidden" }}>
        <div className="grim-img-slot" style={{ width: "100%", height: 300, borderRadius: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>no image on file</div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, oklch(0.10 0.02 290 / 0.25) 0%, transparent 35%, oklch(0.11 0.025 290 / 0.96) 100%)" }} />

        {/* Wax seal */}
        <div style={{ position: "absolute", top: 18, left: 18 }}>
          <div className="grim-seal" style={{ width: 56, height: 56, fontSize: 22 }}>✦</div>
        </div>

        {/* Title block */}
        <div style={{ position: "absolute", left: 28, right: 28, bottom: 22 }}>
          <div className="grim-page-eyebrow" style={{ marginBottom: 4 }}>Gazetteer · A Place of the Bounty</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 76, color: "var(--grim-gold)", margin: "0 0 6px", lineHeight: 0.88, letterSpacing: ".01em", textShadow: "0 0 40px oklch(0.72 0.165 48 / 0.30)" }}>
            {location.name}
          </h1>
          {(location.pronunciation || location.teaser) && (
            <div style={{ fontFamily: "var(--font-body)", color: "var(--grim-ink-2)", fontSize: 17, maxWidth: "60ch" }}>
              {location.pronunciation && (
                <>pronounced <b style={{ fontFamily: "var(--font-head)", letterSpacing: ".08em", color: "var(--grim-ink)" }}>{location.pronunciation}</b>{location.teaser ? " · " : ""}</>
              )}
              {location.teaser}
            </div>
          )}
        </div>
      </section>

      {/* In-character description */}
      {location.teaser && (
        <section className="grim-parchment" style={{ marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "oklch(0.25 0.03 50)" }}>
            <span className="drop">{teaserFirstChar}</span>
            {teaserRest}
          </p>
        </section>
      )}

      {/* Two-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 22 }}>

        {/* LEFT — main detail content + sub-locations */}
        <div className="grim-stack" style={{ gap: 22 }}>
          {location.detail ? (
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">The Chronicle</h3>
                <span className="grim-tome-sub">a full account of this place</span>
              </div>
              <div
                className="prose dark:prose-invert max-w-none prose-sm"
                style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(location.detail) }}
              />
            </section>
          ) : (
            <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "28px 24px", color: "var(--grim-ink-4)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--grim-ink-3)" }}>~ uncharted ~</div>
              <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>No further record in the codex</div>
            </section>
          )}

          {/* Sub-locations as districts grid */}
          {subLocations.length > 0 && (
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Notable Places</h3>
                <span className="grim-tome-sub">{subLocations.length} place{subLocations.length !== 1 ? "s" : ""} of note</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {subLocations.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/campaign/locations/${sub.id}`)}
                    style={{ padding: "11px 13px", border: "1px solid var(--grim-line)", background: "oklch(0.14 0.025 290 / 0.5)", cursor: "pointer", position: "relative" }}
                  >
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", letterSpacing: ".03em", marginBottom: 4 }}>{sub.name}</div>
                    {sub.pronunciation && (
                      <div className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ember-2)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 4 }}>{sub.pronunciation}</div>
                    )}
                    {sub.teaser && (
                      <div style={{ fontSize: 12.5, color: "var(--grim-ink-2)", lineHeight: 1.45 }}>{sub.teaser}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — DM marginalia */}
        <div className="grim-stack" style={{ gap: 22 }}>
          {(isDM || isAdmin) && (
            dmMode ? (
              location.gm_notes ? (
                <section className="grim-tome" style={{ border: "1px solid var(--grim-arcane)", background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                  <div className="grim-tome-head" style={{ borderColor: "oklch(0.65 0.150 285 / 0.30)" }}>
                    <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>★ Master&apos;s Marginalia</h3>
                    <span className="grim-tome-sub">hidden from the party</span>
                  </div>
                  <div
                    className="prose dark:prose-invert max-w-none prose-sm"
                    style={{ color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(location.gm_notes) }}
                  />
                </section>
              ) : isAdmin ? (
                <section className="grim-tome" style={{ border: "1px dashed oklch(0.65 0.150 285 / 0.5)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "oklch(0.65 0.150 285 / 0.6)" }}>~ no marginalia ~</div>
                  <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>No DM notes for this location</div>
                </section>
              ) : null
            ) : (
              <section className="grim-tome" style={{ border: "1px dashed var(--grim-line-2)", textAlign: "center", padding: "22px 20px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--grim-ink-3)" }}>~ sealed ~</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>Master&apos;s marginalia hidden</div>
              </section>
            )
          )}
        </div>
      </div>
    </div>
  );
}
