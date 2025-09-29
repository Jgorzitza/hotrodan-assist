import { faker } from '@faker-js/faker';

/**
 * Test helper utilities for common testing patterns
 */
export class TestHelpers {
  /**
   * Creates a mock function that returns predictable values
   */
  static createMockFunction<T>(returnValue: T) {
    return jest.fn().mockReturnValue(returnValue);
  }

  /**
   * Creates a mock function that returns a promise
   */
  static createAsyncMockFunction<T>(returnValue: T) {
    return jest.fn().mockResolvedValue(returnValue);
  }

  /**
   * Creates a mock function that throws an error
   */
  static createErrorMockFunction(error: Error) {
    return jest.fn().mockRejectedValue(error);
  }

  /**
   * Waits for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a mock date for consistent testing
   */
  static createMockDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
  }

  /**
   * Creates a mock UUID for testing
   */
  static createMockUUID(prefix: string = 'test'): string {
    return `${prefix}-${faker.string.uuid()}`;
  }

  /**
   * Creates a mock email address
   */
  static createMockEmail(domain: string = 'test.com'): string {
    return `${faker.person.firstName().toLowerCase()}@${domain}`;
  }

  /**
   * Creates a mock API response
   */
  static createMockApiResponse<T>(data: T, success: boolean = true) {
    return {
      success,
      data,
      message: success ? 'Success' : 'Error',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates a mock error response
   */
  static createMockErrorResponse(message: string, code?: string) {
    return {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resets all mocks
   */
  static resetAllMocks() {
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
      jest.resetAllMocks();
    }
  }

  /**
   * Sets up common test environment
   */
  static setupTestEnvironment() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
  }

  /**
   * Cleans up test environment
   */
  static cleanupTestEnvironment() {
    // Clear environment variables
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  }
}
