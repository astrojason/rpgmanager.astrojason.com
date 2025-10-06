export const mockDb = globalThis.__mockDb;
export const ensureSchemaMock = globalThis.__ensureSchemaMock;

export function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? null),
  });
}

export function requestWithQuery(url: string) {
  return new Request(url);
}
