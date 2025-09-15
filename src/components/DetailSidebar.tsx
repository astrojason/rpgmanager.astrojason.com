"use client";

import { useState, useEffect } from "react";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Location } from "@/types/interfaces";

interface DetailSidebarProps {
  area: Location | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetailSidebar({
  area,
  isOpen,
  onClose,
}: DetailSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the component is mounted before animating
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const parseMarkdown = (markdown: string) => renderMarkdownWithLinks(markdown, isAdmin);

  if (!isOpen || !area) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-1/3 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {area.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full pb-24">
          {/* Detailed Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div
              className="sidebar-content"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(area.detail),
              }}
            />
            {isDM && (area as any).gm_notes && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">GM Notes</h3>
                <div
                  className="sidebar-content"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown((area as any).gm_notes || ''),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
