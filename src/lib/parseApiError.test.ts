import { describe, it, expect } from 'vitest';
import { parseApiError } from './parseApiError';
import { ApiError } from './apiError';

describe('parseApiError', () => {
  it('returns generic message for unknown errors', () => {
    expect(parseApiError(new Error('SOMETHING_WEIRD'))).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('returns session expired message for 401 ApiError', () => {
    expect(parseApiError(new ApiError(401, 'Unauthorized'))).toBe(
      'Your session has expired. Please log in again.'
    );
  });

  it('returns not found message for 404 ApiError', () => {
    expect(parseApiError(new ApiError(404, 'Not found'))).toBe(
      'The requested resource was not found.'
    );
  });

  it('returns conflict message for 409 ApiError', () => {
    expect(parseApiError(new ApiError(409, 'Conflict'))).toBe(
      'This record already exists.'
    );
  });

  it('returns network message for TypeError (fetch failed)', () => {
    expect(parseApiError(new TypeError('Failed to fetch'))).toBe(
      'Unable to connect. Please check your internet connection.'
    );
  });

  it('returns server error message for 500 ApiError', () => {
    expect(parseApiError(new ApiError(500, 'INTERNAL_SERVER_ERROR'))).toBe(
      'Something went wrong on the server. Please try again.'
    );
  });

  it('returns validation message for 400 ApiError', () => {
    expect(parseApiError(new ApiError(400, 'Bad request'))).toBe(
      'Invalid request. Please check your input and try again.'
    );
  });

  it('returns forbidden message for 403 ApiError', () => {
    expect(parseApiError(new ApiError(403, 'Forbidden'))).toBe(
      'You do not have permission to perform this action.'
    );
  });

  it('handles non-Error objects gracefully', () => {
    expect(parseApiError('a string error')).toBe(
      'Something went wrong. Please try again.'
    );
    expect(parseApiError(null)).toBe(
      'Something went wrong. Please try again.'
    );
    expect(parseApiError(undefined)).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('handles network timeout/abort errors', () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    expect(parseApiError(err)).toBe(
      'The request timed out. Please try again.'
    );
  });

  it('returns generic message for unmapped status codes', () => {
    expect(parseApiError(new ApiError(429, 'Too Many Requests'))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
