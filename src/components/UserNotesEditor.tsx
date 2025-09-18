import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from './MarkdownEditor';
import AuthorDisplay from './AuthorDisplay';
import { UserNote } from '@/types/interfaces';
import { User } from 'firebase/auth';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface UserNotesEditorProps {
  notes: UserNote[];
  onChange: (notes: UserNote[]) => void;
  className?: string;
  currentUser?: User | string | null;
  isAdmin?: boolean;
}

export default function UserNotesEditor({ 
  notes, 
  onChange, 
  className = "",
  currentUser,
  isAdmin = false,
}: UserNotesEditorProps) {
  const getUid = () => {
    if (!currentUser) return undefined;
    if (typeof currentUser === 'string') return currentUser;
    return currentUser.uid;
  };
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const canEdit = (note: UserNote) => {
    const uid = getUid();
    return !!uid && (isAdmin || uid === note.author);
  };

  const handleStartEdit = (index: number) => {
    const note = notes[index];
    if (!getUid() || !canEdit(note)) return;
    setEditingIndex(index);
    setEditingContent(note.content);
  };

  const handleSaveEdit = () => {
    const uid = getUid();
    if (editingIndex !== null && uid) {
      const note = notes[editingIndex];
      if (!canEdit(note)) return;
      const updatedNotes = [...notes];
      updatedNotes[editingIndex] = {
        ...updatedNotes[editingIndex],
        content: editingContent,
        timestamp: new Date().toISOString(),
        author: uid
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
    const note = notes[index];
    if (!getUid() || !canEdit(note)) return;
    if (confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notes.filter((_, i) => i !== index);
      onChange(updatedNotes);
    }
  };

  const handleAddNote = () => {
    const uid = getUid();
    if (newNote.trim() && uid) {
      const newUserNote: UserNote = {
        id: `note-${Date.now()}`,
        content: newNote.trim(),
        timestamp: new Date().toISOString(),
        author: uid
      };
      onChange([...notes, newUserNote]);
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
          Notes
        </label>
        <button
          type="button"
          onClick={() => currentUser && setIsAddingNote(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
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
                        className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
                  ) : canEdit(note) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(index)}
                        className="p-1 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(index)}
                        className="p-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {editingIndex === index ? (
                <MarkdownEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  placeholder="Edit Note"
                  rows={6}
                  label="Notes"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none prose-sm mb-2">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              )}
              {!editingIndex && note.timestamp && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span>{new Date(note.timestamp).toLocaleString()}</span>
                  <AuthorDisplay uid={note.author} useImpersonation={true} />
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
                  className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
              placeholder="Add Note"
              rows={6}
              label="Notes"
            />
          </div>
        </div>
      )}

      {notes.length === 0 && !isAddingNote && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No notes yet. Click &ldquo;Add Note&rdquo; to create your first note.</p>
        </div>
      )}
    </div>
  );
}
