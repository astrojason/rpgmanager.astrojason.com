"use client";

import { useState, useEffect } from "react";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";
import { CalendarData, CalendarEvent } from "@/types/interfaces";

export default function CalendarManagementPage() {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({});

  // Load calendar data
  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/calendar.json');
      if (!response.ok) throw new Error('Failed to load calendar');
      const data = await response.json();
      setCalendarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const events = calendarData?.events || [];
  const filteredEvents = events.filter(event => 
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedEvent(null);
    setFormData({
      id: `event-${Date.now()}`,
      name: "",
      description: "",
      date: { day: 1, month: 1, year: 1 },
      category: "",
      sort: { timestamp: Date.now(), order: "" }
    });
  };

  const handleEdit = (event: CalendarEvent) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedEvent(event);
    setFormData({ ...event });
  };

  const handleView = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.description) {
        setError("Please fill in all required fields (Name, Description)");
        return;
      }

      const eventData = formData as CalendarEvent;
      
      let updatedEvents;
      if (isCreating) {
        updatedEvents = [...events, eventData];
        setSuccess("Calendar event created successfully!");
      } else {
        updatedEvents = events.map(event => event.id === eventData.id ? eventData : event);
        setSuccess("Calendar event updated successfully!");
      }

      // Update calendar data
      const updatedCalendarData = {
        ...calendarData!,
        events: updatedEvents
      };
      setCalendarData(updatedCalendarData);
      
      setIsCreating(false);
      setIsEditing(false);
      setSelectedEvent(eventData);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendar event");
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) return;
    
    try {
      const updatedEvents = events.filter(e => e.id !== event.id);
      const updatedCalendarData = {
        ...calendarData!,
        events: updatedEvents
      };
      setCalendarData(updatedCalendarData);
      setSelectedEvent(null);
      setSuccess("Calendar event deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete calendar event");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Calendar Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage world calendar and events
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Event
        </button>
      </header>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No calendar events found
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleView(event)}>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.date.day}/{event.date.month}/{event.date.year}
                        </p>
                        {event.category && (
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            {event.category}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(event);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(event);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details/Edit Panel */}
        <div className="lg:col-span-2">
          {isCreating || isEditing ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isCreating ? "Create Event" : "Edit Event"}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.date?.day?.toString() || "1"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        date: { ...formData.date, day: parseInt(e.target.value) || 1 } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Month
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.date?.month?.toString() || "1"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        date: { ...formData.date, month: parseInt(e.target.value) || 1 } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.date?.year?.toString() || "1"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        date: { ...formData.date, year: parseInt(e.target.value) || 1 } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          ) : selectedEvent ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Event Details
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(selectedEvent)}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedEvent)}
                    className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Event Name</h3>
                  <p className="text-gray-900 dark:text-gray-100">{selectedEvent.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Date</h3>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedEvent.date.day}/{selectedEvent.date.month}/{selectedEvent.date.year}
                  </p>
                </div>

                {selectedEvent.category && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Category</h3>
                    <span className="inline-block px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {selectedEvent.category}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No event selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Select an event from the list to view details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
