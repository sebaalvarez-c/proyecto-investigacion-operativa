import { describe, expect, it, vi } from 'vitest';
import { ensureAuthenticatedSession } from './supabase';

describe('Supabase demo session', () => {
  it('creates an anonymous session when no session exists', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), signInAnonymously } };

    await ensureAuthenticatedSession(client);

    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
