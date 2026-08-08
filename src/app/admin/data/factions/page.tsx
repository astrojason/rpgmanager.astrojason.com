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

const inputStyle =
  "w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none";

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
      <div className="flex items-center justify-center h-50">
        <div className="flex items-center gap-3 text-grim-ink-3 font-mono text-base tracking-widest-2 uppercase">
          <span className="grim-flame" />Consulting the codex…
        </div>
      </div>
    );
  }

  return (
    <div className="px-12 pt-9 pb-20">

      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Banners</div>
          <h1 className="grim-page-title">Factions</h1>
          <p className="grim-page-sub">Guilds, cabals, and banners — the powers that shape the world.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Raise Banner</button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      <SuccessBlock message={success} />

      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* Factions List */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          <div className="py-3 px-4 border-b border-grim-line">
            <div className="font-head text-lg tracking-widest uppercase text-grim-ink-2 mb-2.5">
              Factions ({filteredFactions.length})
            </div>
            <input
              type="text"
              placeholder="Search banners…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            />
          </div>
          <div className="max-h-130 overflow-y-auto">
            {filteredFactions.map((faction) => {
              const selected = selectedFaction?.id === faction.id;
              return (
                <div
                  key={faction.id}
                  data-faction-id={faction.id}
                  onClick={() => handleView(faction)}
                  className={`border-b border-grim-line py-3 px-4 cursor-pointer flex items-center justify-between gap-2 border-l-2 ${selected ? "border-l-grim-ember" : "border-l-transparent"}`}
                  style={{ background: selected ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)" : "transparent" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-head text-lg truncate ${selected ? "text-grim-ember-2" : "text-grim-ink-2"}`}>
                      {faction.name}
                    </div>
                    <div className="grim-mono text-sm text-grim-ink-4 truncate mt-0.5">
                      {faction.type}{faction.location ? ` · ${faction.location}` : ""}
                    </div>
                    <div className="grim-mono text-sm text-grim-ink-4 mt-0.5 uppercase tracking-widest">
                      {faction.status}
                    </div>
                    {faction.hidden && <span className="grim-chip is-dead text-xs mt-1">hidden</span>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      className="grim-link text-sm font-mono tracking-widest uppercase bg-transparent border-0 cursor-pointer py-0.5 px-1"
                      onClick={(e) => { e.stopPropagation(); handleEdit(faction); }}
                      title="Edit"
                    >
                      edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(faction); }}
                      className="text-sm font-mono tracking-widest uppercase bg-transparent border-0 cursor-pointer py-0.5 px-1 text-grim-blood-2"
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "Raise New Banner" : "Amend the Record"}</div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Raise Banner" : "Save Changes"}`}</button>
                </div>
              </div>
              <div className="py-6 px-7">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="grim-label mb-1.5">Name *</div>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Pronunciation</div>
                      <input
                        type="text"
                        value={formData.pronunciation || ""}
                        onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                        className={inputStyle}
                        placeholder="e.g., STORM-seek-ers"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="grim-label mb-1.5">Type *</div>
                      <input
                        type="text"
                        value={formData.type || ""}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className={inputStyle}
                        placeholder="e.g., Guild, Organization, Military"
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Location *</div>
                      <input
                        type="text"
                        value={formData.location || ""}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Status</div>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className={inputStyle}
                      >
                        <option value="active">Active</option>
                        <option value="disbanded">Disbanded</option>
                        <option value="dormant">Dormant</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Description *</div>
                    <MarkdownEditor
                      value={formData.description || ""}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      rows={6}
                      label="Description"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Goals *</div>
                    <MarkdownEditor
                      value={formData.goals || ""}
                      onChange={(value) => setFormData({ ...formData, goals: value })}
                      rows={4}
                      label="Goals"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Background</div>
                    <MarkdownEditor
                      value={formData.background || ""}
                      onChange={(value) => setFormData({ ...formData, background: value })}
                      rows={4}
                      label="Background"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="grim-label mb-1.5">GM Notes</div>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                      linkEntities={factions.map(f => ({ id: String(f.id), name: f.name, type: 'faction' as const, url: `/campaign/factions/${f.id}` }))}
                    />
                  </div>

                  <div className="mb-6">
                    <div className="grim-label mb-1.5">Image URL</div>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className={inputStyle}
                      placeholder="https://example.com/faction-logo.jpg"
                    />
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <label className="flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                      <input type="checkbox" checked={!!formData.hidden} onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })} className="accent-grim-blood" />
                      Hidden from players
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="grim-tome-head" style={{ alignItems: "center" }}>
                <div className="grim-tome-title text-5xl" style={{ fontFamily: "var(--font-display)", color: "var(--grim-gold)", letterSpacing: ".04em" }}>
                  {selectedFaction.name}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedFaction)}>Edit</button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedFaction)}>Delete</button>
                </div>
              </div>

              <div className="py-6 px-7">

                {/* Top row: basic info + image */}
                <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: selectedFaction.image ? "1fr auto" : "1fr" }}>
                  <div>
                    <div className="grim-label mb-2.5">Banner Details</div>
                    <div className="flex flex-col gap-1.5">
                      {selectedFaction.pronunciation && (
                        <div className="font-mono text-base text-grim-ink-3 tracking-wider-3">
                          [{selectedFaction.pronunciation}]
                        </div>
                      )}
                      <div className="flex gap-2 items-center flex-wrap mt-1">
                        <span className="grim-chip">{selectedFaction.type}</span>
                        <span className="grim-chip">{selectedFaction.location}</span>
                        <span className={`grim-chip capitalize ${selectedFaction.status === 'active' ? 'is-faction' : 'is-dead'}`}>
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
                        className="w-24 h-24 object-cover border border-grim-line-2"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-5">
                  <div className="grim-label mb-2">Description</div>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.description || '', true) }} />
                </div>

                {/* Goals */}
                <div className="mb-5">
                  <div className="grim-label mb-2">Goals</div>
                  <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.goals || '', true) }} />
                </div>

                {/* Background */}
                {selectedFaction.background && (
                  <div className="mb-5">
                    <div className="grim-label mb-2">Background</div>
                    <div className="grim-flavor" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedFaction.background || '', true) }} />
                  </div>
                )}

                {/* Relationships */}
                {selectedFaction.relationships && selectedFaction.relationships.length > 0 && (
                  <div className="mb-5">
                    <div className="grim-label mb-2.5">Relationships</div>
                    <div className="flex flex-col gap-2">
                      {selectedFaction.relationships.map((rel, index) => (
                        <div
                          key={index}
                          className="bg-grim-bg-3 border border-grim-line py-2.5 px-3.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-head text-lg text-grim-ink-2">{rel.faction}</span>
                            <span className={`grim-chip capitalize shrink-0 ${rel.status === 'allied' ? 'is-faction' : rel.status === 'hostile' ? 'is-ember' : ''}`}>
                              {rel.status}
                            </span>
                          </div>
                          {rel.description && (
                            <div className="mt-1.5 font-body text-lg text-grim-ink-3">{rel.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="grim-tome text-center" style={{ padding: "60px 24px" }}>
              <div className="font-display text-5xl text-grim-ink-3 mb-3">⚑</div>
              <div className="font-head text-xl tracking-widest uppercase text-grim-ink-2 mb-2">No banner selected</div>
              <div className="text-grim-ink-4 text-lg">Select a faction from the list to view, or raise a new one.</div>
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
