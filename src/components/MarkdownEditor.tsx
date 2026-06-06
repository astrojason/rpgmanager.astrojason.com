import React, { useState, useRef } from 'react';
import { renderMarkdownWithLinks } from '@/utils/markdown';
import { EyeIcon, PencilIcon, LinkIcon } from '@heroicons/react/24/outline';
import EntityLinkPicker, { type LinkEntity } from '@/components/EntityLinkPicker';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  linkEntities?: LinkEntity[];
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content...",
  rows = 8,
  className = "",
  label = "Notes",
  linkEntities,
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const handleLinkButtonClick = () => {
    const ta = textareaRef.current;
    if (ta) {
      savedSelectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
    }
    setShowLinkPicker(true);
  };

  const handleEntitySelect = (entity: LinkEntity) => {
    const sel = savedSelectionRef.current;
    const start = sel?.start ?? value.length;
    const end = sel?.end ?? value.length;
    const selectedText = value.slice(start, end);
    const displayText = selectedText || entity.name;
    const link = `[${displayText}](${entity.url})`;
    const newValue = value.slice(0, start) + link + value.slice(end);
    onChange(newValue);
    setShowLinkPicker(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + link.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-t-md">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Supports Markdown formatting
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {linkEntities && linkEntities.length > 0 && !isPreview && (
            <button
              type="button"
              onClick={handleLinkButtonClick}
              title="Link entity"
              className="px-2 py-1 text-xs rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <LinkIcon className="w-3 h-3 mr-1 inline" />
              Link
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-2 py-1 text-xs rounded ${
              !isPreview
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <PencilIcon className="w-3 h-3 mr-1 inline" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-2 py-1 text-xs rounded ${
              isPreview
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <EyeIcon className="w-3 h-3 mr-1 inline" />
            Preview
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {isPreview ? (
          <div className="p-3" style={{ minHeight: rows * 24 }}>
            {value.trim() ? (
              <div className="prose dark:prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLinks(value, true) }} />
            ) : (
              <div className="text-gray-500 dark:text-gray-400 italic">No content to preview</div>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full p-3 bg-transparent text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
            placeholder={placeholder}
          />
        )}
      </div>

      {/* Help Text */}
      {!isPreview && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-b-md">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Markdown Tips:</strong> **bold**, *italic*, `code`, [links](url), - lists, {'>'}quotes, ## headers
          </div>
        </div>
      )}

      {showLinkPicker && linkEntities && (
        <EntityLinkPicker
          entities={linkEntities}
          onSelect={handleEntitySelect}
          onClose={() => setShowLinkPicker(false)}
        />
      )}
    </div>
  );
}
