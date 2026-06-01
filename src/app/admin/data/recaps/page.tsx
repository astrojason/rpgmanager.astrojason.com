"use client";

import { useState, useEffect } from "react";
import { SessionRecap } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import MarkdownEditor from "@/components/MarkdownEditor";
import EntityTagPicker from "@/components/EntityTagPicker";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import Link from "next/link";

interface EntityItem { id: string; name: string; }

export default function RecapsManagementPage() {
  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedRecap, setSelectedRecap] = useState<SessionRecap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<SessionRecap>>({});
  const [availableNPCs, setAvailableNPCs] = useState<EntityItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<EntityItem[]>([]);

  useEffect(() => {
    loadRecaps();
    authFetch('/api/data/npcs').then(r => r.json()).then((data: { id: string; name?: string; display_name?: string }[]) => {
      setAvailableNPCs(data.map(n => ({ id: String(n.id), name: n.name || n.display_name || String(n.id) })));
    }).catch(() => {});
    authFetch('/api/data/locations').then(r => r.json()).then((data: { id: string; name: string }[]) => {
      setAvailableLocations(data.map(l => ({ id: String(l.id), name: l.name })));
    }).catch(() => {});
  }, []);

  const loadRecaps = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/data/session-recaps');
      if (!response.ok) throw new Error('Failed to load session recaps');
      const data = await response.json();
      setRecaps(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session recaps');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecaps = recaps
    .filter(recap =>
      recap.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recap.recap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recap.date?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedRecap(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: "",
      recap: ""
    });
  };

  const handleEdit = (recap: SessionRecap) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedRecap(recap);
    setFormData({ ...recap });
  };

  const handleView = (recap: SessionRecap) => {
    setSelectedRecap(recap);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!formData.title || !formData.recap || !formData.date) {
      setError("Please fill in all required fields (Date, Title, Recap)");
      return;
    }

    const payload: SessionRecap = {
      ...(formData as SessionRecap),
      notes: Array.isArray(formData.notes) ? formData.notes : [],
    };

    try {
      let savedRecap: SessionRecap | null = null;

      if (isCreating) {
        const response = await authFetch("/api/data/session-recaps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to create session recap");
        const result = await response.json();
        const responseData = result?.data as SessionRecap | undefined;
        const mergedNotes = Array.isArray(responseData?.notes) ? responseData.notes : payload.notes;
        savedRecap = {
          ...payload,
          ...(responseData ?? {}),
          notes: mergedNotes ?? [],
          id: String(responseData?.id ?? payload.id ?? ""),
        };
        setSuccess("Session recap created successfully!");
      } else {
        if (!payload.id) {
          setError("Unable to update recap: missing identifier.");
          return;
        }
        const response = await authFetch("/api/data/session-recaps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to update session recap");
        const result = await response.json();
        const responseData = result?.data as SessionRecap | undefined;
        const mergedNotes = Array.isArray(responseData?.notes) ? responseData.notes : payload.notes;
        savedRecap = {
          ...payload,
          ...(responseData ?? {}),
          notes: mergedNotes ?? [],
          id: String(responseData?.id ?? payload.id ?? ""),
        };
        setSuccess("Session recap updated successfully!");
      }

      if (!savedRecap) return;

      const identifier = savedRecap.id ?? savedRecap.date;
      const nextRecaps = [
        ...recaps.filter((recap) => (recap.id ?? recap.date) !== identifier),
        savedRecap,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecaps(nextRecaps);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedRecap(savedRecap);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session recap");
    }
  };

  const handleDelete = async (recap: SessionRecap) => {
    if (!confirm(`Are you sure you want to delete the recap for "${recap.title}"?`)) return;
    setError("");
    setSuccess("");

    if (!recap.id) {
      setError("Unable to delete recap: missing identifier.");
      return;
    }

    try {
      const targetId = recap.id ?? recap.date;
      const response = await authFetch(`/api/data/session-recaps?id=${encodeURIComponent(String(recap.id))}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete session recap");

      const updatedRecaps = recaps.filter((r) => (r.id ?? r.date) !== targetId);
      setRecaps(updatedRecaps);
      setSelectedRecap((current) => ((current && (current.id ?? current.date) === targetId) ? null : current));
      setSuccess("Session recap deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session recap");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />
          Consulting the chronicle…
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Chronicle</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Session Recaps</h1>
          <p className="grim-page-sub">Chronicle the sessions — each night of peril, set down in ink.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Inscribe Recap</button>
      </header>

      {error && (
        <div style={{ background: "oklch(0.25 0.12 22 / 0.4)", border: "1px solid var(--grim-blood-2)", color: "oklch(0.85 0.08 30)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "oklch(0.25 0.10 145 / 0.4)", border: "1px solid oklch(0.55 0.090 145)", color: "var(--grim-moss)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 14 }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>

        {/* Recaps List */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search recaps…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "10px 14px", outline: "none" }}
            />
          </div>

          <div className="grim-tome" style={{ padding: 0, maxHeight: 520, overflowY: "auto" }}>
            {filteredRecaps.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                No session recaps found
              </div>
            ) : (
              filteredRecaps.map((recap) => {
                const isSelected = selectedRecap?.id === recap.id || (!selectedRecap?.id && selectedRecap?.date === recap.date);
                return (
                  <div
                    key={recap.id ?? recap.date}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: isSelected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                      borderLeft: "2px solid " + (isSelected ? "var(--grim-ember)" : "transparent"),
                      borderBottom: "1px solid var(--grim-line)",
                    }}
                    onClick={() => handleView(recap)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: isSelected ? "var(--grim-ember-2)" : "var(--grim-ink-2)" }}>
                          {recap.title}
                        </div>
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 3 }}>
                          {recap.date}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(recap); }}
                          className="grim-link"
                          style={{ fontSize: 11, letterSpacing: ".06em" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(recap); }}
                          className="grim-link"
                          style={{ fontSize: 11, letterSpacing: ".06em", color: "var(--grim-blood-2)" }}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail / Edit Panel */}
        <div>
          {isCreating || isEditing ? (
            <div className="grim-tome" style={{ padding: "24px 28px" }}>
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div className="grim-tome-title">
                  {isCreating ? "Inscribe New Recap" : "Edit Recap"}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="grim-label" style={{ marginBottom: 6 }}>Session Date *</div>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "9px 14px", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="grim-label" style={{ marginBottom: 6 }}>Session Title *</div>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter session title…"
                  style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "9px 14px", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <MarkdownEditor
                  value={formData.recap || ""}
                  onChange={(val) => setFormData({ ...formData, recap: val })}
                  rows={14}
                  label="Session Recap"
                  placeholder="Enter session recap content…"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <EntityTagPicker
                  npcs={availableNPCs}
                  locations={availableLocations}
                  selectedNpcs={formData.tagged_npcs ?? []}
                  selectedLocations={formData.tagged_locations ?? []}
                  onNpcsChange={(ids) => setFormData({ ...formData, tagged_npcs: ids })}
                  onLocationsChange={(ids) => setFormData({ ...formData, tagged_locations: ids })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="grim-btn is-ghost" onClick={handleCancel}>Cancel</button>
                <button className="grim-btn is-ember" onClick={handleSave}>Save Recap</button>
              </div>
            </div>
          ) : selectedRecap ? (
            <div className="grim-tome" style={{ padding: "24px 28px" }}>
              <div className="grim-tome-head" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div className="grim-tome-title">{selectedRecap.title}</div>
                    <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", marginTop: 4, letterSpacing: ".12em" }}>
                      {formatDate(selectedRecap.date)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, paddingTop: 4 }}>
                    <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedRecap)}>Edit</button>
                    <button className="grim-btn is-blood" onClick={() => handleDelete(selectedRecap)}>Delete</button>
                  </div>
                </div>
              </div>

              <hr className="grim-rule" style={{ marginBottom: 20 }} />

              {((selectedRecap.tagged_npcs && selectedRecap.tagged_npcs.length > 0) ||
                (selectedRecap.tagged_locations && selectedRecap.tagged_locations.length > 0)) && (
                <div style={{ marginBottom: 20 }}>
                  <div className="grim-label" style={{ marginBottom: 8 }}>Tagged Souls & Places</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(selectedRecap.tagged_npcs ?? []).map(id => {
                      const n = availableNPCs.find(x => x.id === id);
                      return n ? (
                        <Link key={id} href={`/admin/data/npcs?selected=${id}`} className="grim-chip is-ember" style={{ fontSize: 11, textDecoration: "none" }}>
                          {n.name}
                        </Link>
                      ) : null;
                    })}
                    {(selectedRecap.tagged_locations ?? []).map(id => {
                      const l = availableLocations.find(x => x.id === id);
                      return l ? (
                        <Link key={id} href={`/admin/data/locations`} className="grim-chip is-arcane" style={{ fontSize: 11, textDecoration: "none" }}>
                          {l.name}
                        </Link>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div
                className="prose-grim"
                style={{ color: "var(--grim-ink-2)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedRecap.recap, true) }}
              />
            </div>
          ) : (
            <div className="grim-tome" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ink-3)", marginBottom: 12 }}>✎</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No recap selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: 14 }}>Select a recap from the list to view, or inscribe a new one.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
