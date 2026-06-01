"use client";

import { useState, useRef, useEffect } from "react";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import UserNotesEditor from "@/components/UserNotesEditor";
import EntityTagPicker from "@/components/EntityTagPicker";
import { UserNote } from "@/types/interfaces";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useIsAdmin } from "@/utils/adminCheck";
import { authFetch } from "@/utils/authFetch";
import Link from "next/link";

interface EntityItem { id: string; name: string; }

interface Recap {
  date: string;
  title: string;
  recap: string;
  id?: string;
  author?: string;
  notes?: UserNote[];
  tagged_npcs?: string[];
  tagged_locations?: string[];
}

export default function RecapsPage() {
  const [allRecaps, setAllRecaps] = useState<Recap[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [activeRecap, setActiveRecap] = useState<string | null>(null);
  const recapRefs = useRef<Record<string, HTMLElement | null>>({});
  const isAdmin = useIsAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecap, setNewRecap] = useState<Partial<Recap>>({ date: "", title: "", recap: "", tagged_npcs: [], tagged_locations: [] });
  const [editingRecapId, setEditingRecapId] = useState<string | null>(null);
  const [editingRecap, setEditingRecap] = useState<Partial<Recap>>({});
  const [availableNPCs, setAvailableNPCs] = useState<EntityItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<EntityItem[]>([]);

  useEffect(() => {
    const loadRecaps = async () => {
      try {
        const response = await authFetch("/api/data/session-recaps");
        if (response.ok) {
          const data = await response.json();
          setAllRecaps(data);
        }
      } catch (error) {
        console.error("Error loading recaps:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRecaps();
    authFetch('/api/data/npcs').then(r => r.json()).then((data: { id: string; name?: string; display_name?: string }[]) => {
      setAvailableNPCs(data.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id) })));
    }).catch(() => {});
    authFetch('/api/data/locations').then(r => r.json()).then((data: { id: string; name: string }[]) => {
      setAvailableLocations(data.map(l => ({ id: String(l.id), name: l.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Assign session numbers based on chronological order (oldest = #1)
  const sessionNumbers = [...allRecaps]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce(
      (acc, recap, index) => ({ ...acc, [recap.id || recap.date]: index + 1 }),
      {} as Record<string, number>
    );

  const filteredRecaps = allRecaps
    .filter(
      (recap) =>
        recap.title.toLowerCase().includes(search.toLowerCase()) ||
        recap.recap.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  const handleJumpToRecap = (key: string) => {
    setActiveRecap(key);
    setTimeout(() => {
      recapRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const canEditRecap = (recap: Recap) => {
    const uid = user?.uid;
    return !!uid && (isAdmin || (recap.author && recap.author === uid));
  };

  const handleAddRecap = async () => {
    if (!user) return;
    try {
      const payload = { ...newRecap, author: user.uid } as Recap;
      const res = await authFetch("/api/data/session-recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add recap");
      const data = await (await authFetch("/api/data/session-recaps")).json();
      setAllRecaps(data);
      setShowAddForm(false);
      setNewRecap({ date: "", title: "", recap: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to add recap");
    }
  };

  const handleStartEditRecap = (recap: Recap) => {
    if (!canEditRecap(recap)) return;
    setEditingRecapId(recap.id || null);
    setEditingRecap({ ...recap });
  };

  const handleSaveEditRecap = async () => {
    if (!editingRecapId) return;
    try {
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecap),
      });
      if (!res.ok) throw new Error("Failed to save recap");
      const data = await (await authFetch("/api/data/session-recaps")).json();
      setAllRecaps(data);
      setEditingRecapId(null);
      setEditingRecap({});
    } catch (e) {
      console.error(e);
      alert("Failed to save recap");
    }
  };

  const handleUpdateRecapNotes = async (recap: Recap, updatedNotes: UserNote[]) => {
    try {
      const payload = { ...recap, notes: updatedNotes };
      const res = await authFetch("/api/data/session-recaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      const data = await (await authFetch("/api/data/session-recaps")).json();
      setAllRecaps(data);
    } catch (e) {
      console.error(e);
      alert("Failed to update notes");
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the chronicle&hellip;
        </div>
      </div>
    );
  }

  const totalCount = allRecaps.length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 0, height: "100%", overflow: "hidden" }}>

      {/* Chronicle column */}
      <div style={{ overflowY: "auto", padding: "36px 40px 80px 56px" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <div className="grim-page-eyebrow">The Remembered Road</div>
            <h1 className="grim-page-title">Chronicle of Sessions</h1>
            <p className="grim-page-sub">
              {totalCount} {totalCount === 1 ? "night" : "nights"} of peril, set down in ink while the memory was yet warm.
            </p>
          </div>
        </div>

        {/* Search + sort + add */}
        <section style={{ display: "flex", gap: 12, marginBottom: 22 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              placeholder="Search the chronicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "var(--grim-bg-3)",
                border: "1px solid var(--grim-line-2)",
                color: "var(--grim-ink)",
                fontFamily: "var(--font-body)",
                fontSize: 16,
                padding: "12px 16px 12px 42px",
                outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--grim-gold-2)", fontSize: 18, pointerEvents: "none" }}>✦</span>
          </div>
          <button
            className="grim-btn is-ghost"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          >
            {sortOrder === "desc" ? "↓ Newest First" : "↑ Oldest First"}
          </button>
          {user && (
            <button
              className="grim-btn is-ember"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "✕ Cancel" : "+ Inscribe Recap"}
            </button>
          )}
        </section>

        {/* Add recap form */}
        {showAddForm && (
          <div className="grim-tome" style={{ marginBottom: 22 }}>
            <div className="grim-h-section" style={{ marginBottom: 14 }}>New Chronicle Entry</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div className="grim-label" style={{ marginBottom: 6 }}>Date</div>
                <input
                  type="date"
                  value={newRecap.date || ""}
                  onChange={(e) => setNewRecap({ ...newRecap, date: e.target.value })}
                  style={{
                    width: "100%",
                    background: "var(--grim-bg-4)",
                    border: "1px solid var(--grim-line-2)",
                    color: "var(--grim-ink)",
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    padding: "10px 14px",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <div className="grim-label" style={{ marginBottom: 6 }}>Title</div>
                <input
                  type="text"
                  value={newRecap.title || ""}
                  onChange={(e) => setNewRecap({ ...newRecap, title: e.target.value })}
                  style={{
                    width: "100%",
                    background: "var(--grim-bg-4)",
                    border: "1px solid var(--grim-line-2)",
                    color: "var(--grim-ink)",
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    padding: "10px 14px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="grim-label" style={{ marginBottom: 6 }}>Recap</div>
              <MarkdownEditor
                value={newRecap.recap || ""}
                onChange={(v) => setNewRecap({ ...newRecap, recap: v })}
                rows={10}
                label="Recap"
              />
            </div>
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <EntityTagPicker
                  npcs={availableNPCs}
                  locations={availableLocations}
                  selectedNpcs={newRecap.tagged_npcs ?? []}
                  selectedLocations={newRecap.tagged_locations ?? []}
                  onNpcsChange={(ids) => setNewRecap({ ...newRecap, tagged_npcs: ids })}
                  onLocationsChange={(ids) => setNewRecap({ ...newRecap, tagged_locations: ids })}
                />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleAddRecap} className="grim-btn is-ember">
                Inscribe to Chronicle
              </button>
            </div>
          </div>
        )}

        {/* Recap entries */}
        <div className="grim-stack" style={{ gap: 22 }}>
          {filteredRecaps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--grim-ink-4)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-ink-3)", marginBottom: 8 }}>
                ~ no sessions found ~
              </div>
              <div className="grim-mono" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>
                Adjust your search
              </div>
            </div>
          ) : (
            filteredRecaps.map((recap) => {
              const recapKey = recap.id || recap.date;
              const sessionNo = sessionNumbers[recapKey];
              const isActive = activeRecap === recapKey;

              return (
                <article
                  key={recap.date}
                  ref={(el) => { recapRefs.current[recapKey] = el; }}
                  className={`grim-tome${isActive ? " is-bordered" : ""}`}
                  id={`recap-${recap.date}`}
                  style={{ scrollMarginTop: 24 }}
                >
                  {/* Entry header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--grim-line)" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="grim-mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--grim-ember-2)", textTransform: "uppercase" }}>
                        {sessionNo ? `Session ${sessionNo} · ` : ""}{recap.date}
                      </div>
                      {editingRecapId === recap.id ? (
                        <input
                          type="text"
                          value={editingRecap.title as string}
                          onChange={(e) => setEditingRecap({ ...editingRecap, title: e.target.value })}
                          style={{
                            marginTop: 4,
                            background: "var(--grim-bg-4)",
                            border: "1px solid var(--grim-line-2)",
                            color: "var(--grim-ink)",
                            fontFamily: "var(--font-display)",
                            fontSize: 28,
                            padding: "6px 12px",
                            outline: "none",
                            width: "100%",
                          }}
                        />
                      ) : (
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--grim-gold)", margin: "4px 0 0", lineHeight: 1.05 }}>
                          {recap.title}
                        </h3>
                      )}
                    </div>
                    {canEditRecap(recap) && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {editingRecapId === recap.id ? (
                          <>
                            <button
                              onClick={() => { setEditingRecapId(null); setEditingRecap({}); }}
                              className="grim-btn is-ghost"
                              style={{ padding: "6px 12px", fontSize: 11 }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEditRecap}
                              className="grim-btn is-ember"
                              style={{ padding: "6px 12px", fontSize: 11 }}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEditRecap(recap)}
                            className="grim-btn is-ghost"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recap body */}
                  {editingRecapId === recap.id ? (
                    <>
                      <MarkdownEditor
                        value={(editingRecap.recap as string) || ""}
                        onChange={(v) => setEditingRecap({ ...editingRecap, recap: v })}
                        rows={12}
                        label="Recap"
                      />
                      {isAdmin && (
                        <div style={{ marginTop: 16 }}>
                          <EntityTagPicker
                            npcs={availableNPCs}
                            locations={availableLocations}
                            selectedNpcs={editingRecap.tagged_npcs ?? []}
                            selectedLocations={editingRecap.tagged_locations ?? []}
                            onNpcsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_npcs: ids })}
                            onLocationsChange={(ids) => setEditingRecap({ ...editingRecap, tagged_locations: ids })}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="grim-chronicle"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(recap.recap, isAdmin) }}
                    />
                  )}

                  {/* Tagged entities */}
                  {((recap.tagged_npcs && recap.tagged_npcs.length > 0) ||
                    (recap.tagged_locations && recap.tagged_locations.length > 0)) && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--grim-line)" }}>
                      <div className="grim-label" style={{ marginBottom: 8 }}>Souls & Places</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(recap.tagged_npcs ?? []).map(id => {
                          const n = availableNPCs.find(x => x.id === id);
                          return n ? (
                            <Link key={id} href={`/campaign/npcs?selected=${id}`} className="grim-chip is-ember" style={{ fontSize: 11, textDecoration: "none" }}>
                              {n.name}
                            </Link>
                          ) : null;
                        })}
                        {(recap.tagged_locations ?? []).map(id => {
                          const l = availableLocations.find(x => x.id === id);
                          return l ? (
                            <Link key={id} href={`/campaign/locations`} className="grim-chip is-arcane" style={{ fontSize: 11, textDecoration: "none" }}>
                              {l.name}
                            </Link>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes / Marginalia */}
                  <div className="grim-rule" />
                  <div>
                    <div className="grim-label" style={{ marginBottom: 10 }}>Marginalia</div>
                    <UserNotesEditor
                      notes={recap.notes || []}
                      onChange={(notes) => handleUpdateRecapNotes(recap, notes)}
                      currentUser={user}
                      isAdmin={isAdmin}
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Session rail */}
      <aside style={{ borderLeft: "1px solid var(--grim-line)", overflowY: "auto", padding: "22px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, padding: "0 22px" }}>
          <h2 className="grim-h-section" style={{ margin: 0 }}>The Sessions</h2>
          <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em" }}>
            {filteredRecaps.length}
          </span>
        </div>
        <div className="grim-stack" style={{ gap: 4 }}>
          {filteredRecaps.map((recap) => {
            const recapKey = recap.id || recap.date;
            const sessionNo = sessionNumbers[recapKey];
            const isActive = activeRecap === recapKey;
            return (
              <div
                key={recap.date}
                onClick={() => handleJumpToRecap(recapKey)}
                style={{
                  padding: "10px 22px",
                  cursor: "pointer",
                  background: isActive
                    ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                    : "transparent",
                  borderLeft: "2px solid " + (isActive ? "var(--grim-ember)" : "transparent"),
                }}
              >
                <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase" }}>
                  {recap.date}{sessionNo ? ` · s${sessionNo}` : ""}
                </div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".02em", color: isActive ? "var(--grim-ember-2)" : "var(--grim-ink-2)", lineHeight: 1.25, marginTop: 2 }}>
                  {recap.title}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
