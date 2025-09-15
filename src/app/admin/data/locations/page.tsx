"use client";

import { useState, useEffect, useRef } from "react";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import Image from "next/image";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { Location } from "@/types/interfaces";
import MarkdownEditor from "@/components/MarkdownEditor";

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

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/locations.json');
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
      let idx = selectedLocation ? filteredLocations.findIndex(n => n.id === selectedLocation.id) : -1;
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
    try {
      if (!formData.name || !formData.teaser || !formData.detail) {
        setError("Please fill in all required fields");
        return;
      }

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
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete ${location.name}?`)) return;
    
    try {
      const updatedLocations = locations.filter(l => l.id !== location.id);
      setLocations(updatedLocations);
      setSelectedLocation(null);
      setSuccess("Location deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Location");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Locations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Locations Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage towns, cities, landmarks, and points of interest
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Location
        </button>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Locations ({filteredLocations.length})
              </h2>
              <input
                type="text"
                placeholder="Search Locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredLocations.map((location) => (
                  <div
                    key={location.id}
                    data-location-id={location.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedLocation?.id === location.id
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => handleView(location)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {location.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {location.teaser}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(location);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(location);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail/Edit Panel */}
        <div className="lg:col-span-2">
          {(isCreating || isEditing) ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCreating ? "Create New Location" : "Edit Location"}
                </h2>
              </div>
              <div className="p-6">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pronunciation
                    </label>
                    <input
                      type="text"
                      value={formData.pronunciation || ""}
                      onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., az-OR-ee-ahn"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Teaser *
                    </label>
                    <input
                      type="text"
                      value={formData.teaser || ""}
                      onChange={(e) => setFormData({ ...formData, teaser: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Brief description"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Detailed Description *
                    </label>
                    <MarkdownEditor
                      value={formData.detail || ""}
                      onChange={(value) => setFormData({ ...formData, detail: value })}
                      rows={6}
                      label="Details"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GM Notes</label>
                    <MarkdownEditor
                      value={(formData as any).gm_notes || ""}
                      onChange={(value) => setFormData({ ...formData, gm_notes: value as any })}
                      rows={4}
                      label="GM Notes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Map Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.mapImg || ""}
                      onChange={(e) => setFormData({ ...formData, mapImg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="https://example.com/map.jpg"
                    />
                  </div>

                  {/* Interactive Map Editor */}
                  {formData.mapImg && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Map Hover Area Editor</h3>
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        X Position (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.x || ""}
                        onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Y Position (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.y || ""}
                        onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Width (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.width || ""}
                        onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Height (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.height || ""}
                        onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {isCreating ? "Create Location" : "Update Location"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedLocation ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedLocation.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(selectedLocation)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedLocation)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {selectedLocation.pronunciation && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pronunciation</h3>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedLocation.pronunciation}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                    <div
                      className="mt-1 prose dark:prose-invert max-w-none prose-sm break-words"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.teaser || '', true) }}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Details</h3>
                    <div
                      className="mt-1 prose dark:prose-invert max-w-none prose-sm break-words"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(selectedLocation.detail || '', true) }}
                    />
                  </div>

                  {(selectedLocation.x !== undefined || selectedLocation.y !== undefined) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Map Position</h3>
                      <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="font-medium">X:</span> {selectedLocation.x?.toFixed(1)}%</div>
                        <div><span className="font-medium">Y:</span> {selectedLocation.y?.toFixed(1)}%</div>
                        <div><span className="font-medium">Width:</span> {selectedLocation.width?.toFixed(1)}%</div>
                        <div><span className="font-medium">Height:</span> {selectedLocation.height?.toFixed(1)}%</div>
                      </div>
                    </div>
                  )}

                  {selectedLocation.mapImg && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Map Image</h3>
                      <Image 
                        src={selectedLocation.mapImg} 
                        alt={selectedLocation.name}
                        width={400}
                        height={300}
                        className="max-w-md h-auto rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No location selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select a location from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
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
      className="relative w-full max-w-xl select-none"
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Map image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Map" className="w-full h-auto rounded" />

      {/* Hover area rect */}
      <div
        className="absolute border-2 border-blue-500/80 bg-blue-500/10 cursor-move"
        style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        {/* Resize handle */}
        <div
          className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-blue-600 rounded-sm cursor-se-resize"
          onMouseDown={(e) => onMouseDown(e, 'resize')}
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Drag the blue rectangle to reposition. Drag the corner to resize.
      </div>
    </div>
  );
}
