import { ApiError } from './apiError';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This record already exists.',
  500: 'Something went wrong on the server. Please try again.',
};

export function parseApiError(err: unknown): string {
  if (err instanceof ApiError) {
    return STATUS_MESSAGES[err.status] ?? 'Something went wrong. Please try again.';
  }

  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'The request timed out. Please try again.';
  }

  if (err instanceof TypeError) {
    return 'Unable to connect. Please check your internet connection.';
  }

  return 'Something went wrong. Please try again.';
}
