import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from './MarkdownEditor';
import { QuestNote } from '@/types/interfaces';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface QuestNotesEditorProps {
  notes: QuestNote[];
  onChange: (notes: QuestNote[]) => void;
  className?: string;
  currentUser?: string;
}

export default function QuestNotesEditor({ 
  notes, 
  onChange, 
  className = "",
  currentUser = "Admin"
}: QuestNotesEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingContent(notes[index].content);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const updatedNotes = [...notes];
      updatedNotes[editingIndex] = {
        ...updatedNotes[editingIndex],
        content: editingContent,
        timestamp: new Date().toISOString(),
        author: currentUser
      };
      onChange(updatedNotes);
      setEditingIndex(null);
      setEditingContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingContent("");
  };

  const handleDeleteNote = (index: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notes.filter((_, i) => i !== index);
      onChange(updatedNotes);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      const newQuestNote: QuestNote = {
        id: `note-${Date.now()}`,
        content: newNote.trim(),
        timestamp: new Date().toISOString(),
        author: currentUser
      };
      onChange([...notes, newQuestNote]);
      setNewNote("");
      setIsAddingNote(false);
    }
  };

  const cancelAdd = () => {
    setNewNote("");
    setIsAddingNote(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Quest Notes
        </label>
        <button
          type="button"
          onClick={() => setIsAddingNote(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Note
        </button>
      </div>

      {/* Existing Notes */}
      <div className="space-y-3">
        {notes.map((note, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note #{index + 1}
                </span>
                <div className="flex space-x-1">
                  {editingIndex === index ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                        title="Save"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Cancel"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(index)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(index)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {editingIndex === index ? (
                <MarkdownEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  placeholder="Edit your note using Markdown..."
                  rows={6}
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none prose-sm mb-2">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              )}
              {!editingIndex && note.timestamp && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span>{new Date(note.timestamp).toLocaleString()}</span>
                  <span>{note.author}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Note Section */}
      {isAddingNote && (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                New Note
              </span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                  title="Add Note"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelAdd}
                  className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Cancel"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <MarkdownEditor
              value={newNote}
              onChange={setNewNote}
              placeholder="Enter your new note using Markdown..."
              rows={6}
            />
          </div>
        </div>
      )}

      {notes.length === 0 && !isAddingNote && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No notes yet. Click &ldquo;Add Note&rdquo; to create your first quest note.</p>
        </div>
      )}
    </div>
  );
}
