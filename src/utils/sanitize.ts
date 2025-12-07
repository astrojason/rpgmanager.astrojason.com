/**
 * Normalize text values coming from the database or APIs.
 * Treat null/undefined/empty/"null"/"undefined" as missing.
 */
export function sanitizeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (!str) return fallback;
  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return fallback;
  return str;
}

export function sanitizeOptionalText(value: unknown): string | undefined {
  const cleaned = sanitizeText(value, '');
  return cleaned === '' ? undefined : cleaned;
}

/**
 * Ensure image src strings are usable; return undefined when missing or invalid.
 */
export function safeImageSrc(value: unknown): string | undefined {
  const cleaned = sanitizeOptionalText(value);
  if (!cleaned) return undefined;
  if (cleaned.startsWith('/')) return cleaned;
  // Allow relative asset paths without scheme (e.g., "img.png")
  if (/^[\w.-]+(?:\/[\w.-]+)*\.(?:png|jpg|jpeg|gif|webp|svg)$/i.test(cleaned)) {
    return cleaned;
  }
  try {
    // Will throw for invalid URLs (e.g. "null")
    new URL(cleaned);
    return cleaned;
  } catch {
    return undefined;
  }
}
