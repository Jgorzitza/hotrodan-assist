# Llama RAG Development Makefile

.PHONY: help install build test lint format clean bootstrap dev start stop

# Default target
help: ## Show this help message
	@echo "Llama RAG Development Commands"
	@echo "=============================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install all dependencies
	npm ci
	@for pkg in packages/*/; do \
		if [ -f "$$pkg/package.json" ]; then \
			echo "Installing dependencies for $$(basename $$pkg)..."; \
			cd "$$pkg" && npm ci && cd - > /dev/null; \
		fi; \
	done
	@for app in apps/*/; do \
		if [ -f "$$app/package.json" ]; then \
			echo "Installing dependencies for $$(basename $$app)..."; \
			cd "$$app" && npm ci && cd - > /dev/null; \
		fi; \
	done

bootstrap: ## Run full bootstrap setup
	./tools/bootstrap/bootstrap.sh

# Development
dev: ## Start development mode
	npm run dev

start: ## Start all services
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

# Building and testing
build: ## Build all packages
	npm run build

test: ## Run all tests
	npm run test

test-unit: ## Run unit tests
	npm run test:unit

test-integration: ## Run integration tests
	npm run test:integration

test-e2e: ## Run end-to-end tests
	npm run test:e2e

# Code quality
lint: ## Run linting
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

format: ## Format code
	npm run format

format-check: ## Check code formatting
	npm run format:check

typecheck: ## Run type checking
	npm run typecheck

# Security and releases
security-scan: ## Run security scanning
	npm run security:scan

security-secrets: ## Run secret scanning
	npm run security:secrets

security-licenses: ## Run license checking
	npm run security:licenses

release: ## Create a new release
	npm run release

release-patch: ## Create a patch release
	npm run release:patch

release-minor: ## Create a minor release
	npm run release:minor

release-major: ## Create a major release
	npm run release:major

# Code generation
scaffold: ## Run code scaffolder
	npm run scaffold

generate: ## Generate code (GraphQL, OpenAPI)
	./tools/codegen/codegen.sh

# Database
db-setup: ## Setup database
	cd apps/dashboard && npx prisma db push

db-seed: ## Seed database with sample data
	cd apps/dashboard && npx prisma db seed

db-reset: ## Reset database
	cd apps/dashboard && npx prisma db push --force-reset

# Cleanup
clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -rf coverage/
	rm -rf test-results/
	@for pkg in packages/*/; do \
		if [ -d "$$pkg/dist" ]; then rm -rf "$$pkg/dist"; fi; \
		if [ -d "$$pkg/node_modules/.cache" ]; then rm -rf "$$pkg/node_modules/.cache"; fi; \
	done
	@for app in apps/*/; do \
		if [ -d "$$app/dist" ]; then rm -rf "$$app/dist"; fi; \
		if [ -d "$$app/node_modules/.cache" ]; then rm -rf "$$app/node_modules/.cache"; fi; \
	done

clean-all: clean ## Clean everything including node_modules
	rm -rf node_modules/
	@for pkg in packages/*/; do \
		if [ -d "$$pkg/node_modules" ]; then rm -rf "$$pkg/node_modules"; fi; \
	done
	@for app in apps/*/; do \
		if [ -d "$$app/node_modules" ]; then rm -rf "$$app/node_modules"; fi; \
	done

# Monitoring and logs
logs: ## Show service logs
	docker-compose logs -f

logs-api: ## Show API logs
	docker-compose logs -f rag_api

logs-dashboard: ## Show dashboard logs
	docker-compose logs -f dashboard

# Health checks
health: ## Check service health
	@echo "Checking service health..."
	@curl -s http://localhost:8001/health || echo "RAG API: DOWN"
	@curl -s http://localhost:8002/health || echo "Assistants: DOWN"
	@curl -s http://localhost:8003/health || echo "Sync: DOWN"
	@curl -s http://localhost:8004/health || echo "Inventory API: DOWN"
	@curl -s http://localhost:3000/health || echo "Dashboard: DOWN"

# Documentation
docs: ## Generate documentation
	npm run docs

docs-serve: ## Serve documentation
	npm run docs:serve

# Performance
perf: ## Run performance tests
	npm run test:performance

perf-report: ## Generate performance report
	npm run test:performance:report

# Docker
docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

# Development helpers
watch: ## Watch for changes and rebuild
	npm run watch

dev-full: ## Full development setup (bootstrap + start)
	$(MAKE) bootstrap
	$(MAKE) start
	$(MAKE) dev

# Quick development cycle
quick: ## Quick development cycle (build + test + lint)
	$(MAKE) build
	$(MAKE) test
	$(MAKE) lint

# CI/CD helpers
ci: ## Run CI pipeline locally
	$(MAKE) install
	$(MAKE) build
	$(MAKE) test
	$(MAKE) lint
	$(MAKE) security:scan

# Package management
package-build: ## Build all packages
	@for pkg in packages/*/; do \
		if [ -f "$$pkg/package.json" ] && grep -q '"build"' "$$pkg/package.json"; then \
			echo "Building $$(basename $$pkg)..."; \
			cd "$$pkg" && npm run build && cd - > /dev/null; \
		fi; \
	done

package-test: ## Test all packages
	@for pkg in packages/*/; do \
		if [ -f "$$pkg/package.json" ] && grep -q '"test"' "$$pkg/package.json"; then \
			echo "Testing $$(basename $$pkg)..."; \
			cd "$$pkg" && npm run test && cd - > /dev/null; \
		fi; \
	done

# Environment setup
env-check: ## Check environment setup
	@echo "Checking environment..."
	@node --version || echo "Node.js: NOT FOUND"
	@npm --version || echo "npm: NOT FOUND"
	@python3 --version || echo "Python: NOT FOUND"
	@git --version || echo "Git: NOT FOUND"
	@docker --version || echo "Docker: NOT FOUND"

env-setup: ## Setup environment files
	@if [ ! -f ".env" ]; then \
		if [ -f ".env.example" ]; then \
			cp .env.example .env; \
			echo "Created .env from .env.example"; \
		else \
			echo "Please create .env file manually"; \
		fi; \
	else \
		echo ".env file already exists"; \
	fi

# Show project info
info: ## Show project information
	@echo "Llama RAG Project Information"
	@echo "============================="
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'Not found')"
	@echo "npm: $$(npm --version 2>/dev/null || echo 'Not found')"
	@echo "Python: $$(python3 --version 2>/dev/null || echo 'Not found')"
	@echo "Git: $$(git --version 2>/dev/null || echo 'Not found')"
	@echo "Docker: $$(docker --version 2>/dev/null || echo 'Not found')"
	@echo ""
	@echo "Packages:"
	@for pkg in packages/*/; do \
		if [ -f "$$pkg/package.json" ]; then \
			echo "  - $$(basename $$pkg)"; \
		fi; \
	done
	@echo ""
	@echo "Apps:"
	@for app in apps/*/; do \
		if [ -f "$$app/package.json" ]; then \
			echo "  - $$(basename $$app)"; \
		fi; \
	done
