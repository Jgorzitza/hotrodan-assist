const { createApiResponse, isValidEmail, generateRandomString } = require('./dist/index.js');

console.log('Testing core package...');

// Test createApiResponse
const response = createApiResponse({ message: 'Hello' }, true, 'Success');
console.log('createApiResponse:', response);

// Test isValidEmail
console.log('isValidEmail("test@example.com"):', isValidEmail('test@example.com'));
console.log('isValidEmail("invalid"):', isValidEmail('invalid'));

// Test generateRandomString
console.log('generateRandomString(10):', generateRandomString(10));

console.log('All tests passed!');
