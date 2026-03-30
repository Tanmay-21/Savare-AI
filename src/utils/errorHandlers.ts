export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export async function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  // Log full context server-side only — do not include auth info in the thrown error
  console.error('API Error:', JSON.stringify({ error: message, operationType, path }));
  throw new Error(message);
}
