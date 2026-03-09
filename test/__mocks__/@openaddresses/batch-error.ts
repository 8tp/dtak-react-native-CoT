// Mock @openaddresses/batch-error module for Jest testing
// Matches the real Err(status, originalError, message) constructor API
export default class Err extends Error {
  status: number;
  originalError: Error | null;

  constructor(status: number, originalError?: Error | null, message?: string) {
    super(message || `Error ${status}`);
    this.name = 'BatchError';
    this.status = status;
    this.originalError = originalError || null;
  }
}
