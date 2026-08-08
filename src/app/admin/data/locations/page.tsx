"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Location } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import ErrorBlock from "@/components/ErrorBlock";
import SuccessBlock from "@/components/SuccessBlock";
import ConfirmModal from "@/components/ConfirmModal";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useListArrowNav } from "@/hooks/useListArrowNav";

export default function LocationsManagementPage() {
  const {
    items: locations,
    loading,
    queryError,
    selected: selectedLocation,
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
    handleCreate: createLocation,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  } = useCrudResource<Location>({
    endpoint: "/api/data/locations",
    getId: (l) => l.id,
    validate: (f) => (!f.name || !f.teaser || !f.detail ? "Please fill in all required fields" : null),
    successMessage: (creating) => (creating ? "Location created." : "Location updated."),
    deleteConfirmMessage: (l) => `Are you sure you want to delete ${l.name}?`,
    deleteSuccessMessage: "Location deleted.",
  });

  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.teaser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.detail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useListArrowNav({
    items: filteredLocations,
    selected: selectedLocation,
    getId: (l) => l.id,
    dataAttr: "data-location-id",
    onSelect: handleView,
  });

  const handleCreate = () => {
    createLocation({
      id: `location-${Date.now()}`,
      name: "",
      teaser: "",
      detail: "",
      hidden: false,
    });
  };

  const fieldClass =
    "bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-xl py-2 px-3.5 outline-none w-full";

  if (loading) {
    return (
      <div className="pt-9 px-12 pb-20">
        <div className="grim-flame text-center py-20 px-0">
          Loading Locations…
        </div>
      </div>
    );
  }

  return (
    <div className="pt-9 px-12 pb-20">

      {/* Page header */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Places</div>
          <h1 className="grim-page-title text-7xl">Locations</h1>
          <p className="grim-page-sub">Towns, cities, and landmarks — the places that shape the journey.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Chart Location</button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* List panel */}
        <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
          {/* Search */}
          <div className="border-b border-grim-line">
            <input
              type="text"
              placeholder="Search locations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-grim-bg-3 border-0 border-b border-grim-line-2 text-grim-ink font-body text-xl py-2.5 px-3.5 outline-none w-full"
            />
          </div>

          {/* Location list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filteredLocations.length === 0 && (
              <div className="py-6 px-4 text-center text-grim-ink-4 font-body text-lg">
                No locations found.
              </div>
            )}
            {filteredLocations.map((location) => {
              const selected = selectedLocation?.id === location.id;
              return (
                <div
                  key={location.id}
                  data-location-id={location.id}
                  onClick={() => handleView(location)}
                  className={`border-b border-grim-line border-l-2 py-3 px-4 cursor-pointer ${selected ? "border-grim-ember" : "border-transparent"}`}
                  style={{
                    background: selected
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={`font-head text-lg overflow-hidden text-ellipsis whitespace-nowrap ${selected ? "text-grim-ember-2" : "text-grim-ink-2"}`}>
                        {location.name}
                      </div>
                      <div className="grim-mono text-sm text-grim-ink-4 overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                        {location.teaser}
                      </div>
                      {location.hidden && <span className="grim-chip is-dead text-xs mt-1">hidden</span>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a
                        className="grim-link text-base cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleEdit(location); }}
                        title="Edit"
                      >
                        Edit
                      </a>
                      <span className="text-grim-ink-4">·</span>
                      <a
                        className="text-base cursor-pointer text-grim-blood-2 font-body no-underline"
                        onClick={(e) => { e.stopPropagation(); handleDelete(location); }}
                        title="Delete"
                      >
                        Del
                      </a>
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
              {/* Form header */}
              <div className="grim-tome-head">
                <div className="grim-tome-title">
                  {isCreating ? "Chart New Location" : "Edit Location"}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Chart Location" : "Save Changes"}`}</button>
                </div>
              </div>

              <form className="py-6 px-7" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="flex flex-col gap-4.5">

                  {/* Name */}
                  <div>
                    <label className="grim-label">Name *</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={fieldClass}
                      required
                    />
                  </div>

                  {/* Pronunciation */}
                  <div>
                    <label className="grim-label">Pronunciation</label>
                    <input
                      type="text"
                      value={formData.pronunciation || ""}
                      onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                      className={fieldClass}
                      placeholder="e.g., az-OR-ee-ahn"
                    />
                  </div>

                  {/* Teaser */}
                  <div>
                    <label className="grim-label">Teaser *</label>
                    <input
                      type="text"
                      value={formData.teaser || ""}
                      onChange={(e) => setFormData({ ...formData, teaser: e.target.value })}
                      className={fieldClass}
                      placeholder="Brief description"
                      required
                    />
                  </div>

                  {/* Detail */}
                  <div>
                    <label className="grim-label">Detailed Description *</label>
                    <MarkdownEditor
                      value={formData.detail || ""}
                      onChange={(value) => setFormData({ ...formData, detail: value })}
                      rows={6}
                      label="Details"
                      linkEntities={locations.map(l => ({ id: String(l.id), name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` }))}
                    />
                  </div>

                  {/* GM Notes */}
                  <div>
                    <label className="grim-label">GM Notes</label>
                    <MarkdownEditor
                      value={formData.gm_notes || ""}
                      onChange={(value: string) => setFormData({ ...formData, gm_notes: value })}
                      rows={4}
                      label="GM Notes"
                      linkEntities={locations.map(l => ({ id: String(l.id), name: l.name, type: 'location' as const, url: `/campaign/locations/${l.id}` }))}
                    />
                  </div>

                  {/* Map Image URL */}
                  <div>
                    <label className="grim-label">Map Image URL</label>
                    <input
                      type="text"
                      value={formData.mapImg || ""}
                      onChange={(e) => setFormData({ ...formData, mapImg: e.target.value })}
                      className={fieldClass}
                      placeholder="https://example.com/map.jpg"
                    />
                  </div>

                  {/* Interactive Map Editor */}
                  {formData.mapImg && (
                    <div className="border border-grim-line-2 p-4">
                      <div className="font-head text-base tracking-widest uppercase text-grim-ink-3 mb-2.5">
                        Map Hover Area Editor
                      </div>
                      <MapAreaEditor
                        imageUrl={formData.mapImg}
                        x={typeof formData.x === 'number' ? formData.x : 0}
                        y={typeof formData.y === 'number' ? formData.y : 0}
                        width={typeof formData.width === 'number' ? formData.width : 20}
                        height={typeof formData.height === 'number' ? formData.height : 12}
                        onChange={(next) => setFormData({ ...formData, ...next })}
                      />
                    </div>
                  )}

                  {/* Map position grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="grim-label">X Position (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.x || ""}
                        onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) || 0 })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="grim-label">Y Position (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.y || ""}
                        onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) || 0 })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="grim-label">Width (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.width || ""}
                        onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="grim-label">Height (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.height || ""}
                        onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  {/* Hidden from players */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-body text-lg text-grim-ink-2">
                      <input type="checkbox" checked={!!formData.hidden} onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })} style={{ accentColor: "var(--grim-blood)" }} />
                      Hidden from players
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button type="button" className="grim-btn is-ghost" onClick={handleCancel}>
                      Cancel
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        className="grim-btn is-blood"
                        onClick={() => { handleCancel(); if (selectedLocation) handleDelete(selectedLocation); }}
                      >
                        Delete
                      </button>
                    )}
                    <button type="submit" className="grim-btn is-ember" disabled={isSaving}>
                      {isSaving ? "Saving…" : (isCreating ? "Chart Location" : "Save Changes")}
                    </button>
                  </div>

                </div>
              </form>
            </div>
          ) : selectedLocation ? (
            <div className="grim-tome overflow-hidden" style={{ padding: 0 }}>
              {/* Detail header */}
              <div className="pt-6 px-7 pb-5 border-b border-grim-line flex items-start justify-between gap-4">
                <div>
                  <div className="font-display text-5xl text-grim-gold mb-1" style={{ lineHeight: 1.1 }}>
                    {selectedLocation.name}
                  </div>
                  {selectedLocation.pronunciation && (
                    <div className="grim-mono text-sm text-grim-ink-4 tracking-wider-2">
                      {selectedLocation.pronunciation}
                    </div>
                  )}
                  {selectedLocation.hidden && <span className="grim-chip is-dead mt-1.5 inline-block">hidden</span>}
                </div>
                <div className="flex gap-2 shrink-0 pt-1">
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedLocation)}>
                    Edit
                  </button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedLocation)}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Detail body */}
              <div className="py-6 px-7 flex flex-col gap-5.5">

                {/* Teaser */}
                {selectedLocation.teaser && (
                  <div>
                    <div className="grim-label mb-1.5">Description</div>
                    <div
                      className="grim-flavor"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.teaser || '', true) }}
                    />
                  </div>
                )}

                {/* Detail */}
                {selectedLocation.detail && (
                  <div>
                    <div className="grim-label mb-1.5">Details</div>
                    <div
                      className="grim-flavor"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.detail || '', true) }}
                    />
                  </div>
                )}

                {/* Map position */}
                {(selectedLocation.x !== undefined || selectedLocation.y !== undefined) && (
                  <div>
                    <div className="grim-label mb-1.5">Map Position</div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "X", value: selectedLocation.x },
                        { label: "Y", value: selectedLocation.y },
                        { label: "Width", value: selectedLocation.width },
                        { label: "Height", value: selectedLocation.height },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-grim-bg-3 border border-grim-line py-2 px-3">
                          <div className="grim-mono text-xs tracking-wider-3 text-grim-ink-4 uppercase mb-0.5">{label}</div>
                          <div className="font-mono text-lg text-grim-ink-2">
                            {value?.toFixed(1) ?? "—"}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map image */}
                {selectedLocation.mapImg && (
                  <div>
                    <div className="grim-label mb-2">Map Image</div>
                    <Image
                      src={selectedLocation.mapImg}
                      alt={selectedLocation.name}
                      width={400}
                      height={300}
                      className="max-w-full h-auto border border-grim-line-2"
                    />
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="grim-tome flex flex-col items-center justify-center text-center min-h-80" style={{ padding: "80px 40px" }}>
              <div className="font-display text-6xl text-grim-ink-4 mb-4 leading-none">✠</div>
              <div className="font-head text-lg tracking-wider-2 uppercase text-grim-ink-3 mb-2">
                No location selected
              </div>
              <div className="font-body text-lg text-grim-ink-4 max-w-70">
                Select a location from the list to view its details, or chart a new one.
              </div>
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

function MapAreaEditor({
  imageUrl,
  x,
  y,
  width,
  height,
  onChange,
}: {
  imageUrl: string;
  x: number; // percent
  y: number; // percent
  width: number; // percent
  height: number; // percent
  onChange: (v: { x: number; y: number; width: number; height: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<null | { type: 'move' | 'resize'; startX: number; startY: number; startRect: { x: number; y: number; w: number; h: number } }>(null);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    setDragging({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { x, y, w: width, h: height },
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dxPx = e.clientX - dragging.startX;
    const dyPx = e.clientY - dragging.startY;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dxPct = (dxPx / rect.width) * 100;
    const dyPct = (dyPx / rect.height) * 100;

    if (dragging.type === 'move') {
      const nx = clamp(dragging.startRect.x + dxPct, 0, 100 - dragging.startRect.w);
      const ny = clamp(dragging.startRect.y + dyPct, 0, 100 - dragging.startRect.h);
      onChange({ x: nx, y: ny, width, height });
    } else {
      const nw = clamp(dragging.startRect.w + dxPct, 2, 100 - dragging.startRect.x);
      const nh = clamp(dragging.startRect.h + dyPct, 2, 100 - dragging.startRect.y);
      onChange({ x, y, width: nw, height: nh });
    }
  };

  const onMouseUp = () => setDragging(null);

  return (
    <div
      className="relative w-full max-w-140 select-none"
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Map image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Map" className="w-full h-auto block border border-grim-line-2" />

      {/* Hover area rect */}
      <div
        className="absolute border-2 border-grim-ember bg-grim-ember/12 cursor-move"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        {/* Resize handle */}
        <div
          className="absolute right-0 bottom-0 w-3.5 h-3.5 bg-grim-ember cursor-se-resize"
          style={{ transform: "translate(50%, 50%)" }}
          onMouseDown={(e) => onMouseDown(e, 'resize')}
        />
      </div>

      <div className="grim-mono text-sm text-grim-ink-4 mt-2 tracking-widest">
        Drag the rectangle to reposition. Drag the corner handle to resize.
      </div>
    </div>
  );
}
