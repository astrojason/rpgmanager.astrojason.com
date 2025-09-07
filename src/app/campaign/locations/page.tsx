"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import { parseMarkdownWithLinks } from "@/utils/markdownLinking";
import { useIsAdmin } from "@/utils/adminCheck";
import { usePageTracking } from "@/utils/referrerTracking";
import InteractiveImage from "@/components/InteractiveImage";
import DetailSidebar from "@/components/DetailSidebar";
import { Location } from "@/types/interfaces";
import locationData from "@/data/locations.json";

export default function LocationsPage() {
  const [selectedArea, setSelectedArea] = useState<Location | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const searchParams = useSearchParams();
  
  // Track this page visit
  usePageTracking();

  // Location data from JSON
  const locations: Location[] = locationData;

  // Get the main location (Azorian's Bounty) and its sublocations
  const mainLocation = locations.length > 0 ? locations[0] : null;
  const sublocations = useMemo(() => mainLocation?.locations || [], [mainLocation]);

  // Auto-select location if query param or fragment exists in URL
  useEffect(() => {
    const selected = searchParams.get("selected");
    const fragment = window.location.hash.slice(1); // Remove the '#'
    
    if (selectedArea === null) {
      let location: Location | undefined;
      
      // First try to find by query param (ID)
      if (selected) {
        // Search in main location first
        if (mainLocation && mainLocation.id === selected) {
          location = mainLocation;
        }
        
        // Then search in sublocations
        if (!location) {
          location = sublocations.find((loc: Location) => loc.id === selected);
        }
      }
      
      // If no query param match, try to find by fragment (name-based for backwards compatibility)
      if (!location && fragment) {
        // Convert fragment back to original name format
        const searchName = decodeURIComponent(fragment).replace(/-/g, ' ').toLowerCase();
        
        // Search in main location first
        if (mainLocation && mainLocation.name.toLowerCase() === searchName) {
          location = mainLocation;
        }
        
        // Then search in sublocations
        if (!location) {
          location = sublocations.find((loc: Location) => 
            loc.name.toLowerCase() === searchName
          );
        }
      }
      
      if (location) {
        setSelectedArea(location);
        setIsSidebarOpen(true);
        // Update URL to use query param format for consistency
        const url = new URL(window.location.href);
        url.searchParams.set('selected', location.id);
        url.hash = ''; // Clear fragment
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, mainLocation, sublocations, selectedArea]);

  // Configure marked for safe rendering with link conversion
  const parseMarkdown = useMemo(() => {
    return (markdown: string) => {
      try {
        const parsedMarkdown = marked.parse(markdown, {
          breaks: true,
          gfm: true,
        });
        return parseMarkdownWithLinks(parsedMarkdown as string, isAdmin);
      } catch (error) {
        console.warn("Failed to parse markdown:", error);
        return markdown; // Fallback to plain text
      }
    };
  }, [isAdmin]);

  const handleAreaClick = (area: Location) => {
    setSelectedArea(area);
    setIsSidebarOpen(true);
    
    // Update URL query param to reflect selected area
    const url = new URL(window.location.href);
    url.searchParams.set('selected', area.id);
    url.hash = ''; // Clear any existing fragment
    window.history.replaceState({}, '', url.toString());
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    // Clear URL query param when closing sidebar
    const url = new URL(window.location.href);
    url.searchParams.delete('selected');
    url.hash = '';
    window.history.replaceState({}, '', url.toString());
    // Small delay before clearing the selected area to allow for animation
    setTimeout(() => setSelectedArea(null), 300);
  };
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <header className="p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Azorian&apos;s Bounty
          </h2>
        </div>
      </header>

      <main
        className={`flex-1 flex flex-col items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:pr-[calc(33.333333%+1rem)]" : ""
        }`}
      >
        <div
          className={`transition-transform duration-300 ${
            isSidebarOpen ? "md:scale-90" : "scale-100"
          }`}
        >
          <InteractiveImage
            src={mainLocation?.mapImg || "/images/maps/azorians_bounty.jpg"}
            alt="Azorian's Bounty"
            width={2048}
            height={1536}
            locations={sublocations}
            onAreaClick={handleAreaClick}
            selectedLocationId={selectedArea?.id || null}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px"
            className="max-w-full h-auto"
          />
        </div>

        {/* Sublocation List */}
        <div className="mt-8 w-full max-w-4xl">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Locations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sublocations.map((location) => (
              <div
                key={location.id}
                onClick={() => handleAreaClick(location)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
              >
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {location.name}
                </h4>
                <div
                  className="text-sm text-gray-600 dark:text-gray-300 overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(location.teaser),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>

      <DetailSidebar
        area={selectedArea}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
    </div>
  );
}
