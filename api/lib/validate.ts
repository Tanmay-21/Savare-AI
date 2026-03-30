import { z, ZodSchema } from 'zod';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    console.error('Request validation failed:', JSON.stringify(result.error.flatten()));
    throw new ApiError(400, 'Invalid request body');
  }
  return result.data;
}
