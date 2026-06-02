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
    <div
      role="alert"
      style={{
        background: "oklch(0.18 0.08 22 / 0.65)",
        border: "1px solid var(--grim-blood-2)",
        padding: "12px 14px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grim-blood-2)" }}>
          Error
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={handleCopy}
            className="grim-btn is-ghost"
            style={{ fontSize: 10, padding: "2px 8px" }}
            aria-label="Copy error"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="grim-btn is-ghost"
              style={{ fontSize: 10, padding: "2px 8px" }}
              aria-label="Dismiss error"
            >
              Dismiss ✕
            </button>
          )}
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "oklch(0.85 0.08 30)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          userSelect: "all",
          lineHeight: 1.5,
        }}
      >
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
