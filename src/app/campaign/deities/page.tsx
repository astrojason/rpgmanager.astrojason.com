"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useIsAdmin } from "@/utils/adminCheck";
import { Deity } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { safeImageSrc } from "@/utils/sanitize";
import Image from "next/image";
import Link from "next/link";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";
import { usePageTracking } from "@/utils/referrerTracking";

function alignmentChipClass(alignment?: string): string {
  const a = (alignment || "").toLowerCase();
  if (a.includes("good")) return "grim-chip is-alive";
  if (a.includes("evil")) return "grim-chip is-dead";
  return "grim-chip is-unknown";
}

export default function DeitiesPage() {
  const [deities, setDeities] = useState<Deity[]>([]);
  const [selected, setSelected] = useState<Deity | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recapData, setRecapData] = useState<{ id?: string; title: string; date: string; tagged_deities?: string[] }[]>([]);
  const [questData, setQuestData] = useState<{ id: string; name: string; status: string; tagged_deities?: string[] }[]>([]);
  const isAdmin = useIsAdmin();
  const searchParams = useSearchParams();

  usePageTracking();

  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, rRes, qRes] = await Promise.all([
          authFetch("/api/data/deities"),
          authFetch("/api/data/session-recaps"),
          authFetch("/api/data/quests"),
        ]);
        if (!dRes.ok) throw new Error(`Failed to load deities (${dRes.status})`);
        const dData = await dRes.json();
        setDeities(dData);
        if (rRes.ok) setRecapData(await rRes.json());
        if (qRes.ok) setQuestData(await qRes.json());
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const id = searchParams.get("deity");
    if (id && deities.length > 0) {
      const match = deities.find(d => String(d.id) === id);
      if (match) setSelected(match);
    }
  }, [searchParams, deities]);

  const visible = deities.filter(d => isAdmin || !d.hidden);
  const filtered = visible.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.domain || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the divine compendium&hellip;
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden" }}>

      {/* Left: detail panel */}
      <div style={{ padding: "36px 40px 80px 56px", overflowY: "auto" }}>
        {error && <ErrorBlock error={error} onDismiss={() => setError(null)} />}

        {selected ? (
          <>
            <button className="grim-btn is-ghost" style={{ marginBottom: 20 }} onClick={() => setSelected(null)}>
              ‹ All Divinities
            </button>

            {/* Deity header */}
            <section className="grim-tome is-bordered" style={{ marginBottom: 24, overflow: "hidden", padding: 0 }}>
              <div style={{ position: "relative", padding: "28px 32px", background: "linear-gradient(135deg, oklch(0.22 0.06 290) 0%, oklch(0.16 0.05 285) 55%, oklch(0.30 0.10 60) 100%)" }}>
                <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, oklch(1 0 0 / 0.02) 0 2px, transparent 2px 7px)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
                  {safeImageSrc(selected.image) && (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--grim-gold-2)", flexShrink: 0, position: "relative" }}>
                      <Image src={safeImageSrc(selected.image)!} alt={selected.name} fill style={{ objectFit: "cover" }} />
                    </div>
                  )}
                  <div>
                    <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--grim-gold-2)", textTransform: "uppercase", marginBottom: 4 }}>
                      Divinity
                    </div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-gold)", margin: 0, lineHeight: 1 }}>
                      {selected.name}
                    </h1>
                    {selected.pronunciation && (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", fontStyle: "italic", marginTop: 4 }}>
                        {selected.pronunciation}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {selected.domain && <span className="grim-chip">{selected.domain}</span>}
                      {selected.alignment && <span className={alignmentChipClass(selected.alignment)}>{selected.alignment}</span>}
                      {selected.status && <span className="grim-chip is-unknown">{selected.status}</span>}
                      {selected.hidden && isAdmin && <span className="grim-chip is-dead">hidden</span>}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Description */}
            {selected.description && (
              <section className="grim-tome" style={{ marginBottom: 24 }}>
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title">Lore</h3>
                </div>
                <div
                  className="grim-flavor"
                  style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selected.description, isAdmin) }}
                />
              </section>
            )}

            {/* GM Notes */}
            {isAdmin && selected.gm_notes && (
              <section className="grim-tome" style={{ marginBottom: 24, borderColor: "var(--grim-arcane)" }}>
                <div className="grim-tome-head">
                  <h3 className="grim-tome-title" style={{ color: "var(--grim-arcane)" }}>GM&apos;s Compendium</h3>
                </div>
                <div
                  style={{ fontSize: 14, color: "var(--grim-ink-2)", lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selected.gm_notes, true) }}
                />
              </section>
            )}

            {/* Backlinks */}
            {(() => {
              const deityRecaps = recapData
                .filter(r => (r.tagged_deities ?? []).includes(String(selected.id)))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const deityQuests = questData.filter(q => (q.tagged_deities ?? []).includes(String(selected.id)));
              if (deityRecaps.length === 0 && deityQuests.length === 0) return null;
              return (
                <section className="grim-tome">
                  <div className="grim-tome-head">
                    <h3 className="grim-tome-title">Appearances</h3>
                    <span className="grim-tome-sub">sessions &amp; quests</span>
                  </div>
                  <div className="grim-stack" style={{ gap: 8 }}>
                    {deityRecaps.map(r => (
                      <Link key={r.id ?? r.date} href={`/campaign/recaps?recap=${r.id ?? r.date}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                          <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-ember-2)", flexShrink: 0 }}>SESSION</span>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)" }}>{r.title}</span>
                          <span className="grim-mono" style={{ fontSize: 9, color: "var(--grim-ink-4)", marginLeft: "auto" }}>{r.date}</span>
                        </div>
                      </Link>
                    ))}
                    {deityQuests.map(q => (
                      <Link key={q.id} href={`/campaign/quests?quest=${q.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                          <span className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-gold)", flexShrink: 0 }}>QUEST</span>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: "var(--grim-ink)" }}>{q.name}</span>
                          <span className="grim-chip" style={{ fontSize: 9, marginLeft: "auto" }}>{q.status}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })()}
          </>
        ) : (
          <>
            <div className="grim-page-eyebrow">The Divine Compact</div>
            <h1 className="grim-page-title">Pantheon</h1>
            <p className="grim-page-sub" style={{ marginBottom: 22 }}>
              The gods, ancient powers, and divine forces that shape the world.
            </p>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>✦</div>
                <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>No divinities recorded</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {filtered.map(deity => (
                  <div
                    key={deity.id}
                    className="grim-tome"
                    style={{ cursor: "pointer", padding: "18px 20px" }}
                    onClick={() => setSelected(deity)}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      {safeImageSrc(deity.image) ? (
                        <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--grim-line)", flexShrink: 0, position: "relative" }}>
                          <Image src={safeImageSrc(deity.image)!} alt={deity.name} fill style={{ objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "1px solid var(--grim-line)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 22, color: "var(--grim-gold-2)" }}>✦</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 15, letterSpacing: ".04em", color: "var(--grim-ink)" }}>{deity.name}</div>
                        {deity.domain && (
                          <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--grim-gold-2)", textTransform: "uppercase", marginTop: 2 }}>{deity.domain}</div>
                        )}
                        {deity.alignment && (
                          <span className={alignmentChipClass(deity.alignment)} style={{ fontSize: 9, marginTop: 4, display: "inline-block" }}>{deity.alignment}</span>
                        )}
                      </div>
                      {deity.hidden && isAdmin && (
                        <span className="grim-chip is-dead" style={{ fontSize: 9 }}>hidden</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: search rail */}
      <aside style={{ borderLeft: "1px solid var(--grim-line)", padding: "36px 16px 80px 22px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 className="grim-h-section" style={{ margin: 0 }}>The Pantheon</h2>
          <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em" }}>{filtered.length}</span>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search divinities…"
            style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 13, padding: "8px 12px 8px 32px", outline: "none" }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 14 }}>✦</span>
        </div>

        {isAdmin && (
          <Link href="/admin/data/deities" className="grim-btn is-ghost" style={{ display: "block", textAlign: "center", marginBottom: 14, textDecoration: "none", fontSize: 12 }}>
            ✎ Manage Deities
          </Link>
        )}

        <div className="grim-stack" style={{ gap: 4 }}>
          {filtered.map(deity => (
            <div
              key={deity.id}
              onClick={() => setSelected(deity)}
              style={{
                padding: "10px 14px", cursor: "pointer",
                borderLeft: `2px solid ${selected?.id === deity.id ? "var(--grim-gold)" : "transparent"}`,
                background: selected?.id === deity.id ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.10), transparent)" : "transparent",
              }}
            >
              <div style={{ fontFamily: "var(--font-head)", fontSize: 13, color: selected?.id === deity.id ? "var(--grim-ember-2)" : "var(--grim-ink-2)", letterSpacing: ".02em" }}>
                {deity.name}
              </div>
              {deity.domain && (
                <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".12em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginTop: 2 }}>{deity.domain}</div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
