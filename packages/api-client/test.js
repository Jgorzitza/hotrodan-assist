const { ApiClient } = require('./dist/client.js');

console.log('Testing API Client...');

// Create client instance
const client = new ApiClient({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 5000
});

console.log('API Client created successfully');
console.log('Available methods:', Object.getOwnPropertyNames(ApiClient.prototype).filter(name => name !== 'constructor'));

console.log('API Client test passed!');
