export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly rawBody: string
  ) {
    super(rawBody);
    this.name = 'ApiError';
  }
}
