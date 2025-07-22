"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  selectedLocationId,
}: InteractiveImageProps) {
  const [hoveredArea, setHoveredArea] = useState<Location | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageRect, setImageRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track image position for portal positioning
  useEffect(() => {
    const updateImageRect = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setImageRect(rect);
      }
    };

    updateImageRect();

    // Update position when selected location changes (sidebar opens/closes)
    const timeoutId = setTimeout(updateImageRect, 100);

    // Set up observers and listeners
    const resizeObserver = new ResizeObserver(updateImageRect);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateImageRect);
    window.addEventListener("scroll", updateImageRect);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateImageRect);
      window.removeEventListener("scroll", updateImageRect);
    };
  }, [selectedLocationId]); // Recalculate when selection changes

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
    <>
      <div
        ref={containerRef}
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
                    ? "rgba(34, 197, 94, 0.25)" // Green for selected
                    : isHovered
                    ? "rgba(59, 130, 246, 0.2)" // Blue for hovered
                    : "transparent",
                  border: isSelected
                    ? "3px solid rgba(34, 197, 94, 0.8)" // Thicker green border for selected
                    : isHovered
                    ? "2px solid rgba(59, 130, 246, 0.6)" // Blue border for hovered
                    : "2px solid transparent",
                  borderRadius: "4px",
                  transition: "all 0.3s ease",
                  boxShadow: isSelected
                    ? "0 0 15px rgba(34, 197, 94, 0.5)" // Glowing effect for selected
                    : "none",
                }}
              />
            );
          })}

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

      {/* Selected location indicators - rendered via portal to document body */}
      {typeof window !== "undefined" &&
        imageRect &&
        locations
          .filter(
            (area) =>
              area.x &&
              area.y &&
              area.width &&
              area.height &&
              selectedLocationId === area.id
          )
          .map((area) => {
            const centerX =
              imageRect.left +
              (imageRect.width * ((area.x || 0) + (area.width || 0) / 2)) / 100;
            const centerY =
              imageRect.top +
              (imageRect.height * ((area.y || 0) + (area.height || 0) / 2)) /
                100;

            return createPortal(
              <div
                key={`indicator-${area.id}`}
                className="selected-location-indicator"
                style={{
                  position: "fixed",
                  left: centerX,
                  top: centerY,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: "rgba(34, 197, 94, 0.95)",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                  zIndex: 999999,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  animation: "pulse 2s infinite",
                  border: "2px solid rgba(255, 255, 255, 0.8)",
                }}
              >
                {/* Pin icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {area.name}
              </div>,
              document.body
            );
          })}
    </>
  );
}
