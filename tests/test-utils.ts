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

/** Builds a GET request carrying the test-only `x-test-role` header (see apiAuth.ts). */
export function requestAsRole(role: 'admin' | 'dm' | 'player', url = 'http://test/api') {
  return new Request(url, { headers: { 'x-test-role': role } });
}
