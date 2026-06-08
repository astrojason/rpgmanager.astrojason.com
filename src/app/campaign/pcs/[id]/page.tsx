"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsDM } from "@/utils/role";
import { useIsAdmin } from "@/utils/adminCheck";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import Image from "next/image";
import { PC, Faction, Deity, UserNote } from "@/types/interfaces";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import UserNotesEditor from "@/components/UserNotesEditor";
import Link from "next/link";

function statusChipClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "alive") return "grim-chip is-alive";
  if (s === "deceased" || s === "dead") return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function PCDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [pc, setPc] = useState<PC | null>(null);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [deities, setDeities] = useState<Deity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [fadeGif, setFadeGif] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDM = useIsDM();
  const isAdmin = useIsAdmin();
  const userId = useEffectiveUserId();

  usePageTracking();

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!pc) return;
    setError(null);
    try {
      const res = await authFetch("/api/data/pcs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pc.id, notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPc({ ...pc, notes });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pcsResponse, factionsResponse, deitiesResponse] = await Promise.all([
          authFetch("/api/data/pcs"),
          authFetch("/api/data/factions"),
          authFetch("/api/data/deities"),
        ]);
        const pcs = await pcsResponse.json();
        const factions = await factionsResponse.json();
        const found = pcs.find((p: PC) => String(p.id) === id);
        if (!found) {
          setNotFound(true);
        } else {
          setPc(found);
        }
        setFactionData(factions);
        if (deitiesResponse.ok) {
          const allDeities: Deity[] = await deitiesResponse.json();
          setDeities(allDeities.filter(d => (d.follower_pcs ?? []).includes(id)));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const selectedImage = safeImageSrc(pc?.image);
  const selectedGif = safeImageSrc(pc?.gif);

  useEffect(() => {
    if (pc && selectedGif) {
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
  }, [pc, selectedGif]);

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !pc) {
    return (
      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/pcs")} style={{ marginBottom: 24 }}>
          ← Back to Player Characters
        </button>
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--grim-ink-4)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)" }}>~ character not found ~</div>
          <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginTop: 8 }}>
            No record in the codex
          </div>
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
                alt={pc.name || pc.nickname || ""}
                width={900}
                height={600}
                style={{ objectFit: "contain", width: "100%", height: "auto" }}
                className={`transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
              />
              {showGif && selectedGif && (
                <Image
                  src={selectedGif}
                  alt={pc.name || pc.nickname || ""}
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

      <div style={{ padding: "36px 56px 80px", height: "100%", overflowY: "auto" }}>
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Back nav */}
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/pcs")} style={{ marginBottom: 24 }}>
          ← Back to Player Characters
        </button>

        {/* Portrait + details layout */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: 24, marginBottom: 24, alignItems: "start" }}>

          {/* Left: Portrait image at 1:1 aspect ratio */}
          <div style={{ position: "relative", aspectRatio: "1 / 1", border: "1px solid var(--grim-gold-2)", overflow: "hidden" }}>
            {selectedImage ? (
              <>
                <Image
                  src={selectedImage}
                  alt={pc.name || pc.nickname || ""}
                  fill
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  className={`transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
                />
                {showGif && selectedGif && (
                  <Image
                    src={selectedGif}
                    alt={pc.name || pc.nickname || ""}
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

          {/* Right: Character header + info sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Character header */}
            <div>
              <div className="grim-page-eyebrow" style={{ marginBottom: 6 }}>Dossier of a Fellow Traveller</div>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, color: "var(--grim-gold)", margin: 0, lineHeight: 0.9, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.3)" }}>
                  {pc.name}
                </h1>
                {pc.nickname && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 20, color: "var(--grim-ink-2)" }}>
                    &ldquo;{pc.nickname}&rdquo;
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--grim-ink)", letterSpacing: ".04em", marginTop: 6 }}>
                {pc.race} · {pc.class}
              </div>
            </div>

            {/* Of the Person */}
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Of the Person</h3>
              </div>
              <div className="grim-stack" style={{ gap: 10, fontSize: 14 }}>
                {([
                  ["Hometown", pc.hometown],
                  ["Race", pc.race],
                  ["Calling", pc.class],
                ] as [string, string][]).map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: i < 2 ? "1px dotted var(--grim-line)" : "none" }}>
                    <span className="grim-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)", textAlign: "right" }}>{v || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="grim-rule" />
              <span className={statusChipClass(pc.status)}>
                {pc.status === "Deceased" ? "Departed" : pc.status || "Unknown"}
              </span>
            </section>

            {/* Sworn Allegiances */}
            {pc.factions && pc.factions.length > 0 && (
              <section className="grim-tome">
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Sworn Allegiances</h3>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pc.factions.map((factionId) => (
                    <button
                      key={factionId}
                      className="grim-chip is-faction"
                      style={{ cursor: "pointer", fontSize: 12, padding: "5px 12px" }}
                      onClick={() => router.push(`/campaign/factions/${factionId}`)}
                    >
                      ⚑ {getFactionName(factionId)}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Deity */}
        {deities.length > 0 && (
          <section className="grim-tome" style={{ marginBottom: 24 }}>
            <div className="grim-tome-head">
              <h3 className="grim-tome-title">Divine Devotion</h3>
              <span className="grim-tome-sub">{deities.length === 1 ? "deity" : "deities"}</span>
            </div>
            <div className="grim-stack" style={{ gap: 8 }}>
              {deities.map(d => (
                <Link key={d.id} href={`/campaign/deities/${d.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--grim-line)" }}>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-gold)", letterSpacing: ".03em" }}>✦ {d.name}</span>
                    <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".10em", flexShrink: 0 }}>{d.domain || "—"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* GM Notes (DM only) */}
        {isDM && pc.gm_notes && (
          <section className="grim-tome" style={{ border: "1px solid oklch(0.65 0.150 285 / 0.55)", marginBottom: 24 }}>
            <div className="grim-tome-head">
              <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>GM Notes</h3>
              <span className="grim-tome-sub" style={{ color: "var(--grim-arcane)" }}>eyes only</span>
            </div>
            <div
              className="prose dark:prose-invert max-w-none prose-sm"
              style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(pc.gm_notes || "", true) }}
            />
          </section>
        )}

        {/* Party Notes */}
        <section className="grim-tome">
          <div className="grim-tome-head">
            <h3 className="grim-tome-title">Party Notes</h3>
            <span className="grim-tome-sub">field observations</span>
          </div>
          <UserNotesEditor
            notes={pc.notes || []}
            onChange={handleUpdateNotes}
            currentUser={userId}
            isAdmin={isAdmin}
          />
        </section>
      </div>
    </>
  );
}
