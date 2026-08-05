"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { useEffectiveUserId } from "@/lib/useEffectiveUserId";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Location, SessionRecap, UserNote } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import UserNotesEditor from "@/components/UserNotesEditor";
import Link from "next/link";

export default function LocationDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [dmMode, setDmMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useIsAdmin();
  const isDM = useIsDM();
  const userId = useEffectiveUserId();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: allLocations = [], isPending: loading } = useQuery<Location[]>({
    queryKey: ['/api/data/locations'],
    queryFn: async () => { const r = await authFetch("/api/data/locations"); if (!r.ok) throw new Error("Failed to load locations"); return r.json(); },
  });
  const { data: allRecaps = [] } = useQuery<SessionRecap[]>({
    queryKey: ['/api/data/session-recaps'],
    queryFn: async () => { const r = await authFetch("/api/data/session-recaps"); if (!r.ok) throw new Error("Failed to load recaps"); return r.json(); },
  });

  const location = useMemo(() => {
    let found = allLocations.find(loc => String(loc.id) === id);
    if (!found) {
      for (const parent of allLocations) {
        if (parent.locations) {
          found = parent.locations.find(sub => String(sub.id) === id);
          if (found) break;
        }
      }
    }
    return found ?? null;
  }, [allLocations, id]);

  const notFound = !loading && !location;
  const appearances = useMemo(() =>
    allRecaps.filter(r => (r.tagged_locations ?? []).includes(id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allRecaps, id]
  );

  useEffect(() => { setDmMode(isDM || isAdmin); }, [isDM, isAdmin]);

  const handleUpdateNotes = async (notes: UserNote[]) => {
    if (!location) return;
    setError(null);
    try {
      const res = await authFetch("/api/data/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: location.id, notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: ['/api/data/locations'] });
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const parseMarkdown = useMemo(
    () => (markdown: string) => renderMarkdownWithLinks(markdown, isAdmin),
    [isAdmin]
  );

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

  if (notFound || !location) {
    return (
      <div className="pt-9 px-14 pb-20">
        <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/locations")}>
          ‹ Back to the Map
        </button>
        <div className="mt-8 text-center text-grim-ink-4">
          <div className="font-display text-5xl text-grim-ink-3">~ not found ~</div>
          <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">No record of this place in the codex</div>
        </div>
      </div>
    );
  }

  const subLocations = location.locations ?? [];
  const teaserFirstChar = location.teaser?.[0] ?? "";
  const teaserRest = location.teaser?.slice(1) ?? "";

  return (
    <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
      {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5.5">
        <div className="grim-row gap-4.5">
          <button className="grim-btn is-ghost" onClick={() => router.push("/campaign/locations")}>
            ‹ Back to the Map
          </button>
          <div className="grim-mono text-sm text-grim-ink-3 tracking-widest-2">
            codex / locations / {location.name.toLowerCase()}
          </div>
        </div>
        <div className="grim-row gap-2">
          {(isDM || isAdmin) && (
            <button
              className={`grim-btn${dmMode ? " is-ember" : " is-ghost"}`}
              onClick={() => setDmMode(!dmMode)}
            >
              <span className="grim-flame w-1.5 h-1.5" />
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
      <section className="relative mb-7 border border-grim-gold-2 overflow-hidden">
        <div className="grim-img-slot w-full h-75 rounded-none">
          <div className="font-display text-lg text-grim-ink-4 tracking-wider-3 uppercase">no image on file</div>
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.10 0.02 290 / 0.25) 0%, transparent 35%, oklch(0.11 0.025 290 / 0.96) 100%)" }} />

        {/* Wax seal */}
        <div className="absolute top-4.5 left-4.5">
          <div className="grim-seal w-14 h-14 text-3xl">✦</div>
        </div>

        {/* Title block */}
        <div className="absolute left-7 right-7 bottom-5.5">
          <div className="grim-page-eyebrow mb-1">Gazetteer · A Place of the Bounty</div>
          <h1 className="font-display text-8xl text-grim-gold mt-0 mx-0 mb-1.5 tracking-normal" style={{ lineHeight: 0.88, textShadow: "0 0 40px oklch(0.72 0.165 48 / 0.30)" }}>
            {location.name}
          </h1>
          {(location.pronunciation || location.teaser) && (
            <div className="font-body text-grim-ink-2 text-2xl" style={{ maxWidth: "60ch" }}>
              {location.pronunciation && (
                <>pronounced <b className="font-head tracking-widest text-grim-ink">{location.pronunciation}</b>{location.teaser ? " · " : ""}</>
              )}
              {location.teaser}
            </div>
          )}
        </div>
      </section>

      {/* In-character description */}
      {location.teaser && (
        <section className="grim-parchment mb-7">
          <p className="m-0 text-2xl text-grim-parchment-ink-2" style={{ lineHeight: 1.65 }}>
            <span className="drop">{teaserFirstChar}</span>
            {teaserRest}
          </p>
        </section>
      )}

      {/* Two-column body */}
      <div className="grid gap-5.5" style={{ gridTemplateColumns: "1.05fr 0.95fr" }}>

        {/* LEFT — main detail content + sub-locations */}
        <div className="grim-stack gap-5.5">
          {location.detail ? (
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">The Chronicle</h3>
                <span className="grim-tome-sub">a full account of this place</span>
              </div>
              <div
                className="prose dark:prose-invert max-w-none prose-sm text-grim-ink-2 font-body text-xl"
                style={{ lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(location.detail) }}
              />
            </section>
          ) : (
            <section className="grim-tome border border-dashed border-grim-line-2 text-center py-7 px-6 text-grim-ink-4">
              <div className="font-display text-4xl text-grim-ink-3">~ uncharted ~</div>
              <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">No further record in the codex</div>
            </section>
          )}

          {/* Sub-locations as districts grid */}
          {subLocations.length > 0 && (
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Notable Places</h3>
                <span className="grim-tome-sub">{subLocations.length} place{subLocations.length !== 1 ? "s" : ""} of note</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {subLocations.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/campaign/locations/${sub.id}`)}
                    className="py-2.75 px-3.25 border border-grim-line bg-grim-bg-overlay/50 cursor-pointer relative"
                  >
                    <div className="font-head text-lg text-grim-ink tracking-wide mb-1">{sub.name}</div>
                    {sub.pronunciation && (
                      <div className="grim-mono text-xs text-grim-ember-2 tracking-wider-3 uppercase mb-1">{sub.pronunciation}</div>
                    )}
                    {sub.teaser && (
                      <div className="text-base text-grim-ink-2" style={{ lineHeight: 1.45 }}>{sub.teaser}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — appearances + DM marginalia */}
        <div className="grim-stack gap-5.5">
          {appearances.length > 0 && (
            <section className="grim-tome">
              <div className="grim-tome-head">
                <h3 className="grim-tome-title">Session Appearances</h3>
                <span className="grim-tome-sub">{appearances.length} recap{appearances.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grim-stack gap-2">
                {appearances.map((r) => (
                  <Link
                    key={r.id ?? r.date}
                    href={`/campaign/recaps/${r.id ?? r.date}`}
                    className="no-underline text-inherit block"
                  >
                    <div className="flex items-baseline justify-between gap-2 py-1.5 px-0 border-b border-dashed border-grim-line">
                      <span className="font-head text-lg text-grim-ink tracking-wide">{r.title}</span>
                      <span className="grim-mono text-sm text-grim-ink-4 tracking-widest shrink-0">{r.date}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

            {/* Party Notes */}
          <section className="grim-tome">
            <div className="grim-tome-head">
              <h3 className="grim-tome-title">Party Notes</h3>
              <span className="grim-tome-sub">field observations</span>
            </div>
            <UserNotesEditor
              notes={location.notes || []}
              onChange={handleUpdateNotes}
              currentUser={userId}
              isAdmin={isAdmin}
            />
          </section>

        {(isDM || isAdmin) && (
            dmMode ? (
              location.gm_notes ? (
                <section className="grim-tome border border-grim-arcane" style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 285), oklch(0.13 0.04 290))" }}>
                  <div className="grim-tome-head border-grim-arcane/30">
                    <h3 className="grim-tome-title text-grim-arcane">★ Master&apos;s Marginalia</h3>
                    <span className="grim-tome-sub">hidden from the party</span>
                  </div>
                  <div
                    className="prose dark:prose-invert max-w-none prose-sm text-grim-ink font-body text-lg"
                    style={{ lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(location.gm_notes) }}
                  />
                </section>
              ) : isAdmin ? (
                <section className="grim-tome border border-dashed border-grim-arcane/50 text-center py-5.5 px-5 text-grim-ink-4">
                  <div className="font-display text-3xl text-grim-arcane/60">~ no marginalia ~</div>
                  <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">No DM notes for this location</div>
                </section>
              ) : null
            ) : (
              <section className="grim-tome border border-dashed border-grim-line-2 text-center py-5.5 px-5 text-grim-ink-4">
                <div className="font-display text-3xl text-grim-ink-3">~ sealed ~</div>
                <div className="grim-mono text-sm tracking-widest-2 uppercase mt-1">Master&apos;s marginalia hidden</div>
              </section>
            )
          )}
        </div>
      </div>
    </div>
  );
}
