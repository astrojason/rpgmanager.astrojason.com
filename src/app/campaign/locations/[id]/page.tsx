"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsAdmin } from "@/utils/adminCheck";
import { useIsDM } from "@/utils/role";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { Location } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

export default function LocationDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isAdmin = useIsAdmin();
  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const response = await authFetch("/api/data/locations");
        if (!response.ok) throw new Error("Failed to load locations");
        const data: Location[] = await response.json();

        let found: Location | undefined;

        // Check top-level location rows first
        found = data.find((loc) => String(loc.id) === id);

        // Then check sublocations embedded as JSON in each row
        if (!found) {
          for (const parent of data) {
            if (parent.locations) {
              found = parent.locations.find((sub) => String(sub.id) === id);
              if (found) break;
            }
          }
        }

        if (!found) {
          setNotFound(true);
        } else {
          setLocation(found);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadLocation();
  }, [id]);

  const parseMarkdown = useMemo(
    () => (markdown: string) => renderMarkdownWithLinks(markdown, isAdmin),
    [isAdmin]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading location...</span>
        </div>
      </div>
    );
  }

  if (notFound || !location) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push("/campaign/locations")}
          className="mb-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
        >
          ← Back to Locations
        </button>
        <p className="text-gray-500 dark:text-gray-400">Location not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-900">
      <button
        onClick={() => router.push("/campaign/locations")}
        className="mb-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
      >
        ← Back to Locations
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{location.name}</h1>
        {location.pronunciation && (
          <p className="text-gray-500 dark:text-gray-400 italic mb-6">{location.pronunciation}</p>
        )}

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(location.detail) }} />

          {isDM && location.gm_notes && (
            <div className="mt-8 p-4 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">GM Notes</h3>
              <div dangerouslySetInnerHTML={{ __html: parseMarkdown(location.gm_notes) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
