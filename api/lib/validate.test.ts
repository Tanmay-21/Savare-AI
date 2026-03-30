import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseBody, ApiError } from './validate';

describe('parseBody', () => {
  const Schema = z.object({ name: z.string().min(1), count: z.number().int().positive() });

  it('returns parsed data for valid input', () => {
    const result = parseBody(Schema, { name: 'test', count: 5 });
    expect(result).toEqual({ name: 'test', count: 5 });
  });

  it('throws ApiError with 400 status for invalid input', () => {
    expect(() => parseBody(Schema, { name: '', count: -1 })).toThrow(ApiError);
    try {
      parseBody(Schema, { name: '', count: -1 });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
    }
  });

  it('throws ApiError for missing required fields', () => {
    expect(() => parseBody(Schema, {})).toThrow(ApiError);
  });
});

describe('ApiError', () => {
  it('stores status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err).toBeInstanceOf(Error);
  });
});
