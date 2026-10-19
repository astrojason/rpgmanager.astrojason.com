import { describe, expect, it } from 'vitest';
import { verifyRequestAuth } from '@/lib/apiAuth';

function req(headers: Record<string, string>) {
  return new Request('http://test/api', { headers });
}

describe('verifyRequestAuth view-as', () => {
  it('downgrades an admin to player when x-view-as is player', async () => {
    const res = await verifyRequestAuth(req({ 'x-test-role': 'admin', 'x-view-as': 'player' }));
    expect('user' in res && res.user?.role).toBe('player');
  });

  it('downgrades a dm to player when x-view-as is player', async () => {
    const res = await verifyRequestAuth(req({ 'x-test-role': 'dm', 'x-view-as': 'player' }));
    expect('user' in res && res.user?.role).toBe('player');
  });

  it('leaves the role alone without the header', async () => {
    const res = await verifyRequestAuth(req({ 'x-test-role': 'admin' }));
    expect('user' in res && res.user?.role).toBe('admin');
  });

  it('ignores unknown x-view-as values', async () => {
    const res = await verifyRequestAuth(req({ 'x-test-role': 'admin', 'x-view-as': 'admin' }));
    expect('user' in res && res.user?.role).toBe('admin');
  });
});
