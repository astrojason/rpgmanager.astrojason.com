import { describe, expect, it } from 'vitest';
import { assertOk } from '@/utils/httpError';

const res = (ok: boolean, status: number, body: string, statusText = '') =>
  ({ ok, status, statusText, text: async () => body }) as unknown as Response;

describe('assertOk', () => {
  it('resolves when the response is ok', async () => {
    await expect(assertOk(res(true, 200, ''), 'Create NPC')).resolves.toBeUndefined();
  });

  it('throws with context, status and body when not ok', async () => {
    await expect(assertOk(res(false, 500, '{"error":"boom"}', 'Server Error'), 'Create NPC'))
      .rejects.toThrow('Create NPC failed (500 Server Error): {"error":"boom"}');
  });

  it('still throws with context and status when the body is empty', async () => {
    await expect(assertOk(res(false, 403, ''), 'Create item'))
      .rejects.toThrow('Create item failed (403)');
  });

  it('still throws when reading the body fails', async () => {
    const bad = { ok: false, status: 502, statusText: '', text: async () => { throw new Error('stream closed'); } } as unknown as Response;
    await expect(assertOk(bad, 'Create quest')).rejects.toThrow(/Create quest failed \(502\).*stream closed/);
  });
});
