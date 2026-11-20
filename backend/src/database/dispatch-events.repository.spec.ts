import { describe, expect, it } from 'vitest';
import { DispatchEventRepository } from './in-memory.repositories.js';
import { InMemoryStore } from './in-memory-store.js';

describe('DispatchEventRepository', () => {
  it('keeps an ordered audit trail for an emergency', () => {
    const repository = new DispatchEventRepository(new InMemoryStore());

    repository.append('emergency-1', 'CREATED', { source: 'web' });
    repository.append('emergency-1', 'ASSIGNED', { ambulanceId: 'a1' });

    expect(repository.list('emergency-1')).toHaveLength(2);
    expect(repository.list('emergency-1')[1]).toMatchObject({ eventType: 'ASSIGNED', payload: { ambulanceId: 'a1' } });
  });
});
