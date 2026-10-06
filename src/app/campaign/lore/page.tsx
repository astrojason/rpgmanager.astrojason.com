"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import ErrorBlock from "@/components/ErrorBlock";

interface LoreEntry {
  id: string;
  title: string;
  category?: string;
  content: string;
  hidden?: boolean;
  gm_notes?: string;
}

export default function LorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canEdit = useIsAdmin() || useIsDM();

  const { data: entries = [], isPending: loading, error: queryError } = useQuery<LoreEntry[]>({
    queryKey: ["/api/data/lore"],
    queryFn: async () => {
      const res = await authFetch("/api/data/lore");
      if (!res.ok) throw new Error(`Failed to load lore (${res.status}): ${await res.text()}`);
      return res.json();
    },
  });

  const categories = Array.from(
    new Set(entries.map((e) => e.category).filter(Boolean) as string[])
  ).sort();

  const term = searchTerm.trim().toLowerCase();
  const filtered = entries
    .filter((e) => {
      const matchSearch = !term || e.title.toLowerCase().includes(term) || e.content.toLowerCase().includes(term);
      const matchCat = categoryFilter === "all" || (e.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchCat;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const selected = entries.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="pt-9 px-12 pb-20">
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">The Archive &middot; Lore</div>
          <h1 className="grim-page-title">Lore</h1>
          <p className="grim-page-sub">The history, legends, and world-building of the setting.</p>
        </div>
        {canEdit && (
          <Link href="/admin/data/lore" className="grim-btn is-ghost shrink-0 no-underline">
            Manage Lore
          </Link>
        )}
      </header>

      {queryError && <ErrorBlock error={queryError.message} />}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="grim-flame" />
          <span className="ml-3 font-body text-grim-ink-3 text-lg">Loading Lore...</span>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>
          <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
            <input
              type="text"
              placeholder="Search lore..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-grim-bg-3 border-0 border-b border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none w-full"
            />
            {categories.length > 0 && (
              <div className="flex gap-1.5 flex-wrap p-3 border-b border-grim-line">
                {["all", ...categories].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`grim-chip cursor-pointer ${categoryFilter === c ? "is-ember" : ""}`}
                  >
                    {c === "all" ? "All" : c}
                  </button>
                ))}
              </div>
            )}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={`border-b border-grim-line py-3 px-4 cursor-pointer border-l-2 ${selected?.id === entry.id ? "border-grim-ember" : "border-transparent"}`}
                  style={{
                    background: selected?.id === entry.id
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                  }}
                >
                  <div className="font-head text-lg text-grim-ink truncate">{entry.title}</div>
                  {entry.category && (
                    <div className="grim-mono text-sm text-grim-ink-4 truncate mt-1">{entry.category}</div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-center font-body text-lg text-grim-ink-4">
                  {entries.length === 0 ? "No lore has been recorded yet." : "No lore matches your search."}
                </div>
              )}
            </div>
          </div>

          <div>
            {selected ? (
              <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
                <div className="py-4 px-5 border-b border-grim-line">
                  <div className="font-display text-5xl text-grim-gold" style={{ lineHeight: 1.1 }}>
                    {selected.title}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    {selected.category && <span className="grim-chip is-ember">{selected.category}</span>}
                    {selected.hidden && <span className="grim-chip">Hidden from players</span>}
                  </div>
                </div>
                <div className="p-6">
                  <div
                    className="grim-flavor"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selected.content, true) }}
                  />
                  {canEdit && selected.gm_notes && (
                    <div className="mt-6 pt-4 border-t border-grim-line">
                      <div className="grim-label">GM Notes</div>
                      <div
                        className="grim-flavor"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selected.gm_notes, true) }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grim-tome text-center" style={{ padding: "64px 32px" }}>
                <div className="font-display text-7xl text-grim-ink-4 mb-4 leading-none">📚</div>
                <div className="font-head text-lg tracking-wider-2 uppercase text-grim-ink-3">
                  Nothing to read yet
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
