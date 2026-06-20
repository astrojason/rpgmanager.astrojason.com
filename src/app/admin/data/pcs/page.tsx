"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import MarkdownEditor from "@/components/MarkdownEditor";
import { getFunctions, httpsCallable } from "firebase/functions";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import ConfirmModal from "@/components/ConfirmModal";

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  padding: "9px 14px",
  outline: "none",
};

export default function PCsManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<PC>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const queryClient = useQueryClient();

  const { data: pcs = [], isPending: loading, error: queryError } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => {
      if (!r.ok) throw new Error('Failed to load PCs');
      return r.json().then((d: unknown) => Array.isArray(d) ? d : []);
    }),
  });
  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.json()),
  });

  // Firebase Functions can't go in useQuery — load users via effect
  useEffect(() => {
    const functions = getFunctions();
    const listUsers = httpsCallable(functions, 'listUsers');
    listUsers()
      .then(result => setUsers(result.data as UserData[]))
      .catch(userError => setError(userError instanceof Error ? userError.message : 'Failed to load users'));
  }, []);

  const filteredPcs = pcs.filter(pc =>
    pc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.race?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.hometown?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFactionName = (factionId: string) => {
    const f = factions.find((x) => x.id === factionId);
    return f ? f.name : factionId;
  };

  // Arrow key navigation similar to NPCs editor
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = el as HTMLElement;
      return !!node.closest('input, textarea, select, [contenteditable="true"]');
    };

    const moveSelection = (delta: number) => {
      if (filteredPcs.length === 0) return;
      const idx = selectedPc ? filteredPcs.findIndex(n => n.id === selectedPc.id) : -1;
      if (idx === -1) {
        const nextIdx = delta > 0 ? 0 : filteredPcs.length - 1;
        const next = filteredPcs[nextIdx];
        if (next) {
          setSelectedPc(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          setTimeout(() => {
            document.querySelector(`[data-pc-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= filteredPcs.length) return;
      const next = filteredPcs[nextIdx];
      if (!next) return;
      setSelectedPc(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-pc-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredPcs, selectedPc, setSelectedPc, setIsEditing, setIsCreating]);

  const getUserForPc = (pc: PC) => {
    if (!pc.player) return null;
    return users.find(user => user.uid === pc.player);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPc(null);
    setFormData({
      id: `pc-${Date.now()}`,
      name: "",
      race: "",
      hometown: "",
      status: "active",
      class: "",
      factions: []
    });
  };

  const handleEdit = (pc: PC) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedPc(pc);
    setFormData({ ...pc });
  };

  const handleView = (pc: PC) => {
    setSelectedPc(pc);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    setError("");
    try {
      if (!formData.name || !formData.race || !formData.hometown || !formData.class) {
        setError("Please fill in all required fields (Name, Race, Hometown, Class)");
        return;
      }
      setIsSaving(true);

      const pcData = formData as PC;

      let response;
      let successMessage;

      if (isCreating) {
        response = await authFetch('/api/data/pcs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pcData),
        });
        successMessage = "PC created successfully!";
      } else {
        response = await authFetch('/api/data/pcs', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pcData),
        });
        successMessage = "PC updated successfully!";
      }

      if (!response.ok) {
        throw new Error('Failed to save PC');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/data/pcs'] });
      setIsCreating(false);
      setIsEditing(false);
      setSelectedPc(pcData);
      setSuccess(successMessage);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save PC");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (pc: PC) => {
    setConfirmState({
      message: `Are you sure you want to delete ${pc.name}?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const response = await authFetch(`/api/data/pcs?id=${pc.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete PC');
          }

          await queryClient.invalidateQueries({ queryKey: ['/api/data/pcs'] });
          setSelectedPc(null);
          setSuccess("PC deleted successfully!");
          setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete PC");
        }
      },
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
        <span className="grim-flame" />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-3)", letterSpacing: ".08em" }}>
          Summoning the fellowship&hellip;
        </span>
      </div>
    );
  }

  const statusChipClass = (status: string | undefined) => {
    if (status === "active") return "grim-chip is-alive";
    if (status === "deceased") return "grim-chip is-dead";
    return "grim-chip";
  };

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Page header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; The Fellowship</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Player Characters</h1>
          <p className="grim-page-sub">Tend the dossiers of the fellowship &mdash; their histories, bonds, and burdens.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Add Character</button>
      </header>

      {/* Status messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      {success && (
        <div style={{
          background: "oklch(0.25 0.10 145 / 0.4)",
          border: "1px solid oklch(0.55 0.090 145)",
          color: "var(--grim-moss)",
          padding: "12px 16px",
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}>
          {success}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List panel */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 14px 0" }}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 10 }}>
              The Fellowship ({filteredPcs.length})
            </div>
            <input
              type="text"
              placeholder="Search characters…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                background: "var(--grim-bg-3)",
                border: "1px solid var(--grim-line-2)",
                color: "var(--grim-ink)",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                padding: "10px 14px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ maxHeight: 560, overflowY: "auto", marginTop: 12 }}>
            {filteredPcs.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-4)" }}>
                No characters found.
              </div>
            )}
            {filteredPcs.map((pc) => {
              const selected = selectedPc?.id === pc.id;
              return (
                <div
                  key={pc.id}
                  data-pc-id={pc.id}
                  onClick={() => handleView(pc)}
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderLeft: selected ? "2px solid var(--grim-ember)" : "2px solid transparent",
                    background: selected
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pc.name}
                      </div>
                      {pc.nickname && (
                        <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          &ldquo;{pc.nickname}&rdquo;
                        </div>
                      )}
                      <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pc.race} {pc.class}
                      </div>
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pc.hometown}
                      </div>
                      {pc.player && (
                        <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ember-2)", marginTop: 3 }}>
                          &#9670; {getUserForPc(pc)?.displayName || getUserForPc(pc)?.email || 'Unknown Player'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingTop: 2 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(pc); }}
                        className="grim-link"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em" }}
                        title="Edit"
                      >
                        edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(pc); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", color: "var(--grim-blood-2)" }}
                        title="Delete"
                      >
                        del
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail / Edit panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "New Character" : "Edit Character"}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Add Character" : "Save Changes"}`}</button>
                </div>
              </div>
              <div style={{ padding: "24px 28px 28px" }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                  {/* Name / Nickname */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Name *</div>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Nickname</div>
                      <input
                        type="text"
                        value={formData.nickname || ""}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Race / Class */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Race *</div>
                      <input
                        type="text"
                        value={formData.race || ""}
                        onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Class *</div>
                      <input
                        type="text"
                        value={formData.class || ""}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {/* Hometown / Status */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Hometown *</div>
                      <input
                        type="text"
                        value={formData.hometown || ""}
                        onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Status</div>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="retired">Retired</option>
                        <option value="deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  {/* Assigned Player */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Assigned Player</div>
                    <select
                      value={formData.player || ""}
                      onChange={(e) => setFormData({ ...formData, player: e.target.value || null })}
                      style={inputStyle}
                    >
                      <option value="">No Player Assigned</option>
                      {users.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.displayName || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Factions */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Factions</div>
                    <div style={{
                      maxHeight: 160,
                      overflowY: "auto",
                      padding: "10px 14px",
                      background: "var(--grim-bg-3)",
                      border: "1px solid var(--grim-line-2)",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 16px",
                    }}>
                      {factions.map((f) => {
                        const checked = (formData.factions || []).includes(f.id);
                        return (
                          <label key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-2)" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(formData.factions || []);
                                if (e.target.checked) next.add(f.id);
                                else next.delete(f.id);
                                setFormData({ ...formData, factions: Array.from(next) });
                              }}
                            />
                            <span>{f.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Character Image URL */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Character Image URL</div>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://example.com/character.jpg"
                      style={inputStyle}
                    />
                  </div>

                  {/* Character GIF URL */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Character GIF URL</div>
                    <input
                      type="text"
                      value={formData.gif || ""}
                      onChange={(e) => setFormData({ ...formData, gif: e.target.value })}
                      placeholder="https://example.com/character.gif"
                      style={inputStyle}
                    />
                  </div>

                  {/* GM Notes */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>GM Notes</div>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={6}
                      label="GM Notes"
                      linkEntities={[
                        ...pcs.map(p => ({ id: String(p.id), name: p.name, type: 'pc' as const, url: `/campaign/pcs/${p.id}` })),
                        ...factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` })),
                      ]}
                    />
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>
                      Cancel
                    </button>
                    {isEditing && (
                      <button type="button" className="grim-btn is-blood" onClick={() => handleDelete(selectedPc!)}>
                        Delete
                      </button>
                    )}
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                      {isSaving ? "Saving…" : (isCreating ? "Create Character" : "Save Changes")}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          ) : selectedPc ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="grim-tome-title">{selectedPc.name}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedPc)}>
                    Edit
                  </button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedPc)}>
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ padding: "24px 28px 28px" }}>
                {/* Name + status row */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-gold)", lineHeight: 1.1 }}>
                    {selectedPc.name}
                    {selectedPc.nickname && (
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--grim-ink-3)", marginLeft: 12 }}>
                        &ldquo;{selectedPc.nickname}&rdquo;
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {selectedPc.race && <span className="grim-chip">{selectedPc.race}</span>}
                    {selectedPc.class && <span className="grim-chip is-ember">{selectedPc.class}</span>}
                    {selectedPc.status && (
                      <span className={statusChipClass(selectedPc.status)} style={{ textTransform: "capitalize" }}>
                        {selectedPc.status}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {/* Left column: character info */}
                  <div>
                    <div className="grim-label" style={{ marginBottom: 10 }}>Character Dossier</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>Hometown</span>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)", marginTop: 2 }}>{selectedPc.hometown}</div>
                      </div>
                      {selectedPc.player && (
                        <div>
                          <span className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>Player</span>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ember-2)", marginTop: 2 }}>
                            {getUserForPc(selectedPc)?.displayName || getUserForPc(selectedPc)?.email || 'Unknown Player'}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedPc.factions && selectedPc.factions.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div className="grim-label" style={{ marginBottom: 8 }}>Factions</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {selectedPc.factions.map((faction, index) => (
                            <span key={index} className="grim-chip is-faction">
                              {getFactionName(faction)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: portraits */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {selectedPc.image && (
                      <div>
                        <div className="grim-label" style={{ marginBottom: 8 }}>Portrait</div>
                        <div className="grim-img-slot is-portrait" style={{ width: 128, height: 128 }}>
                          <Image
                            src={selectedPc.image}
                            alt={selectedPc.name || 'PC'}
                            width={128}
                            height={128}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedPc.gif && (
                      <div>
                        <div className="grim-label" style={{ marginBottom: 8 }}>Animated</div>
                        <div className="grim-img-slot is-portrait" style={{ width: 128, height: 128 }}>
                          <Image
                            src={selectedPc.gif}
                            alt={`${selectedPc.name || 'PC'} GIF`}
                            width={128}
                            height={128}
                            unoptimized
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="grim-tome" style={{ padding: "64px 40px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-ink-4)", marginBottom: 16 }}>⚔</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".10em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>
                No Character Selected
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)", maxWidth: 320, margin: "0 auto" }}>
                Choose a character from the fellowship to view their dossier, or forge a new one.
              </p>
            </div>
          )}
        </div>
      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
