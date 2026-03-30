import { apiFetch } from '../lib/api';

export async function getNextId(type: 'order' | 'trip'): Promise<string> {
  const { id } = await apiFetch('/api/counters/next', {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
  return id;
}
