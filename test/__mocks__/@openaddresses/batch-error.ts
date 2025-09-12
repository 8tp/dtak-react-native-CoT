// Mock @openaddresses/batch-error module for Jest testing
export default class MockError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'MockError';
  }
}
