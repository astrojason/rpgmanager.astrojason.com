/**
 * Throws an Error carrying the context, HTTP status and response body when the
 * response is not ok, so callers can surface the full detail in the UI.
 */
export async function assertOk(res: Response, context: string): Promise<void> {
  if (res.ok) return;
  let body = "";
  let readFailure = "";
  try {
    body = (await res.text()).trim();
  } catch (e) {
    readFailure = ` (could not read response body: ${e instanceof Error ? e.message : String(e)})`;
  }
  const status = [res.status, res.statusText].filter(Boolean).join(" ");
  throw new Error(`${context} failed (${status})${body ? `: ${body}` : ""}${readFailure}`);
}
