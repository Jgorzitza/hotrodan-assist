#!/usr/bin/env node

// Simple test for test-utils package
import { UserFactory, ProductFactory, OrderFactory, SnapshotStabilizer, TestUsers, TestHelpers } from './dist/index.js';

console.log('Testing Llama RAG Test Utils...');

// Test User Factory
console.log('\n=== User Factory Tests ===');
const user = UserFactory.create();
console.log('Created user:', user.name, user.email);

const admin = UserFactory.createAdmin();
console.log('Created admin:', admin.name, admin.role);

const users = UserFactory.createMany(3);
console.log('Created', users.length, 'users');

// Test Product Factory
console.log('\n=== Product Factory Tests ===');
const product = ProductFactory.create();
console.log('Created product:', product.name, '$' + product.price);

const inStockProduct = ProductFactory.createInStock();
console.log('In stock product:', inStockProduct.name, 'Quantity:', inStockProduct.inventory.quantity);

// Test Order Factory
console.log('\n=== Order Factory Tests ===');
const order = OrderFactory.create();
console.log('Created order:', order.id, 'Total: $' + order.totals.total);

const completedOrder = OrderFactory.createCompleted();
console.log('Completed order:', completedOrder.id, 'Status:', completedOrder.status);

// Test Snapshot Stabilizer
console.log('\n=== Snapshot Stabilizer Tests ===');
const testObj = {
  id: 'test-123',
  name: 'Test',
  createdAt: new Date(),
  email: 'test@example.com'
};

const stabilized = SnapshotStabilizer.stabilize(testObj);
console.log('Stabilized object:', JSON.stringify(stabilized, null, 2));

// Test Test Data
console.log('\n=== Test Data Tests ===');
console.log('Test admin user:', TestUsers.admin.name);
console.log('Test product:', TestProducts.inStock.name);

// Test Helpers
console.log('\n=== Test Helpers Tests ===');
const mockEmail = TestHelpers.createMockEmail();
console.log('Mock email:', mockEmail);

const mockUUID = TestHelpers.createMockUUID();
console.log('Mock UUID:', mockUUID);

console.log('\n✅ All tests completed successfully!');
