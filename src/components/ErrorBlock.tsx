"use client";

import { useState } from "react";

interface ErrorBlockProps {
  error: string;
  onDismiss?: () => void;
}

export default function ErrorBlock({ error, onDismiss }: ErrorBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable; text is user-select:all so manual copy still works
    });
  };

  return (
    <div role="alert" className="bg-grim-error-bg border border-grim-blood-2 px-3.5 py-3 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-sm tracking-widest-2 uppercase text-grim-blood-2">
          Error
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="grim-btn is-ghost text-sm py-0.5 px-2"
            aria-label="Copy error"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="grim-btn is-ghost text-sm py-0.5 px-2"
              aria-label="Dismiss error"
            >
              Dismiss ✕
            </button>
          )}
        </div>
      </div>
      <pre className="m-0 font-mono text-base text-grim-error-text whitespace-pre-wrap break-words select-all leading-normal">
        {error}
      </pre>
    </div>
  );
}

export function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e, null, 2); } catch { return String(e); }
}
