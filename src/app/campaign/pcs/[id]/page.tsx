"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { statusChipClass } from "@/utils/chipClass";

export default function PCDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [showFullImage, setShowFullImage] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [fadeGif, setFadeGif] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDM = useIsDM();
  const isAdmin = useIsAdmin();
  const userId = useEffectiveUserId();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: allPcs = [], isPending: loading } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: async () => { const r = await authFetch("/api/data/pcs"); if (!r.ok) throw new Error("Failed to load PCs"); return r.json(); },
  });
  const { data: factionData = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: async () => { const r = await authFetch("/api/data/factions"); if (!r.ok) throw new Error("Failed to load factions"); return r.json(); },
  });
  const { data: allDeitiesData = [] } = useQuery<Deity[]>({
    queryKey: ['/api/data/deities'],
    queryFn: async () => { const r = await authFetch("/api/data/deities"); if (!r.ok) throw new Error("Failed to load deities"); return r.json(); },
  });

  const pc = useMemo(() => allPcs.find((p: PC) => String(p.id) === id) ?? null, [allPcs, id]);
  const notFound = !loading && !pc;
  const deities = useMemo(() => allDeitiesData.filter(d => (d.follower_pcs ?? []).includes(id) && (!d.hidden || isAdmin || isDM)), [allDeitiesData, id, isAdmin, isDM]);

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
      await queryClient.invalidateQueries({ queryKey: ['/api/data/pcs'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

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
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the codex&hellip;
        </div>
      </div>
    );
  }

  if (notFound || !pc) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/pcs")}>
          ← Back to Player Characters
        </button>
        <div className="text-center py-12 px-6 text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3">~ character not found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/85"
          onClick={() => setShowFullImage(false)}
        >
          <div
            className="relative w-full max-w-225 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={selectedImage}
                alt={pc.name || pc.nickname || ""}
                width={900}
                height={600}
                className={`object-contain w-full h-auto transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
              />
              {showGif && selectedGif && (
                <Image
                  src={selectedGif}
                  alt={pc.name || pc.nickname || ""}
                  width={900}
                  height={600}
                  unoptimized
                  className={`object-contain absolute top-0 left-0 w-full h-full transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"}`}
                />
              )}
            </div>
            <button
              className="grim-btn is-ghost absolute top-2 right-2"
              onClick={() => setShowFullImage(false)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {/* Back nav */}
        <button className="grim-btn is-ghost mb-6" onClick={() => router.push("/campaign/pcs")}>
          ← Back to Player Characters
        </button>

        {/* Portrait + details layout */}
        <div className="grid gap-6 mb-6 items-start" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)" }}>

          {/* Left: Portrait image at 1:1 aspect ratio */}
          <div className="relative aspect-square border border-grim-gold-2 overflow-hidden">
            {selectedImage ? (
              <>
                <Image
                  src={selectedImage}
                  alt={pc.name || pc.nickname || ""}
                  fill
                  className={`object-cover object-top transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
                />
                {showGif && selectedGif && (
                  <Image
                    src={selectedGif}
                    alt={pc.name || pc.nickname || ""}
                    fill
                    unoptimized
                    className={`object-cover object-top absolute top-0 left-0 w-full h-full transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"}`}
                  />
                )}
                <button
                  className="grim-btn is-ghost absolute top-2.5 right-2.5 z-10 text-2xl py-1 px-2.5"
                  onClick={() => setShowFullImage(true)}
                  aria-label="View full image"
                >
                  ⊙
                </button>
              </>
            ) : (
              <div className="grim-img-slot is-portrait w-full h-full" />
            )}
          </div>

          {/* Right: Character header + info sections */}
          <div className="flex flex-col gap-5">

            {/* Character header */}
            <div>
              <div className="grim-page-eyebrow mb-1.5">Dossier of a Fellow Traveller</div>
              <div className="flex gap-3 items-baseline flex-wrap">
                <h1 className="font-display text-7xl text-grim-gold m-0" style={{ lineHeight: 0.9, textShadow: "0 0 36px oklch(0.72 0.165 48 / 0.3)" }}>
                  {pc.name}
                </h1>
                {pc.nickname && (
                  <span className="font-body text-2xl text-grim-ink-2">
                    &ldquo;{pc.nickname}&rdquo;
                  </span>
                )}
              </div>
              <div className="font-head text-xl text-grim-ink tracking-wider mt-1.5">
                {pc.race} · {pc.class}
              </div>
            </div>

            {/* Of the Person */}
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Of the Person</h3>
              </div>
              <div className="grim-stack gap-2.5 text-lg">
                {([
                  ["Hometown", pc.hometown],
                  ["Race", pc.race],
                  ["Calling", pc.class],
                ] as [string, string][]).map(([k, v], i) => (
                  <div key={i} className={`flex justify-between gap-3 pb-2 ${i < 2 ? "border-b border-dotted border-grim-line" : ""}`}>
                    <span className="grim-mono text-sm tracking-wider-3 text-grim-ink-4 uppercase">{k}</span>
                    <span className="font-head text-lg text-grim-ink text-right">{v || "—"}</span>
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
                <div className="flex gap-2.5 flex-wrap">
                  {pc.factions.map((factionId) => (
                    <button
                      key={factionId}
                      className="grim-chip is-faction cursor-pointer text-base py-1 px-3"
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
          <section className="grim-tome mb-6">
            <div className="grim-tome-head">
              <h3 className="grim-tome-title">Divine Devotion</h3>
              <span className="grim-tome-sub">{deities.length === 1 ? "deity" : "deities"}</span>
            </div>
            <div className="grim-stack gap-2">
              {deities.map(d => (
                <Link key={d.id} href={`/campaign/deities/${d.id}`} className="no-underline text-inherit block">
                  <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-head text-lg text-grim-gold tracking-wide">✦ {d.name}</span>
                      {d.hidden && (isAdmin || isDM) && <span className="grim-chip is-blood text-xs py-0 px-1.5">hidden</span>}
                    </span>
                    <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{d.domain || "—"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* GM Notes (DM only) */}
        {isDM && pc.gm_notes && (
          <section className="grim-tome border border-grim-arcane/55 mb-6">
            <div className="grim-tome-head">
              <h3 className="grim-tome-title text-grim-arcane">GM Notes</h3>
              <span className="grim-tome-sub text-grim-arcane">eyes only</span>
            </div>
            <div
              className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl"
              style={{ lineHeight: 1.65 }}
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
