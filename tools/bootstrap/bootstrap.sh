#!/bin/bash

# Llama RAG Development Bootstrap Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[BOOTSTRAP]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command_exists node; then
        missing_deps+=("Node.js (v18+)")
    else
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo $node_version | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            missing_deps+=("Node.js v18+ (current: v$node_version)")
        else
            print_status "Node.js v$node_version ✓"
        fi
    fi
    
    # Check npm
    if ! command_exists npm; then
        missing_deps+=("npm")
    else
        print_status "npm $(npm --version) ✓"
    fi
    
    # Check Python
    if ! command_exists python3; then
        missing_deps+=("Python 3")
    else
        print_status "Python $(python3 --version) ✓"
    fi
    
    # Check Git
    if ! command_exists git; then
        missing_deps+=("Git")
    else
        print_status "Git $(git --version | cut -d' ' -f3) ✓"
    fi
    
    # Check Docker (optional)
    if command_exists docker; then
        print_status "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) ✓"
    else
        print_warning "Docker not found (optional for some services)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi
    
    print_status "All system requirements met ✓"
}

# Function to setup environment
setup_environment() {
    print_step "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please update .env file with your configuration"
        else
            cat > .env << ENV_EOF
# Llama RAG Environment Configuration

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llama_rag"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys (add your keys here)
SHOPIFY_API_KEY=""
SHOPIFY_API_SECRET=""
SHOPIFY_WEBHOOK_SECRET=""

# Feature Flags
USE_MOCK_DATA=true
ENABLE_MCP=true
ENABLE_SEO=true
ENABLE_INVENTORY=true

# Development
NODE_ENV=development
LOG_LEVEL=debug
ENV_EOF
            print_warning "Created basic .env file - please configure with your settings"
        fi
    else
        print_status ".env file already exists ✓"
    fi
    
    # Create necessary directories
    local dirs=(
        "logs"
        "data"
        "data/storage"
        "data/chroma"
        "coverage"
        "test-results"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    print_status "Environment setup complete ✓"
}

# Function to install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm ci
    
    # Install package dependencies
    print_status "Installing package dependencies..."
    for pkg in packages/*/; do
        if [ -f "$pkg/package.json" ]; then
            print_status "Installing dependencies for $(basename $pkg)..."
            cd "$pkg"
            npm ci || npm install
            cd - > /dev/null
        fi
    done
    
    # Install app dependencies
    print_status "Installing app dependencies..."
    for app in apps/*/; do
        if [ -f "$app/package.json" ]; then
            print_status "Installing dependencies for $(basename $app)..."
            cd "$app"
            npm ci || npm install
            cd - > /dev/null
        fi
    done
    
    print_status "Dependencies installation complete ✓"
}

# Function to setup database
setup_database() {
    print_step "Setting up database..."
    
    # Check if PostgreSQL is running
    if command_exists psql; then
        print_status "Checking PostgreSQL connection..."
        if psql -h localhost -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            print_status "PostgreSQL connection successful ✓"
        else
            print_warning "PostgreSQL connection failed - please ensure PostgreSQL is running"
        fi
    else
        print_warning "PostgreSQL client not found - skipping database setup"
    fi
    
    # Setup Prisma database
    if [ -f "apps/dashboard/prisma/schema.prisma" ]; then
        print_status "Setting up Prisma database..."
        cd apps/dashboard
        npx prisma generate
        npx prisma db push || print_warning "Database push failed - may need manual setup"
        cd - > /dev/null
    fi
    
    print_status "Database setup complete ✓"
}

# Function to build packages
build_packages() {
    print_step "Building packages..."
    
    # Build core packages
    for pkg in packages/*/; do
        if [ -f "$pkg/package.json" ] && grep -q '"build"' "$pkg/package.json"; then
            print_status "Building $(basename $pkg)..."
            cd "$pkg"
            npm run build || print_warning "Build failed for $(basename $pkg)"
            cd - > /dev/null
        fi
    done
    
    print_status "Package builds complete ✓"
}

# Function to run tests
run_tests() {
    print_step "Running tests..."
    
    # Run unit tests
    print_status "Running unit tests..."
    npm run test:unit || print_warning "Unit tests failed"
    
    # Run integration tests
    print_status "Running integration tests..."
    npm run test:integration || print_warning "Integration tests failed"
    
    print_status "Tests complete ✓"
}

# Function to setup development tools
setup_dev_tools() {
    print_step "Setting up development tools..."
    
    # Setup Git hooks
    if [ -d ".git" ]; then
        print_status "Setting up Git hooks..."
        if [ -d ".husky" ]; then
            npx husky install
            print_status "Git hooks configured ✓"
        fi
    fi
    
    # Setup code formatting
    print_status "Setting up code formatting..."
    npm run format || print_warning "Code formatting setup failed"
    
    print_status "Development tools setup complete ✓"
}

# Function to create sample data
create_sample_data() {
    print_step "Creating sample data..."
    
    # Create sample data directory
    mkdir -p data/samples
    
    # Create sample configuration
    cat > data/samples/config.json << SAMPLE_CONFIG_EOF
{
  "app": {
    "name": "Llama RAG",
    "version": "1.0.0",
    "environment": "development"
  },
  "features": {
    "mockData": true,
    "mcpIntegration": true,
    "seoAnalytics": true,
    "inventoryManagement": true
  },
  "services": {
    "ragApi": {
      "port": 8001,
      "enabled": true
    },
    "assistants": {
      "port": 8002,
      "enabled": true
    },
    "sync": {
      "port": 8003,
      "enabled": true
    },
    "inventoryApi": {
      "port": 8004,
      "enabled": true
    }
  }
}
SAMPLE_CONFIG_EOF
    
    # Create sample user data
    cat > data/samples/users.json << SAMPLE_USERS_EOF
[
  {
    "id": "user-1",
    "email": "admin@llamarag.com",
    "name": "Admin User",
    "role": "admin",
    "createdAt": "2025-09-29T00:00:00Z"
  },
  {
    "id": "user-2",
    "email": "user@llamarag.com",
    "name": "Test User",
    "role": "user",
    "createdAt": "2025-09-29T00:00:00Z"
  }
]
SAMPLE_USERS_EOF
    
    print_status "Sample data created ✓"
}

# Function to start development services
start_services() {
    print_step "Starting development services..."
    
    # Check if services should be started
    read -p "Do you want to start development services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting services with docker-compose..."
        
        if [ -f "docker-compose.yml" ] && command_exists docker; then
            docker-compose up -d
            print_status "Services started ✓"
        else
            print_warning "Docker Compose not available - services not started"
        fi
    else
        print_status "Skipping service startup"
    fi
}

# Function to display next steps
show_next_steps() {
    print_header "Bootstrap Complete! 🎉"
    
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Update .env file with your configuration"
    echo "2. Start development services: docker-compose up -d"
    echo "3. Run the dashboard: cd apps/dashboard && npm run dev"
    echo "4. Run tests: npm test"
    echo "5. Generate code: npm run scaffold"
    echo "6. Run security scan: npm run security:scan"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  npm run dev          - Start development mode"
    echo "  npm run build        - Build all packages"
    echo "  npm run test         - Run all tests"
    echo "  npm run lint         - Run linting"
    echo "  npm run format       - Format code"
    echo "  npm run scaffold     - Generate new components"
    echo "  npm run release      - Create a release"
    echo ""
    echo -e "${YELLOW}Happy coding! 🚀${NC}"
}

# Main function
main() {
    print_header "Llama RAG Development Bootstrap"
    print_status "Setting up development environment..."
    
    # Run bootstrap steps
    check_requirements
    setup_environment
    install_dependencies
    setup_database
    build_packages
    run_tests
    setup_dev_tools
    create_sample_data
    start_services
    show_next_steps
    
    print_header "Bootstrap completed successfully! ✅"
}

# Run main function
main "$@"
