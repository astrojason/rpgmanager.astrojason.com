"use client";

import Image from "next/image";
import { Faction } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";

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

export default function FactionsManagementPage() {
  const {
    items: factions,
    loading,
    queryError,
    selected: selectedFaction,
    isEditing,
    isCreating,
    isSaving,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    error,
    setError,
    success,
    confirmState,
    closeConfirm,
    handleCreate: createFaction,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<Faction>({
    endpoint: "/api/data/factions",
    getId: (f) => f.id,
    validate: (f) => (!f.name || !f.type || !f.location || !f.description || !f.goals ? "Please fill in all required fields" : null),
    successMessage: (creating) => (creating ? "Faction created." : "Faction updated."),
    deleteConfirmMessage: (f) => `Are you sure you want to delete ${f.name}?`,
    deleteSuccessMessage: "Faction deleted.",
  });

  const filteredFactions = factions.filter(faction =>
    faction.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faction.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useListArrowNav({
    items: filteredFactions,
    selected: selectedFaction,
    getId: (f) => f.id,
    dataAttr: "data-faction-id",
    onSelect: handleView,
  });

  const handleCreate = () => {
    createFaction({
      name: "",
      type: "",
      location: "",
      status: "active",
      description: "",
      goals: "",
      pronunciation: "",
      hidden: false,
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--grim-ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span className="grim-flame" />Consulting the codex…
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Banners</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Factions</h1>
          <p className="grim-page-sub">Guilds, cabals, and banners — the powers that shape the world.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Raise Banner</button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      <SuccessBlock message={success} />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* Factions List */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--grim-line)" }}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 10 }}>
              Factions ({filteredFactions.length})
            </div>
            <input
              type="text"
              placeholder="Search banners…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", background: "var(--grim-bg-3)", border: "1px solid var(--grim-line-2)", color: "var(--grim-ink)", fontFamily: "var(--font-body)", fontSize: 15, padding: "10px 14px", outline: "none" }}
            />
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {filteredFactions.map((faction) => {
              const selected = selectedFaction?.id === faction.id;
              return (
                <div
                  key={faction.id}
                  data-faction-id={faction.id}
                  onClick={() => handleView(faction)}
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderLeft: selected ? "2px solid var(--grim-ember)" : "2px solid transparent",
                    background: selected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: selected ? "var(--grim-ember-2)" : "var(--grim-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {faction.name}
                    </div>
                    <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                      {faction.type}{faction.location ? ` · ${faction.location}` : ""}
                    </div>
                    <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".10em" }}>
                      {faction.status}
                    </div>
                    {faction.hidden && <span className="grim-chip is-dead" style={{ fontSize: 9, marginTop: 4 }}>hidden</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="grim-link"
                      onClick={(e) => { e.stopPropagation(); handleEdit(faction); }}
                      style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                      title="Edit"
                    >
                      edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(faction); }}
                      style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--grim-blood-2)" }}
                      title="Delete"
                    >
                      del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail/Edit Panel */}
        <div>
          {(isCreating || isEditing) ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "Raise New Banner" : "Amend the Record"}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Raise Banner" : "Save Changes"}`}</button>
                </div>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

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
                      <div className="grim-label" style={{ marginBottom: 6 }}>Pronunciation</div>
                      <input
                        type="text"
                        value={formData.pronunciation || ""}
                        onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g., STORM-seek-ers"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Type *</div>
                      <input
                        type="text"
                        value={formData.type || ""}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g., Guild, Organization, Military"
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Location *</div>
                      <input
                        type="text"
                        value={formData.location || ""}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label" style={{ marginBottom: 6 }}>Status</div>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        style={{ ...inputStyle }}
                      >
                        <option value="active">Active</option>
                        <option value="disbanded">Disbanded</option>
                        <option value="dormant">Dormant</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Description *</div>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Goals *</div>
                    <MarkdownEditor
                      value={formData.goals || ""}
                      onChange={(value) => setFormData({ ...formData, goals: value })}
                      rows={4}
                      label="Goals"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Background</div>
                    <MarkdownEditor
                      value={formData.background || ""}
                      onChange={(value) => setFormData({ ...formData, background: value })}
                      rows={4}
                      label="Background"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>GM Notes</div>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Image URL</div>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      style={inputStyle}
                      placeholder="https://example.com/faction-logo.jpg"
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-2)" }}>
                      <input type="checkbox" checked={!!formData.hidden} onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })} style={{ accentColor: "var(--grim-blood)" }} />
                      Hidden from players
                    </label>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
                    {isEditing && (
                      <button
                        type="button"
                        className="grim-btn is-blood"
                        onClick={() => handleDelete(selectedFaction!)}
                      >
                        Destroy
                      </button>
                    )}
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                      {isSaving ? "Saving…" : (isCreating ? "Raise Banner" : "Save Changes")}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          ) : selectedFaction ? (
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              <div className="grim-tome-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div className="grim-tome-title" style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--grim-gold)", letterSpacing: ".04em" }}>
                  {selectedFaction.name}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedFaction)}>Edit</button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedFaction)}>Delete</button>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>

                {/* Top row: basic info + image */}
                <div style={{ display: "grid", gridTemplateColumns: selectedFaction.image ? "1fr auto" : "1fr", gap: 24, marginBottom: 24 }}>
                  <div>
                    <div className="grim-label" style={{ marginBottom: 10 }}>Banner Details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedFaction.pronunciation && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--grim-ink-3)", letterSpacing: ".14em" }}>
                          [{selectedFaction.pronunciation}]
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                        <span className="grim-chip">{selectedFaction.type}</span>
                        <span className="grim-chip">{selectedFaction.location}</span>
                        <span className={`grim-chip ${selectedFaction.status === 'active' ? 'is-faction' : 'is-dead'}`} style={{ textTransform: "capitalize" }}>
                          {selectedFaction.status}
                        </span>
                        {selectedFaction.hidden && <span className="grim-chip is-dead">hidden</span>}
                      </div>
                    </div>
                  </div>
                  {selectedFaction.image && (
                    <div>
                      <Image
                        src={selectedFaction.image}
                        alt={selectedFaction.name}
                        width={96}
                        height={96}
                        style={{ width: 96, height: 96, objectFit: "cover", border: "1px solid var(--grim-line-2)" }}
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <div className="grim-label" style={{ marginBottom: 8 }}>Description</div>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.description || '', true) }} />
                </div>

                {/* Goals */}
                <div style={{ marginBottom: 20 }}>
                  <div className="grim-label" style={{ marginBottom: 8 }}>Goals</div>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.goals || '', true) }} />
                </div>

                {/* Background */}
                {selectedFaction.background && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="grim-label" style={{ marginBottom: 8 }}>Background</div>
                    <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.background || '', true) }} />
                  </div>
                )}

                {/* Relationships */}
                {selectedFaction.relationships && selectedFaction.relationships.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="grim-label" style={{ marginBottom: 10 }}>Relationships</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedFaction.relationships.map((rel, index) => (
                        <div
                          key={index}
                          style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)", padding: "10px 14px" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--grim-ink-2)" }}>{rel.faction}</span>
                            <span className={`grim-chip ${rel.status === 'allied' ? 'is-faction' : rel.status === 'hostile' ? 'is-ember' : ''}`} style={{ textTransform: "capitalize", flexShrink: 0 }}>
                              {rel.status}
                            </span>
                          </div>
                          {rel.description && (
                            <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)" }}>{rel.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="grim-tome" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--grim-ink-3)", marginBottom: 12 }}>⚑</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-2)", marginBottom: 8 }}>No banner selected</div>
              <div style={{ color: "var(--grim-ink-4)", fontSize: 14 }}>Select a faction from the list to view, or raise a new one.</div>
            </div>
          )}
        </div>

      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
