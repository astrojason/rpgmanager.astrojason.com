"use client";

import { useState, useEffect, useRef } from "react";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import Image from "next/image";
import { Location } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";
import { authFetch } from "@/utils/authFetch";
import ErrorBlock from "@/components/ErrorBlock";
import ConfirmModal from "@/components/ConfirmModal";

export default function LocationsManagementPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Location>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/data/locations');
      if (!response.ok) throw new Error('Failed to load Locations');
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Locations');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.teaser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.detail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Arrow key navigation similar to NPCs editor
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false;
      const node = el as HTMLElement;
      return !!node.closest('input, textarea, select, [contenteditable="true"]');
    };
    const moveSelection = (delta: number) => {
      if (filteredLocations.length === 0) return;
      const idx = selectedLocation ? filteredLocations.findIndex(n => n.id === selectedLocation.id) : -1;
      if (idx === -1) {
        const nextIdx = delta > 0 ? 0 : filteredLocations.length - 1;
        const next = filteredLocations[nextIdx];
        if (next) {
          setSelectedLocation(next);
          setIsEditing(false);
          setIsCreating(false);
          setFormData({});
          setTimeout(() => {
            document.querySelector(`[data-location-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
          }, 0);
        }
        return;
      }
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= filteredLocations.length) return;
      const next = filteredLocations[nextIdx];
      if (!next) return;
      setSelectedLocation(next);
      setIsEditing(false);
      setIsCreating(false);
      setFormData({});
      setTimeout(() => {
        document.querySelector(`[data-location-id=\"${next.id}\"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredLocations, selectedLocation, setSelectedLocation, setIsEditing, setIsCreating]);

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedLocation(null);
    setFormData({
      id: `location-${Date.now()}`,
      name: "",
      teaser: "",
      detail: ""
    });
  };

  const handleEdit = (location: Location) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedLocation(location);
    setFormData({ ...location });
  };

  const handleView = (location: Location) => {
    setSelectedLocation(location);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    setError("");
    try {
      if (!formData.name || !formData.teaser || !formData.detail) {
        setError("Please fill in all required fields");
        return;
      }
      setIsSaving(true);

      const locationData = formData as Location;

      let updatedLocations;
      if (isCreating) {
        updatedLocations = [...locations, locationData];
        setSuccess("Location created successfully!");
      } else {
        updatedLocations = locations.map(location => location.id === locationData.id ? locationData : location);
        setSuccess("Location updated successfully!");
      }

      setLocations(updatedLocations);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedLocation(locationData);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Location");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (location: Location) => {
    setConfirmState({
      message: `Are you sure you want to delete ${location.name}?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const updatedLocations = locations.filter(l => l.id !== location.id);
          setLocations(updatedLocations);
          setSelectedLocation(null);
          setSuccess("Location deleted successfully!");
          setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete Location");
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

  const fieldStyle: React.CSSProperties = {
    background: "var(--grim-bg-3)",
    border: "1px solid var(--grim-line-2)",
    color: "var(--grim-ink)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
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
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>Locations</h1>
          <p className="grim-page-sub">Towns, cities, and landmarks — the places that shape the journey.</p>
        </div>
        <button className="grim-btn is-ember" onClick={handleCreate}>+ Chart Location</button>
      </header>

      {/* Status Messages */}
      {error && <ErrorBlock error={error} onDismiss={() => setError("")} />}

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
                fontSize: 15,
                padding: "10px 14px",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* Location list */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {filteredLocations.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--grim-ink-4)", fontFamily: "var(--font-body)", fontSize: 13 }}>
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
                        fontSize: 14,
                        color: selected ? "var(--grim-ember-2)" : "var(--grim-ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {location.name}
                      </div>
                      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {location.teaser}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a
                        className="grim-link"
                        style={{ fontSize: 12, cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); handleEdit(location); }}
                        title="Edit"
                      >
                        Edit
                      </a>
                      <span style={{ color: "var(--grim-ink-4)" }}>·</span>
                      <a
                        style={{ fontSize: 12, cursor: "pointer", color: "var(--grim-blood-2)", fontFamily: "var(--font-body)", textDecoration: "none" }}
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
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 10 }}>
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
                    fontSize: 36,
                    color: "var(--grim-gold)",
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}>
                    {selectedLocation.name}
                  </div>
                  {selectedLocation.pronunciation && (
                    <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-4)", letterSpacing: ".12em" }}>
                      {selectedLocation.pronunciation}
                    </div>
                  )}
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
                          <div className="grim-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--grim-ink-4)", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--grim-ink-2)" }}>
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
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--grim-ink-4)", marginBottom: 16, lineHeight: 1 }}>✠</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>
                No location selected
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)", maxWidth: 280 }}>
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
          onCancel={() => setConfirmState(null)}
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

      <div className="grim-mono" style={{ fontSize: 10, color: "var(--grim-ink-4)", marginTop: 8, letterSpacing: ".08em" }}>
        Drag the rectangle to reposition. Drag the corner handle to resize.
      </div>
    </div>
  );
}
