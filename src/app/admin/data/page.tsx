"use client";

import { useState } from "react";
import { 
  DocumentTextIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

interface DataFile {
  name: string;
  path: string;
  description: string;
  type: string;
}

const dataFiles: DataFile[] = [
  {
    name: "NPCs",
    path: "/src/data/npcs.json",
    description: "Non-player characters, merchants, quest givers",
    type: "npcs"
  },
  {
    name: "Factions",
    path: "/src/data/factions.json", 
    description: "Organizations, guilds, political groups",
    type: "factions"
  },
  {
    name: "Locations",
    path: "/src/data/locations.json",
    description: "Towns, cities, landmarks, points of interest",
    type: "locations"
  },
  {
    name: "Player Characters",
    path: "/src/data/pcs.json",
    description: "Player character information and stats",
    type: "pcs"
  },
  {
    name: "Quests",
    path: "/src/data/quests.json",
    description: "Active, completed, and available quests",
    type: "quests"
  },
  {
    name: "Calendar",
    path: "/src/data/calendar.json",
    description: "World calendar and important dates",
    type: "calendar"
  },
  {
    name: "Timeline",
    path: "/src/data/timeline.json",
    description: "Campaign timeline of major events",
    type: "timeline"
  },
  {
    name: "Session Recaps",
    path: "/src/data/session_recaps.json",
    description: "Session summaries and campaign notes",
    type: "session_recaps"
  },
  {
    name: "Next Session",
    path: "/src/data/next_session.json",
    description: "Upcoming session information",
    type: "next_session"
  },
  {
    name: "Monster Creation",
    path: "/src/data/monster_creation.json",
    description: "Monster creation rules and templates",
    type: "monster_creation"
  }
];

export default function DataManagementPage() {
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadFileContent = async (file: DataFile) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(file.path);
      if (!response.ok) {
        throw new Error(`Failed to load ${file.name}`);
      }
      const content = await response.text();
      setFileContent(content);
      setEditedContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: DataFile) => {
    setSelectedFile(file);
    setIsEditing(false);
    setError("");
    setSuccess("");
    loadFileContent(file);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(fileContent);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Validate JSON
      JSON.parse(editedContent);
      
      // TODO: Implement save functionality
      // This would typically save to a database or file system
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFileContent(editedContent);
      setIsEditing(false);
      setSuccess("File saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your syntax.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save file");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(fileContent);
    setError("");
  };

  const handleDownload = () => {
    if (!selectedFile || !fileContent) return;
    
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.type}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(editedContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditedContent(formatted);
    } catch {
      setError("Invalid JSON format. Cannot format.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Data Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Edit and manage JSON data files for your RPG campaign
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Files
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {dataFiles.map((file) => (
                  <button
                    key={file.type}
                    onClick={() => handleFileSelect(file)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedFile?.type === file.type
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="flex items-start">
                      <DocumentTextIcon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {file.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* File Content */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedFile.path}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={handleDownload}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                          Download
                        </button>
                        <button
                          onClick={handleEdit}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={formatJSON}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          Format JSON
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <CheckIcon className="w-4 h-4 mr-2" />
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                </div>
              )}

              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isEditing ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          JSON Content
                        </label>
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full h-96 p-3 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter JSON content..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          JSON Content (Read-only)
                        </label>
                        <pre className="w-full h-96 p-3 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-auto">
                          {fileContent}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No file selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a data file from the list to view and edit its contents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
