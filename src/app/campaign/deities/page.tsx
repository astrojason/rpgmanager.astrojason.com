"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import Image from "next/image";
import { Deity } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";
import ErrorBlock, { toErrorMessage } from "@/components/ErrorBlock";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

function alignmentChipClass(alignment?: string): string {
  const a = (alignment || "").toLowerCase();
  if (a.includes("good")) return "grim-chip is-alive";
  if (a.includes("evil")) return "grim-chip is-deceased";
  return "grim-chip is-unknown";
}

export default function DeitiesPage() {
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeity, setEditingDeity] = useState<Partial<Deity>>({});

  const router = useRouter();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  usePageTracking();

  const { data: deities = [], isPending: loading, error: queryError } = useQuery<Deity[]>({
    queryKey: ['/api/data/deities'],
    queryFn: () => authFetch('/api/data/deities').then(r => {
      if (!r.ok) throw new Error(`Failed to load deities (${r.status})`);
      return r.json();
    }),
  });

  const visible = deities.filter(d => isAdmin || !d.hidden);
  const hiddenCount = visible.filter(d => d.hidden).length;

  const filtered = visible.filter(d => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term === "" ||
      d.name.toLowerCase().includes(term) ||
      (d.domain || "").toLowerCase().includes(term) ||
      (d.alignment || "").toLowerCase().includes(term) ||
      (d.description || "").toLowerCase().includes(term);
    const matchesHidden = !hiddenOnly || d.hidden;
    return matchesSearch && matchesHidden;
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddDeity = async (data: Partial<Deity>) => {
    try {
      const res = await authFetch("/api/data/deities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: ['/api/data/deities'] });
      setShowAddForm(false);
      setEditingDeity({});
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const startAdding = () => {
    setEditingDeity({ name: "", pronunciation: "", domain: "", alignment: "", status: "active", description: "", image: "", hidden: false });
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />
          Consulting the divine compendium&hellip;
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Admin add modal */}
      {showAddForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-grim-backdrop/75"
          onClick={() => { setShowAddForm(false); setEditingDeity({}); }}
        >
          <div
            className="bg-grim-bg-2 border border-grim-line-2 w-full overflow-y-auto m-4 p-8"
            style={{ maxWidth: 640, maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-head text-2xl text-grim-gold tracking-wider-2 uppercase mt-0 mx-0 mb-6">
              Record New Divinity
            </h2>
            <form
              onSubmit={e => { e.preventDefault(); handleAddDeity(editingDeity); }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Name", field: "name" as keyof Deity, full: false },
                  { label: "Pronunciation", field: "pronunciation" as keyof Deity, full: false },
                  { label: "Domain", field: "domain" as keyof Deity, full: false },
                  { label: "Image URL", field: "image" as keyof Deity, full: true },
                ] as { label: string; field: keyof Deity; full: boolean }[]).map(({ label, field, full }) => (
                  <div key={field} className={full ? "col-span-full" : ""}>
                    <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(editingDeity[field] as string) || ""}
                      onChange={e => setEditingDeity({ ...editingDeity, [field]: e.target.value })}
                      className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Alignment</label>
                  <select
                    value={editingDeity.alignment || ""}
                    onChange={e => setEditingDeity({ ...editingDeity, alignment: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="">— Unknown —</option>
                    {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Status</label>
                  <select
                    value={editingDeity.status || "active"}
                    onChange={e => setEditingDeity({ ...editingDeity, status: e.target.value })}
                    className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="forgotten">Forgotten</option>
                    <option value="dead">Dead</option>
                    <option value="ascendant">Ascendant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">Description</label>
                <MarkdownEditor value={editingDeity.description || ""} onChange={v => setEditingDeity({ ...editingDeity, description: v })} rows={4} label="Description" linkEntities={deities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` }))} />
              </div>
              <div>
                <label className="block font-mono text-sm tracking-widest-2 uppercase text-grim-ink-3 mb-1.5">GM Notes</label>
                <MarkdownEditor value={editingDeity.gm_notes || ""} onChange={v => setEditingDeity({ ...editingDeity, gm_notes: v })} rows={4} label="GM Notes" linkEntities={deities.map(d => ({ id: String(d.id), name: d.name, type: 'deity' as const, url: `/campaign/deities/${d.id}` }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-head text-lg text-grim-ink-2 tracking-wider">
                <input type="checkbox" checked={Boolean(editingDeity.hidden)} onChange={e => setEditingDeity({ ...editingDeity, hidden: e.target.checked })} className="accent-grim-ember" />
                Hidden from players
              </label>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-grim-line">
                <button type="button" className="grim-btn is-ghost" onClick={() => { setShowAddForm(false); setEditingDeity({}); }}>Cancel</button>
                <button type="submit" className="grim-btn is-ember">Record Divinity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEITY LIST */}
      <div className="pt-9 px-14 pb-20 h-full overflow-y-auto">

        {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError(null)} />}

        {/* Page header */}
        <div className="flex justify-between items-end mb-5.5">
          <div>
            <div className="grim-page-eyebrow">Volume the Seventh</div>
            <h1 className="grim-page-title">The Divine Compendium</h1>
            <p className="grim-page-sub">{visible.length} {visible.length === 1 ? "divinity" : "divinities"} recorded; gods, powers, and ancient forces that shape the world.</p>
          </div>
          {isAdmin && (
            <button className="grim-btn is-ember" onClick={startAdding}>+ Record New</button>
          )}
        </div>

        {/* Search */}
        <section className="flex gap-3 items-stretch mb-5.5">
          <div className="relative flex-1 min-w-70">
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Seek a name, a domain, a power…"
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl pt-3 pr-4 pb-3 pl-10.5 outline-none"
            />
            <span
              className="absolute left-3.5 text-grim-gold-2 text-2xl"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >✦</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setHiddenOnly(v => !v)}
              className={`grim-btn ${hiddenOnly ? "is-blood" : "is-ghost"} py-1.5 px-3 border ${hiddenOnly ? "border-grim-blood-2" : "border-grim-line"} ${hiddenOnly ? "" : "bg-transparent"}`}
            >
              Hidden Only
              <span className="grim-mono text-sm opacity-70 ml-1.5">{hiddenCount}</span>
            </button>
          )}
        </section>

        {/* Deity card grid */}
        <section>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="grim-h-section">Of the gods and divine powers</h2>
            <div className="grim-mono text-sm tracking-widest-2 text-grim-ink-3 uppercase">
              sorted alphabetical · {sorted.length} of {visible.length}
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-12 px-6 text-grim-ink-4">
              <div className="font-display text-5xl text-grim-ink-3">~ no divinities found ~</div>
              <div className="grim-mono text-sm tracking-widest-2 uppercase mt-2">Adjust thy search</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {sorted.map(deity => (
                <div
                  key={deity.id}
                  onClick={() => router.push(`/campaign/deities/${deity.id}`)}
                  className="grim-tome py-4 px-4.5 cursor-pointer border border-grim-line flex items-center gap-3.5 relative"
                  style={{ transition: "transform 0.15s ease, border-color 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-gold-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--grim-line)"; }}
                >
                  {deity.hidden && isAdmin && (
                    <span className="grim-mono absolute top-2 right-2.5 text-xs tracking-wider-3 text-grim-blood-2 uppercase">hidden</span>
                  )}
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-grim-gold-2 shrink-0 relative bg-grim-bg-3">
                    {safeImageSrc(deity.image) ? (
                      <Image src={safeImageSrc(deity.image)!} alt={deity.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-3xl text-grim-gold-2">✦</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-2xl text-grim-gold leading-none tracking-normal truncate">
                      {deity.name}
                    </div>
                    {deity.domain && (
                      <div className="grim-mono text-xs text-grim-gold-2 tracking-wider-3 uppercase mt-0.75">
                        {deity.domain}
                      </div>
                    )}
                    {deity.alignment && (
                      <div className="mt-1.5">
                        <span className={`${alignmentChipClass(deity.alignment)} text-xs py-0.5 px-1.5`}>{deity.alignment}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
