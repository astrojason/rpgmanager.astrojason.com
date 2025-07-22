"use client";

import { useState } from "react";
import InteractiveImage from "@/components/InteractiveImage";
import DetailSidebar from "@/components/DetailSidebar";
import { Location } from "@/types/interfaces";
import locationData from "@/data/locations.json";

export default function Home() {
  const [selectedArea, setSelectedArea] = useState<Location | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleAreaClick = (area: Location) => {
    setSelectedArea(area);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    // Small delay before clearing the selected area to allow for animation
    setTimeout(() => setSelectedArea(null), 300);
  };

  // Location data from JSON
  const locations: Location[] = locationData;

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
        className={`flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:pr-[calc(33.333333%+1rem)]" : ""
        }`}
      >
        <div
          className={`transition-transform duration-300 ${
            isSidebarOpen ? "md:scale-90" : "scale-100"
          }`}
        >
          <InteractiveImage
            src="/images/azorians_bounty.jpg"
            alt="Azorian's Bounty"
            width={2048}
            height={1536}
            locations={locations}
            onAreaClick={handleAreaClick}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px"
            className="max-w-full h-auto"
          />
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
