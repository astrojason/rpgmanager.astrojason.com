"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Location, InteractiveImageProps } from "@/types/interfaces";
import { renderMarkdown } from "@/utils/markdown";

export default function InteractiveImage({
  src,
  alt,
  locations,
  width,
  height,
  sizes = "(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px",
  className = "",
  onAreaClick,
  selectedLocationId,
}: InteractiveImageProps) {
  const [hoveredArea, setHoveredArea] = useState<Location | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const parseMarkdown = (markdown: string) => renderMarkdown(markdown);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleAreaClick = (area: Location) => {
    if (onAreaClick) {
      onAreaClick(area);
    } else {
      console.warn(`InteractiveImage: no onAreaClick handler provided for area "${area.name}"`);
    }
  };

  const selectedArea = locations.find(
    (l) => l.id === selectedLocationId && l.x != null && l.y != null && l.width && l.height
  );

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseMove={handleMouseMove}
      id="interactive-image-container"
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className="max-w-full h-auto"
        priority
      />

      {/* Clickable areas */}
      {locations
        .filter((area) => area.x && area.y && area.width && area.height)
        .map((area) => {
          const isSelected = selectedLocationId === area.id;
          const isHovered = hoveredArea?.id === area.id;

          return (
            <div
              key={area.id}
              onClick={() => handleAreaClick(area)}
              onMouseEnter={() => setHoveredArea(area)}
              onMouseLeave={() => setHoveredArea(null)}
              style={{
                position: "absolute",
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.width}%`,
                height: `${area.height}%`,
                cursor: "pointer",
                backgroundColor: isSelected
                  ? "rgba(34, 197, 94, 0.25)"
                  : isHovered
                  ? "rgba(59, 130, 246, 0.2)"
                  : "transparent",
                border: isSelected
                  ? "3px solid rgba(34, 197, 94, 0.8)"
                  : isHovered
                  ? "2px solid rgba(59, 130, 246, 0.6)"
                  : "2px solid transparent",
                borderRadius: "4px",
                transition: "all 0.3s ease",
                boxShadow: isSelected ? "0 0 15px rgba(34, 197, 94, 0.5)" : "none",
              }}
            />
          );
        })}

      {/* Selected location chip — absolutely positioned so it scrolls with the map */}
      {selectedArea && (
        <div
          style={{
            position: "absolute",
            left: `${(selectedArea.x || 0) + (selectedArea.width || 0) / 2}%`,
            top: `${selectedArea.y || 0}%`,
            transform: "translate(-50%, calc(-100% - 6px))",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "rgba(34, 197, 94, 0.95)",
            padding: "5px 11px",
            borderRadius: "20px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
            zIndex: 10,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            border: "2px solid rgba(255, 255, 255, 0.8)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {selectedArea.name}
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredArea && (
        <div
          style={{
            position: "absolute",
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            pointerEvents: "none",
            zIndex: 1000,
            maxWidth: "300px",
            whiteSpace: "normal",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{hoveredArea.name}</div>
          <div
            style={{ fontSize: "12px", opacity: 0.9, lineHeight: "1.4" }}
            className="tooltip-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(hoveredArea.teaser) }}
          />
        </div>
      )}
    </div>
  );
}
