import { faker } from '@faker-js/faker';

// Set a consistent seed for reproducible test data
faker.seed(12345);

export const TestUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin' as const,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  user: {
    id: 'user-1',
    email: 'user@test.com',
    name: 'Test User',
    role: 'user' as const,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  viewer: {
    id: 'viewer-1',
    email: 'viewer@test.com',
    name: 'Viewer User',
    role: 'viewer' as const,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
};

export const TestProducts = {
  inStock: {
    id: 'product-1',
    name: 'Test Product',
    description: 'A test product for testing',
    price: 29.99,
    currency: 'USD',
    category: 'Electronics',
    tags: ['test', 'featured'],
    inventory: {
      quantity: 50,
      lowStockThreshold: 10,
      inStock: true
    },
    metadata: {
      sku: 'TEST-001',
      weight: 1.5,
      dimensions: { length: 10, width: 8, height: 2 },
      images: ['https://example.com/image1.jpg']
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  outOfStock: {
    id: 'product-2',
    name: 'Out of Stock Product',
    description: 'A product that is out of stock',
    price: 49.99,
    currency: 'USD',
    category: 'Books',
    tags: ['test'],
    inventory: {
      quantity: 0,
      lowStockThreshold: 10,
      inStock: false
    },
    metadata: {
      sku: 'TEST-002',
      weight: 0.5,
      dimensions: { length: 8, width: 6, height: 1 },
      images: ['https://example.com/image2.jpg']
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
};

export const TestOrders = {
  pending: {
    id: 'order-1',
    userId: 'user-1',
    status: 'pending' as const,
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        price: 29.99,
        name: 'Test Product'
      }
    ],
    shipping: {
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      method: 'standard',
      cost: 5.99
    },
    payment: {
      method: 'credit_card',
      status: 'pending' as const,
      amount: 65.97,
      currency: 'USD'
    },
    totals: {
      subtotal: 59.98,
      tax: 4.80,
      shipping: 5.99,
      total: 65.97
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  completed: {
    id: 'order-2',
    userId: 'user-1',
    status: 'delivered' as const,
    items: [
      {
        productId: 'product-1',
        quantity: 1,
        price: 29.99,
        name: 'Test Product'
      }
    ],
    shipping: {
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      method: 'express',
      cost: 9.99
    },
    payment: {
      method: 'credit_card',
      status: 'completed' as const,
      amount: 42.78,
      currency: 'USD'
    },
    totals: {
      subtotal: 29.99,
      tax: 2.40,
      shipping: 9.99,
      total: 42.78
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
};

export const TestApiResponses = {
  success: {
    success: true,
    data: TestProducts.inStock,
    message: 'Product retrieved successfully'
  },
  error: {
    success: false,
    error: 'Product not found',
    message: 'The requested product could not be found'
  },
  validationError: {
    success: false,
    error: 'Validation failed',
    message: 'Invalid input data',
    details: {
      field: 'email',
      message: 'Email is required'
    }
  }
};

export const TestEnvironment = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    REDIS_URL: 'redis://localhost:6379'
  },
  test: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    REDIS_URL: 'redis://localhost:6379'
  },
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgresql://prod:prod@prod-db:5432/prod_db',
    REDIS_URL: 'redis://prod-redis:6379'
  }
};

export const TestConfigs = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    username: 'test',
    password: 'test',
    ssl: false
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0
  },
  api: {
    port: 3000,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  }
};

// Reset faker seed for other uses
faker.seed();
