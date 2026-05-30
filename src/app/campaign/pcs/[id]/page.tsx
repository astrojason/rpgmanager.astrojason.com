"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTracking } from "@/utils/referrerTracking";
import { useIsDM } from "@/utils/role";
import Image from "next/image";
import { PC, Faction } from "@/types/interfaces";
import { renderMarkdownWithLinks } from "@/utils/markdown";
import { authFetch } from "@/utils/authFetch";
import { safeImageSrc } from "@/utils/sanitize";

export default function PCDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
  const router = useRouter();

  const [pc, setPc] = useState<PC | null>(null);
  const [factionData, setFactionData] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [fadeGif, setFadeGif] = useState(false);

  const isDM = useIsDM();

  usePageTracking();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pcsResponse, factionsResponse] = await Promise.all([
          authFetch("/api/data/pcs"),
          authFetch("/api/data/factions"),
        ]);
        const pcs = await pcsResponse.json();
        const factions = await factionsResponse.json();
        const found = pcs.find((p: PC) => String(p.id) === id);
        if (!found) {
          setNotFound(true);
        } else {
          setPc(found);
        }
        setFactionData(factions);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const selectedImage = safeImageSrc(pc?.image);
  const selectedGif = safeImageSrc(pc?.gif);
  const fallbackPcImage = "/public/images/pcs/magnolia.png";

  useEffect(() => {
    if (pc && selectedGif) {
      setShowGif(false);
      setFadeGif(false);
      const timer = setTimeout(() => {
        setShowGif(true);
        setTimeout(() => setFadeGif(true), 100);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowGif(false);
      setFadeGif(false);
    }
  }, [pc, selectedGif]);

  const getFactionName = (factionId: string) => {
    const faction = factionData.find((f) => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (notFound || !pc) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push("/campaign/pcs")}
          className="mb-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
        >
          ← Back to PCs
        </button>
        <p className="text-gray-500 dark:text-gray-400">Character not found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Full image modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity duration-300 ${showFullImage ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setShowFullImage(false)}
      >
        <div
          className={`relative max-w-3xl w-full transform transition-transform duration-300 ${showFullImage ? "scale-100" : "scale-90"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedImage ? (
            <div className="relative w-full h-full">
              <Image
                src={selectedImage ?? fallbackPcImage}
                alt={pc.name || pc.nickname || ""}
                width={900}
                height={600}
                style={{ objectFit: "contain" }}
                className={`rounded-lg shadow-2xl transition-opacity duration-[3000ms] ${showGif && fadeGif ? "opacity-0" : "opacity-100"} ${showFullImage ? "scale-100" : "scale-90"}`}
              />
              {showGif && selectedGif && (
                <Image
                  src={selectedGif}
                  alt={pc.name || pc.nickname || ""}
                  width={900}
                  height={600}
                  style={{ objectFit: "contain" }}
                  className={`rounded-lg shadow-2xl absolute top-0 left-0 w-full h-full transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"} ${showFullImage ? "scale-100" : "scale-90"}`}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-[600px] bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center text-5xl text-gray-500 dark:text-gray-400">?</div>
          )}
          <button
            className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded hover:bg-opacity-80"
            onClick={(e) => { e.stopPropagation(); setShowFullImage(false); }}
          >
            Close
          </button>
        </div>
      </div>

      <div className="h-full overflow-y-auto p-8 bg-white dark:bg-gray-800">
        <button
          onClick={() => router.push("/campaign/pcs")}
          className="mb-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
        >
          ← Back to PCs
        </button>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-96 mb-6">
              {selectedImage ? (
                <div className="relative w-full h-full">
                  <Image
                    src={selectedImage ?? fallbackPcImage}
                    alt={pc.name || pc.nickname || ""}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                    className={`rounded-lg transition-opacity duration-[3000ms] absolute top-0 left-0 w-full h-full ${showGif && fadeGif ? "opacity-0" : "opacity-100"}`}
                  />
                  {showGif && selectedGif && (
                    <Image
                      src={selectedGif}
                      alt={pc.name || pc.nickname || ""}
                      fill
                      unoptimized
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                      className={`rounded-lg absolute top-0 left-0 w-full h-full transition-all duration-[3000ms] ${fadeGif ? "opacity-100 blur-0 drop-shadow-[0_0_32px_rgba(0,212,255,0.7)]" : "opacity-0 blur-md"}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg" />
                  <button
                    type="button"
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 flex items-center justify-center"
                    onClick={() => setShowFullImage(true)}
                    aria-label="View full image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                  <div className="absolute bottom-4 left-4 text-white pointer-events-none">
                    <h1 className="text-4xl font-bold mb-1">
                      {pc.name}
                      {pc.nickname && <span className={`text-2xl font-normal opacity-75${pc.name ? " ml-2" : ""}`}>&ldquo;{pc.nickname}&rdquo;</span>}
                    </h1>
                    <p className="text-lg opacity-90">{pc.race} - {pc.class}</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-400 dark:from-blue-900 dark:to-blue-700 rounded-lg flex items-end relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg" />
                  <div className="absolute bottom-4 left-4 text-white pointer-events-none">
                    <h1 className="text-4xl font-bold mb-1">
                      {pc.name}
                      {pc.nickname && <span className={`text-2xl font-normal opacity-75${pc.name ? " ml-2" : ""}`}>&ldquo;{pc.nickname}&rdquo;</span>}
                    </h1>
                    <p className="text-lg opacity-90">{pc.race} - {pc.class}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Hometown:</span> {pc.hometown}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Status:</span>{" "}
                      <span className={`px-2 py-1 rounded-full text-xs ${pc.status === "Alive" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : pc.status === "Deceased" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {pc.status}
                      </span>
                    </p>
                    {pc.factions && pc.factions.length > 0 && (
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Factions:</span>
                        <div className="flex flex-row flex-wrap gap-2 mt-1">
                          {pc.factions.map((factionId: string) => (
                            <button
                              key={factionId}
                              className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 border border-blue-200 dark:border-blue-700"
                              onClick={() => router.push(`/campaign/factions?selected=${encodeURIComponent(factionId)}`)}
                            >
                              {getFactionName(factionId)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isDM && pc.gm_notes && (
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">GM Notes</h3>
                  <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(pc.gm_notes || "", true) }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
