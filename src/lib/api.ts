import { supabase } from '../supabase';

/** Convert a snake_case string to camelCase */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Recursively convert all object keys from snake_case to camelCase */
function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        keysToCamel(v),
      ])
    );
  }
  return obj;
}

/** Convert camelCase keys to snake_case for request bodies */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function keysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        camelToSnake(k),
        keysToSnake(v),
      ])
    );
  }
  return obj;
}

export async function apiFetch<T = any>(path: string, options?: RequestInit & { skipCaseTransform?: boolean }): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  // Auto-convert camelCase body to snake_case
  let body = options?.body;
  if (body && typeof body === 'string' && !options?.skipCaseTransform) {
    try {
      body = JSON.stringify(keysToSnake(JSON.parse(body)));
    } catch {
      // leave body unchanged if not valid JSON
    }
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return (options?.skipCaseTransform ? json : keysToCamel(json)) as T;
}
