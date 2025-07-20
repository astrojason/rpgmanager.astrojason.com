"use client";

import { useState } from "react";
import Image from "next/image";
import { ClickableArea } from "@/components/InteractiveImage";

interface AdminArea extends ClickableArea {
  isEditing?: boolean;
}

export default function AdminPage() {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentArea, setCurrentArea] = useState<Partial<AdminArea> | null>(
    null
  );
  const [editingArea, setEditingArea] = useState<AdminArea | null>(null);
  const [showExportCode, setShowExportCode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if holding space for panning
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      // Middle mouse or Ctrl/Cmd key
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x =
      ((e.clientX - rect.left - panOffset.x) / (rect.width * zoomLevel)) * 100;
    const y =
      ((e.clientY - rect.top - panOffset.y) / (rect.height * zoomLevel)) * 100;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentArea({
      id: `area-${Date.now()}`,
      name: "",
      x,
      y,
      width: 0,
      height: 0,
      description: "",
      link: "",
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing || !currentArea) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentX =
      ((e.clientX - rect.left - panOffset.x) / (rect.width * zoomLevel)) * 100;
    const currentY =
      ((e.clientY - rect.top - panOffset.y) / (rect.height * zoomLevel)) * 100;

    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);

    setCurrentArea({
      ...currentArea,
      x,
      y,
      width,
      height,
    });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (
      !isDrawing ||
      !currentArea ||
      currentArea.width === 0 ||
      currentArea.height === 0
    ) {
      setIsDrawing(false);
      setCurrentArea(null);
      return;
    }

    setIsDrawing(false);
    setEditingArea({ ...currentArea, isEditing: true } as AdminArea);
    setCurrentArea(null);
  };

  const saveArea = () => {
    if (!editingArea) return;

    const newArea = { ...editingArea, isEditing: false };
    setAreas([...areas, newArea]);
    setEditingArea(null);
  };

  const cancelEdit = () => {
    setEditingArea(null);
  };

  const deleteArea = (id: string) => {
    setAreas(areas.filter((area) => area.id !== id));
  };

  const toggleExportCode = () => {
    setShowExportCode(!showExportCode);
  };

  const getExportCode = () => {
    const exportData = areas.map((area) => ({
      id: area.id,
      name: area.name,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      description: area.description,
      link: area.link,
    }));
    return JSON.stringify(exportData, null, 2);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel((prev) => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center">
            Clickable Areas Admin
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Click and drag on the image to create clickable areas
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Area */}
          <div className="lg:col-span-2">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {/* Zoom Controls */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Zoom Out
                  </button>
                  <span className="px-3 py-1 bg-gray-100 rounded">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Zoom In
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reset
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Hold Ctrl/Cmd and click to pan • Scroll to zoom
                </div>
              </div>

              <div
                className="overflow-hidden border rounded"
                style={{ maxHeight: "70vh" }}
                onWheel={handleWheel}
              >
                <div
                  className={`relative inline-block ${
                    isPanning ? "cursor-grab" : "cursor-crosshair"
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    transform: `scale(${zoomLevel}) translate(${
                      panOffset.x / zoomLevel
                    }px, ${panOffset.y / zoomLevel}px)`,
                    transformOrigin: "0 0",
                  }}
                >
                  <Image
                    src="/images/azorians_bounty.jpg"
                    alt="Azorian's Bounty - Admin View"
                    width={1024}
                    height={768}
                    className="max-w-full h-auto"
                    priority
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />

                  {/* Existing Areas */}
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      style={{
                        position: "absolute",
                        left: `${area.x}%`,
                        top: `${area.y}%`,
                        width: `${area.width}%`,
                        height: `${area.height}%`,
                        backgroundColor: "rgba(59, 130, 246, 0.3)",
                        border: "2px solid rgba(59, 130, 246, 0.8)",
                        borderRadius: "4px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Could add edit functionality here
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        {area.name || "Unnamed"}
                      </div>
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteArea(area.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Current Drawing Area */}
                  {currentArea && currentArea.width && currentArea.height && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${currentArea.x}%`,
                        top: `${currentArea.y}%`,
                        width: `${currentArea.width}%`,
                        height: `${currentArea.height}%`,
                        backgroundColor: "rgba(34, 197, 94, 0.3)",
                        border: "2px solid rgba(34, 197, 94, 0.8)",
                        borderRadius: "4px",
                      }}
                    />
                  )}

                  {/* Editing Area Overlay */}
                  {editingArea && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${editingArea.x}%`,
                        top: `${editingArea.y}%`,
                        width: `${editingArea.width}%`,
                        height: `${editingArea.height}%`,
                        backgroundColor: "rgba(234, 179, 8, 0.3)",
                        border: "2px solid rgba(234, 179, 8, 0.8)",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Edit Form */}
            {editingArea && (
              <div className="p-6 border rounded-lg shadow-lg">
                <h3 className="text-lg font-bold mb-4">Edit Clickable Area</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingArea.name}
                      onChange={(e) =>
                        setEditingArea({ ...editingArea, name: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Enter area title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      value={editingArea.description}
                      onChange={(e) =>
                        setEditingArea({
                          ...editingArea,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded h-20"
                      placeholder="Enter description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Link
                    </label>
                    <input
                      type="text"
                      value={editingArea.link}
                      onChange={(e) =>
                        setEditingArea({ ...editingArea, link: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="/path/to/page"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveArea}
                      className="flex-1 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Save Area
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Areas List */}
            <div className="p-6 border rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Areas ({areas.length})</h3>
                <button
                  onClick={toggleExportCode}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  disabled={areas.length === 0}
                >
                  {showExportCode ? "Hide Code" : "Show Code"}
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {areas.map((area) => (
                  <div key={area.id} className="p-3 rounded border">
                    <div className="font-medium">{area.name || "Unnamed"}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {area.description}
                    </div>
                    <div className="text-xs">
                      Position: {area.x.toFixed(1)}%, {area.y.toFixed(1)}%
                    </div>
                    <div className="text-xs">
                      Size: {area.width.toFixed(1)}% × {area.height.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Code */}
            {showExportCode && areas.length > 0 && (
              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-bold mb-4">Copyable Code</h3>
                <div className="space-y-4">
                  <div>
                    <textarea
                      readOnly
                      value={getExportCode()}
                      className="w-full p-3 border rounded font-mono text-sm h-64 resize-none"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      const textarea =
                        e.currentTarget.previousElementSibling?.querySelector(
                          "textarea"
                        ) as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.select();
                        navigator.clipboard.writeText(textarea.value);
                      }
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-bold text-blue-100 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Click and drag on the image to create areas</li>
                <li>• Fill in the title, description, and link</li>
                <li>• Click &quot;Save Area&quot; to add it to the list</li>
                <li>• Use the &quot;×&quot; button to delete areas</li>
                <li>• Click &quot;Show Code&quot; to get copyable code</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
