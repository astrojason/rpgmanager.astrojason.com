"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import MarkdownEditor from "@/components/MarkdownEditor";
import { getFunctions, httpsCallable } from "firebase/functions";
import { PC, Faction } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
}

const inputClassName =
  "w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none";

export default function PCsManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);

  const {
    items: pcs,
    loading,
    queryError,
    selected: selectedPc,
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
    handleCreate: createPc,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<PC>({
    endpoint: "/api/data/pcs",
    getId: (pc) => pc.id,
    validate: (f) => (!f.name || !f.race || !f.hometown || !f.class ? "Please fill in all required fields (Name, Race, Hometown, Class)" : null),
    successMessage: (creating) => (creating ? "PC created successfully!" : "PC updated successfully!"),
    saveErrorMessage: () => "Failed to save PC",
    deleteConfirmMessage: (pc) => `Are you sure you want to delete ${pc.name}?`,
    deleteErrorMessage: "Failed to delete PC",
    deleteSuccessMessage: "PC deleted successfully!",
  });

  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: ['/api/data/factions'],
    queryFn: () => authFetch('/api/data/factions').then(r => r.ok ? r.json() : []),
  });

  // Firebase Functions can't go in useQuery — load users via effect
  useEffect(() => {
    const functions = getFunctions();
    const listUsers = httpsCallable(functions, 'listUsers');
    listUsers()
      .then(result => setUsers(result.data as UserData[]))
      .catch(userError => setError(userError instanceof Error ? userError.message : 'Failed to load users'));
  }, [setError]);

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

  useListArrowNav({
    items: filteredPcs,
    selected: selectedPc,
    getId: (pc) => pc.id,
    dataAttr: "data-pc-id",
    onSelect: handleView,
  });

  const getUserForPc = (pc: PC) => {
    if (!pc.player) return null;
    return users.find(user => user.uid === pc.player);
  };

  const handleCreate = () => {
    createPc({
      id: `pc-${Date.now()}`,
      name: "",
      race: "",
      hometown: "",
      status: "active",
      class: "",
      factions: []
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3.5">
        <span className="grim-flame" />
        <span className="font-body text-lg text-grim-ink-3 tracking-widest">
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
    <div className="pt-9 px-12 pb-20">

      {/* Page header */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; The Fellowship</div>
          <h1 className="grim-page-title text-7xl">Player Characters</h1>
          <p className="grim-page-sub">Tend the dossiers of the fellowship &mdash; their histories, bonds, and burdens.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Add Character</button>
      </header>

      {/* Status messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}

      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List panel */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          <div className="pt-3.5 px-3.5 pb-0">
            <div className="font-head text-lg tracking-wider-4 uppercase text-grim-ink-3 mb-2.5">
              The Fellowship ({filteredPcs.length})
            </div>
            <input
              type="text"
              placeholder="Search characters…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none"
            />
          </div>

          <div className="max-h-140 overflow-y-auto mt-3">
            {filteredPcs.length === 0 && (
              <div className="py-6 px-4 text-center font-body text-lg text-grim-ink-4">
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
                  className={`border-b border-b-grim-line py-3 px-4 cursor-pointer border-l-2 ${selected ? "border-l-grim-ember" : "border-l-transparent"}`}
                  style={{
                    background: selected
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-head text-lg text-grim-ink truncate">
                        {pc.name}
                      </div>
                      {pc.nickname && (
                        <div className="grim-mono text-sm text-grim-ink-3 truncate">
                          &ldquo;{pc.nickname}&rdquo;
                        </div>
                      )}
                      <div className="grim-mono text-sm text-grim-ink-3 mt-0.5 truncate">
                        {pc.race} {pc.class}
                      </div>
                      <div className="grim-mono text-sm text-grim-ink-4 mt-px truncate">
                        {pc.hometown}
                      </div>
                      {pc.player && (
                        <div className="grim-mono text-sm text-grim-ember-2 mt-1">
                          &#9670; {getUserForPc(pc)?.displayName || getUserForPc(pc)?.email || 'Unknown Player'}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 pt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(pc); }}
                        className="grim-link bg-transparent border-none p-0 cursor-pointer font-mono text-sm tracking-wider"
                        title="Edit"
                      >
                        edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(pc); }}
                        className="bg-transparent border-none p-0 cursor-pointer font-mono text-sm tracking-wider text-grim-blood-2"
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="grim-tome-head">
                <div className="grim-tome-title">{isCreating ? "New Character" : "Edit Character"}</div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Add Character" : "Save Changes"}`}</button>
                </div>
              </div>
              <div className="pt-6 px-7 pb-7">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                  {/* Name / Nickname */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="grim-label mb-1.5">Name *</div>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Nickname</div>
                      <input
                        type="text"
                        value={formData.nickname || ""}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {/* Race / Class */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="grim-label mb-1.5">Race *</div>
                      <input
                        type="text"
                        value={formData.race || ""}
                        onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Class *</div>
                      <input
                        type="text"
                        value={formData.class || ""}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        className={inputClassName}
                        required
                      />
                    </div>
                  </div>

                  {/* Hometown / Status */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="grim-label mb-1.5">Hometown *</div>
                      <input
                        type="text"
                        value={formData.hometown || ""}
                        onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <div className="grim-label mb-1.5">Status</div>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className={inputClassName}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="retired">Retired</option>
                        <option value="deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  {/* Assigned Player */}
                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Assigned Player</div>
                    <select
                      value={formData.player || ""}
                      onChange={(e) => setFormData({ ...formData, player: e.target.value || null })}
                      className={inputClassName}
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
                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Factions</div>
                    <div className="max-h-40 overflow-y-auto py-2.5 px-3.5 bg-grim-bg-3 border border-grim-line-2 grid grid-cols-2 gap-y-2 gap-x-4">
                      {factions.map((f) => {
                        const checked = (formData.factions || []).includes(f.id);
                        return (
                          <label key={f.id} className="inline-flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
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
                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Character Image URL</div>
                    <input
                      type="text"
                      value={formData.image || ""}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://example.com/character.jpg"
                      className={inputClassName}
                    />
                  </div>

                  {/* Character GIF URL */}
                  <div className="mb-4">
                    <div className="grim-label mb-1.5">Character GIF URL</div>
                    <input
                      type="text"
                      value={formData.gif || ""}
                      onChange={(e) => setFormData({ ...formData, gif: e.target.value })}
                      placeholder="https://example.com/character.gif"
                      className={inputClassName}
                    />
                  </div>

                  {/* GM Notes */}
                  <div className="mb-4">
                    <div className="grim-label mb-1.5">GM Notes</div>
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
                  <div className="flex gap-2.5 justify-end mt-5">
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
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              <div className="grim-tome-head" style={{ alignItems: "center" }}>
                <div className="grim-tome-title">{selectedPc.name}</div>
                <div className="flex gap-2.5">
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedPc)}>
                    Edit
                  </button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedPc)}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="pt-6 px-7 pb-7">
                {/* Name + status row */}
                <div className="mb-5">
                  <div className="font-display text-5xl text-grim-gold" style={{ lineHeight: 1.1 }}>
                    {selectedPc.name}
                    {selectedPc.nickname && (
                      <span className="font-body text-2xl text-grim-ink-3 ml-3">
                        &ldquo;{selectedPc.nickname}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2.5">
                    {selectedPc.race && <span className="grim-chip">{selectedPc.race}</span>}
                    {selectedPc.class && <span className="grim-chip is-ember">{selectedPc.class}</span>}
                    {selectedPc.status && (
                      <span className={`${statusChipClass(selectedPc.status)} capitalize`}>
                        {selectedPc.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Left column: character info */}
                  <div>
                    <div className="grim-label mb-2.5">Character Dossier</div>
                    <div className="flex flex-col gap-2">
                      <div>
                        <span className="grim-mono text-sm text-grim-ink-4 tracking-wider-3 uppercase">Hometown</span>
                        <div className="font-body text-lg text-grim-ink-2 mt-0.5">{selectedPc.hometown}</div>
                      </div>
                      {selectedPc.player && (
                        <div>
                          <span className="grim-mono text-sm text-grim-ink-4 tracking-wider-3 uppercase">Player</span>
                          <div className="font-body text-lg text-grim-ember-2 mt-0.5">
                            {getUserForPc(selectedPc)?.displayName || getUserForPc(selectedPc)?.email || 'Unknown Player'}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedPc.factions && selectedPc.factions.length > 0 && (
                      <div className="mt-5">
                        <div className="grim-label mb-2">Factions</div>
                        <div className="flex flex-wrap gap-1.5">
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
                  <div className="flex flex-col gap-4">
                    {selectedPc.image && (
                      <div>
                        <div className="grim-label mb-2">Portrait</div>
                        <div className="grim-img-slot is-portrait w-32 h-32">
                          <Image
                            src={selectedPc.image}
                            alt={selectedPc.name || 'PC'}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {selectedPc.gif && (
                      <div>
                        <div className="grim-label mb-2">Animated</div>
                        <div className="grim-img-slot is-portrait w-32 h-32">
                          <Image
                            src={selectedPc.gif}
                            alt={`${selectedPc.name || 'PC'} GIF`}
                            width={128}
                            height={128}
                            unoptimized
                            className="w-full h-full object-cover"
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
            <div className="grim-tome text-center" style={{ padding: "64px 40px" }}>
              <div className="font-display text-6xl text-grim-ink-4 mb-4">⚔</div>
              <div className="font-head text-xl tracking-widest uppercase text-grim-ink-3 mb-2">
                No Character Selected
              </div>
              <p className="font-body text-lg text-grim-ink-4 max-w-80 mx-auto">
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
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
