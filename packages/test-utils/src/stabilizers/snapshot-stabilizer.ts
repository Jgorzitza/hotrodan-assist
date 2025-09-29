import { ApiResponse } from '@llama-rag/core';

export interface StabilizableObject {
  [key: string]: any;
}

export interface StabilizationOptions {
  excludeKeys?: string[];
  includeKeys?: string[];
  transformValues?: (key: string, value: any) => any;
  sortArrays?: boolean;
  sortObjects?: boolean;
}

export class SnapshotStabilizer {
  /**
   * Stabilizes an object for consistent snapshot testing
   * Removes or normalizes dynamic values like timestamps, IDs, and random data
   */
  static stabilize(obj: any, options: StabilizationOptions = {}): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return this.stabilizeArray(obj, options);
    }

    if (obj instanceof Date) {
      return '[Date]';
    }

    if (obj instanceof RegExp) {
      return '[RegExp]';
    }

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: '[Stack]'
      };
    }

    return this.stabilizeObject(obj, options);
  }

  private static stabilizeArray(arr: any[], options: StabilizationOptions): any[] {
    const stabilized = arr.map(item => this.stabilize(item, options));
    
    if (options.sortArrays) {
      return stabilized.sort();
    }
    
    return stabilized;
  }

  private static stabilizeObject(obj: StabilizableObject, options: StabilizationOptions): StabilizableObject {
    const result: StabilizableObject = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip excluded keys
      if (options.excludeKeys?.includes(key)) {
        continue;
      }
      
      // Only include specified keys if includeKeys is provided
      if (options.includeKeys && !options.includeKeys.includes(key)) {
        continue;
      }

      let stabilizedValue = this.stabilize(value, options);
      
      // Apply custom transformation
      if (options.transformValues) {
        stabilizedValue = options.transformValues(key, stabilizedValue);
      }
      
      result[key] = stabilizedValue;
    }

    // Sort object keys if requested
    if (options.sortObjects) {
      const sortedEntries = Object.entries(result).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(sortedEntries);
    }

    return result;
  }

  /**
   * Stabilizes API responses by removing dynamic fields
   */
  static stabilizeApiResponse<T>(response: ApiResponse<T>, options: StabilizationOptions = {}): ApiResponse<T> {
    const defaultOptions: StabilizationOptions = {
      excludeKeys: ['timestamp', 'requestId', 'correlationId', 'executionTime'],
      ...options
    };

    return this.stabilize(response, defaultOptions) as ApiResponse<T>;
  }

  /**
   * Stabilizes database records by normalizing IDs and timestamps
   */
  static stabilizeDatabaseRecord(record: any, options: StabilizationOptions = {}): any {
    const defaultOptions: StabilizationOptions = {
      transformValues: (key: string, value: any) => {
        // Normalize IDs
        if (key === 'id' || key.endsWith('Id')) {
          return '[ID]';
        }
        
        // Normalize timestamps
        if (key === 'createdAt' || key === 'updatedAt' || key === 'deletedAt') {
          return '[Timestamp]';
        }
        
        // Normalize UUIDs
        if (typeof value === 'string' && this.isUUID(value)) {
          return '[UUID]';
        }
        
        // Normalize emails
        if (key === 'email' && typeof value === 'string' && value.includes('@')) {
          return '[Email]';
        }
        
        return value;
      },
      ...options
    };

    return this.stabilize(record, defaultOptions);
  }

  /**
   * Stabilizes user data by anonymizing personal information
   */
  static stabilizeUserData(user: any, options: StabilizationOptions = {}): any {
    const defaultOptions: StabilizationOptions = {
      transformValues: (key: string, value: any) => {
        switch (key) {
          case 'id':
            return '[UserID]';
          case 'email':
            return '[Email]';
          case 'name':
            return '[Name]';
          case 'phone':
            return '[Phone]';
          case 'address':
            return '[Address]';
          case 'createdAt':
          case 'updatedAt':
            return '[Timestamp]';
          default:
            return value;
        }
      },
      ...options
    };

    return this.stabilize(user, defaultOptions);
  }

  /**
   * Stabilizes error objects for consistent testing
   */
  static stabilizeError(error: any, options: StabilizationOptions = {}): any {
    const defaultOptions: StabilizationOptions = {
      transformValues: (key: string, value: any) => {
        switch (key) {
          case 'stack':
            return '[Stack]';
          case 'timestamp':
            return '[Timestamp]';
          case 'requestId':
          case 'correlationId':
            return '[ID]';
          default:
            return value;
        }
      },
      ...options
    };

    return this.stabilize(error, defaultOptions);
  }

  /**
   * Creates a stable hash of an object for comparison
   */
  static createHash(obj: any): string {
    const stabilized = this.stabilize(obj);
    return JSON.stringify(stabilized);
  }

  /**
   * Compares two objects for structural equality after stabilization
   */
  static areEqual(obj1: any, obj2: any, options: StabilizationOptions = {}): boolean {
    const stabilized1 = this.stabilize(obj1, options);
    const stabilized2 = this.stabilize(obj2, options);
    return JSON.stringify(stabilized1) === JSON.stringify(stabilized2);
  }

  private static isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
