"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { marked } from "marked";
import { Location, InteractiveImageProps } from "@/types/interfaces";

export default function InteractiveImage({
  src,
  alt,
  locations,
  width,
  height,
  sizes = "(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px",
  className = "",
  onAreaClick,
}: InteractiveImageProps) {
  const [hoveredArea, setHoveredArea] = useState<Location | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Configure marked for safe rendering
  const parseMarkdown = useMemo(() => {
    return (markdown: string) => {
      try {
        return marked.parse(markdown, {
          breaks: true,
          gfm: true,
        });
      } catch (error) {
        console.warn("Failed to parse markdown:", error);
        return markdown; // Fallback to plain text
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleAreaClick = (area: Location) => {
    if (onAreaClick) {
      onAreaClick(area);
    } else {
      // Fallback alert if no onAreaClick handler is provided
      alert(`Clicked on ${area.name}: ${area.teaser}`);
    }
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseMove={handleMouseMove}
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
        .map((area) => (
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
              backgroundColor:
                hoveredArea?.id === area.id
                  ? "rgba(59, 130, 246, 0.2)"
                  : "transparent",
              border:
                hoveredArea?.id === area.id
                  ? "2px solid rgba(59, 130, 246, 0.6)"
                  : "2px solid transparent",
              borderRadius: "4px",
              transition: "all 0.3s ease",
            }}
          />
        ))}

      {/* Tooltip */}
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
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {hoveredArea.name}
          </div>
          <div
            style={{
              fontSize: "12px",
              opacity: 0.9,
              lineHeight: "1.4",
            }}
            className="tooltip-content"
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(hoveredArea.teaser),
            }}
          />
        </div>
      )}
    </div>
  );
}
