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

  const fieldStyle: React.CSSProperties = {
    background: "var(--grim-bg-3)",
    border: "1px solid var(--grim-line-2)",
    color: "var(--grim-ink)",
    fontFamily: "var(--font-body)",
    fontSize: "0.9375rem",
    padding: "9px 14px",
    outline: "none",
    width: "100%",
  };

  if (loading) {
    return (
      <div style={{ padding: "36px 48px 80px" }}>
        <div className="grim-flame" style={{ textAlign: "center", padding: "80px 0" }}>
          Loading Locations…
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Page header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen · Places</div>
          <h1 className="grim-page-title" style={{ fontSize: "3.625rem" }}>Locations</h1>
          <p className="grim-page-sub">Towns, cities, and landmarks — the places that shape the journey.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Chart Location</button>
      </header>

      {/* Status Messages */}
      {(error || queryError) && <ErrorBlock error={error || queryError?.message || ''} onDismiss={() => setError("")} />}
      <SuccessBlock message={success} />

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

        {/* List panel */}
        <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
          {/* Search */}
          <div style={{ borderBottom: "1px solid var(--grim-line)" }}>
            <input
              type="text"
              placeholder="Search locations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "var(--grim-bg-3)",
                border: "none",
                borderBottom: "1px solid var(--grim-line-2)",
                color: "var(--grim-ink)",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                padding: "10px 14px",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* Location list */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filteredLocations.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: "0.8125rem" }}>
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
                  style={{
                    borderBottom: "1px solid var(--grim-line)",
                    borderLeft: selected ? "2px solid var(--grim-ember)" : "2px solid transparent",
                    background: selected
                      ? "linear-gradient(90deg, oklch(0.72 0.165 48 / 0.14), transparent)"
                      : "transparent",
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontFamily: "var(--font-head)",
                        fontSize: "0.875rem",
                        color: selected ? "var(--grim-ember-2)" : "var(--grim-ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {location.name}
                      </div>
                      <div className="grim-mono" style={{ fontSize: "0.625rem", color: "var(--grim-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {location.teaser}
                      </div>
                      {location.hidden && <span className="grim-chip is-dead" style={{ fontSize: "0.5625rem", marginTop: 4 }}>hidden</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a
                        className="grim-link"
                        style={{ fontSize: "0.75rem", cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); handleEdit(location); }}
                        title="Edit"
                      >
                        Edit
                      </a>
                      <span style={{ color: "var(--grim-ink-4)" }}>·</span>
                      <a
                        style={{ fontSize: "0.75rem", cursor: "pointer", color: "var(--grim-blood-2)", fontFamily: "var(--font-body)", textDecoration: "none" }}
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
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              {/* Form header */}
              <div className="grim-tome-head">
                <div className="grim-tome-title">
                  {isCreating ? "Chart New Location" : "Edit Location"}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleCancel} className="grim-btn is-ghost">✕ Cancel</button>
                  <button type="button" onClick={handleSave} className="grim-btn is-ember" disabled={isSaving}>{isSaving ? "Saving…" : `✓ ${isCreating ? "Chart Location" : "Save Changes"}`}</button>
                </div>
              </div>

              <form style={{ padding: "24px 28px" }} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Name */}
                  <div>
                    <label className="grim-label">Name *</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={fieldStyle}
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
                      style={fieldStyle}
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
                      style={fieldStyle}
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
                      style={fieldStyle}
                      placeholder="https://example.com/map.jpg"
                    />
                  </div>

                  {/* Interactive Map Editor */}
                  {formData.mapImg && (
                    <div style={{ border: "1px solid var(--grim-line-2)", padding: 16 }}>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: "0.75rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 10 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    <div>
                      <label className="grim-label">X Position (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.x || ""}
                        onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) || 0 })}
                        style={fieldStyle}
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
                        style={fieldStyle}
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
                        style={fieldStyle}
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
                        style={fieldStyle}
                      />
                    </div>
                  </div>

                  {/* Hidden from players */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--grim-ink-2)" }}>
                      <input type="checkbox" checked={!!formData.hidden} onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })} style={{ accentColor: "var(--grim-blood)" }} />
                      Hidden from players
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
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
            <div className="grim-tome" style={{ padding: 0, overflow: "hidden" }}>
              {/* Detail header */}
              <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--grim-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.25rem",
                    color: "var(--grim-gold)",
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}>
                    {selectedLocation.name}
                  </div>
                  {selectedLocation.pronunciation && (
                    <div className="grim-mono" style={{ fontSize: "0.6875rem", color: "var(--grim-ink-4)", letterSpacing: ".12em" }}>
                      {selectedLocation.pronunciation}
                    </div>
                  )}
                  {selectedLocation.hidden && <span className="grim-chip is-dead" style={{ marginTop: 6, display: "inline-block" }}>hidden</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, paddingTop: 4 }}>
                  <button className="grim-btn is-ghost" onClick={() => handleEdit(selectedLocation)}>
                    Edit
                  </button>
                  <button className="grim-btn is-blood" onClick={() => handleDelete(selectedLocation)}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Detail body */}
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

                {/* Teaser */}
                {selectedLocation.teaser && (
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Description</div>
                    <div
                      className="grim-flavor"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.teaser || '', true) }}
                    />
                  </div>
                )}

                {/* Detail */}
                {selectedLocation.detail && (
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Details</div>
                    <div
                      className="grim-flavor"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.detail || '', true) }}
                    />
                  </div>
                )}

                {/* Map position */}
                {(selectedLocation.x !== undefined || selectedLocation.y !== undefined) && (
                  <div>
                    <div className="grim-label" style={{ marginBottom: 6 }}>Map Position</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                      {[
                        { label: "X", value: selectedLocation.x },
                        { label: "Y", value: selectedLocation.y },
                        { label: "Width", value: selectedLocation.width },
                        { label: "Height", value: selectedLocation.height },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: "var(--grim-bg-3)", border: "1px solid var(--grim-line)", padding: "8px 12px" }}>
                          <div className="grim-mono" style={{ fontSize: "0.5625rem", letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--grim-ink-2)" }}>
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
                    <div className="grim-label" style={{ marginBottom: 8 }}>Map Image</div>
                    <Image
                      src={selectedLocation.mapImg}
                      alt={selectedLocation.name}
                      width={400}
                      height={300}
                      style={{ maxWidth: "100%", height: "auto", border: "1px solid var(--grim-line-2)" }}
                    />
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="grim-tome" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center", minHeight: 320 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--grim-ink-4)", marginBottom: 16, lineHeight: 1 }}>✠</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: "0.8125rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>
                No location selected
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--grim-ink-4)", maxWidth: 280 }}>
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
      style={{ position: "relative", width: "100%", maxWidth: 560, userSelect: "none" }}
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Map image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Map" style={{ width: "100%", height: "auto", display: "block", border: "1px solid var(--grim-line-2)" }} />

      {/* Hover area rect */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${width}%`,
          height: `${height}%`,
          border: "2px solid var(--grim-ember)",
          background: "oklch(0.72 0.165 48 / 0.12)",
          cursor: "move",
        }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        {/* Resize handle */}
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            transform: "translate(50%, 50%)",
            width: 14,
            height: 14,
            background: "var(--grim-ember)",
            cursor: "se-resize",
          }}
          onMouseDown={(e) => onMouseDown(e, 'resize')}
        />
      </div>

      <div className="grim-mono" style={{ fontSize: "0.625rem", color: "var(--grim-ink-4)", marginTop: 8, letterSpacing: ".08em" }}>
        Drag the rectangle to reposition. Drag the corner handle to resize.
      </div>
    </div>
  );
}
