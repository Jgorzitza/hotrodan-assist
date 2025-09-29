#!/bin/bash

# Codegen script for Llama RAG project
# This script generates client SDKs and types from OpenAPI and GraphQL schemas

set -e

echo "🚀 Starting code generation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v openapi-generator-cli &> /dev/null; then
        print_error "openapi-generator-cli not found. Installing..."
        npm install -g @openapitools/openapi-generator-cli
    fi
    
    if ! command -v graphql-codegen &> /dev/null; then
        print_error "graphql-codegen not found. Installing..."
        npm install -g @graphql-codegen/cli
    fi
    
    print_status "Dependencies check complete"
}

# Generate OpenAPI clients
generate_openapi_clients() {
    print_status "Generating OpenAPI clients..."
    
    # TypeScript Axios client
    print_status "Generating TypeScript Axios client..."
    openapi-generator-cli generate \
        -g typescript-axios \
        -i specs/api.yaml \
        -o ../../packages/api-client/src/generated/ \
        --additional-properties=npmName=@llama-rag/api-client,npmVersion=1.0.0,supportsES6=true,useSingleRequestParameter=true
    
    # JavaScript SDK
    print_status "Generating JavaScript SDK..."
    openapi-generator-cli generate \
        -g javascript \
        -i specs/api.yaml \
        -o ../../packages/js-sdk/src/generated/ \
        --additional-properties=projectName=llama-rag-js-sdk,projectVersion=1.0.0,moduleName=LlamaRagSDK,usePromises=true
    
    # Python SDK
    print_status "Generating Python SDK..."
    openapi-generator-cli generate \
        -g python \
        -i specs/api.yaml \
        -o ../../packages/python-sdk/ \
        --additional-properties=packageName=llama_rag_sdk,projectName=llama-rag-python-sdk,packageVersion=1.0.0
    
    print_status "OpenAPI client generation complete"
}

# Generate GraphQL types
generate_graphql_types() {
    print_status "Generating GraphQL types..."
    
    # Check if GraphQL schema exists
    if [ ! -f "../../apps/dashboard/app/lib/graphql/schema.graphql" ]; then
        print_warning "GraphQL schema not found. Creating sample schema..."
        mkdir -p ../../apps/dashboard/app/lib/graphql/
        cat > ../../apps/dashboard/app/lib/graphql/schema.graphql << 'SCHEMA_EOF'
type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  ADMIN
  USER
  VIEWER
}

type Query {
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

input CreateUserInput {
  email: String!
  name: String!
  role: UserRole = USER
}

input UpdateUserInput {
  email: String
  name: String
  role: UserRole
}

scalar DateTime
SCHEMA_EOF
    fi
    
    # Generate GraphQL types
    cd ../../packages/graphql-types
    npm run codegen
    cd ../../tools/codegen
    
    print_status "GraphQL types generation complete"
}

# Build packages
build_packages() {
    print_status "Building packages..."
    
    # Build core package
    cd ../../packages/core
    npm run build
    cd ../../tools/codegen
    
    # Build API client package
    cd ../../packages/api-client
    npm run build
    cd ../../tools/codegen
    
    # Build GraphQL types package
    cd ../../packages/graphql-types
    npm run build
    cd ../../tools/codegen
    
    print_status "Package build complete"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test core package
    cd ../../packages/core
    if [ -f "test.js" ]; then
        node test.js
    fi
    cd ../../tools/codegen
    
    print_status "Tests complete"
}

# Main execution
main() {
    print_status "Starting Llama RAG code generation..."
    
    check_dependencies
    generate_openapi_clients
    generate_graphql_types
    build_packages
    run_tests
    
    print_status "🎉 Code generation complete!"
    print_status "Generated packages:"
    print_status "  - @llama-rag/core"
    print_status "  - @llama-rag/api-client"
    print_status "  - @llama-rag/graphql-types"
    print_status "  - @llama-rag/js-sdk"
    print_status "  - @llama-rag/python-sdk"
}

# Run main function
main "$@"
