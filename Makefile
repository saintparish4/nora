.PHONY: help install setup test clean dev dev-stop docker-up docker-down db-reset db-migrate db-seed test-backend-postgres test-e2e lint lint-frontend lint-backend lint-fix lint-fix-frontend lint-fix-backend

# Local ports. Override per run: make dev FRONTEND_PORT=4005. A different
# API_PORT also needs NEXT_PUBLIC_API_URL in base/.env.local to match.
FRONTEND_PORT ?= 3005
API_PORT ?= 3006

# Default target
help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies (frontend + backend)"
	@echo "                      (needs Node >= 22.13 and Ruby 4.0.x)"
	@echo "  make setup        - Full project setup (install + database setup)"
	@echo "  make test         - Run all tests (frontend + backend)"
	@echo "  make dev          - Start development servers"
	@echo "  make dev-stop     - Stop development servers (frontend:$(FRONTEND_PORT), backend:$(API_PORT))"
	@echo "  make dev SQL_LOG=1 - Start them with every SQL query in the API log"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make db-reset     - Reset database (drop, create, migrate, seed)"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database"
	@echo "  make test-backend-postgres - RSpec against PostgreSQL (needs docker compose up -d postgres)"
	@echo "  make test-e2e     - Cypress against the real API and console (own ports, 3105/3106)"
	@echo "  make clean        - Clean build artifacts and dependencies"
	@echo "  make lint         - Run frontend (ESLint) and backend (RuboCop) linters"
	@echo "  make lint-frontend - Run ESLint in base/"
	@echo "  make lint-backend  - Run RuboCop in api/"
	@echo "  make lint-fix     - Auto-fix with ESLint and RuboCop"
	@echo "  make lint-fix-frontend - ESLint --fix in base/"
	@echo "  make lint-fix-backend  - RuboCop -a in api/"

# Installation
install:
	@echo "Installing frontend dependencies..."
	cd base && pnpm install
	@echo "Installing backend dependencies..."
	cd api && bundle install

# Full setup
setup: install
	@echo "Setting up database..."
	cd api && rails db:create db:migrate db:seed
	@echo "Setup complete!"

# Testing
test:
	@echo "Running backend tests..."
	cd api && bundle exec rspec
	@echo "Running frontend tests..."
	cd base && pnpm test

test-backend:
	cd api && bundle exec rspec

test-frontend:
	cd base && pnpm test

# Cypress against the real stack, on its own ports (3105/3106), so it can run
# alongside make dev.
test-e2e:
	cd base && pnpm e2e

# Development
dev:
	@echo "Starting development servers..."
	@echo "Backend will run on http://localhost:$(API_PORT)"
	@echo "Frontend will run on http://localhost:$(FRONTEND_PORT)"
	cd api && rails s -p $(API_PORT) & cd base && pnpm exec next dev --turbopack -p $(FRONTEND_PORT)

dev-stop:
	@echo "Stopping development servers..."
	@# lsof misses some listeners (WSL); fuser catches them.
	-@for port in $(FRONTEND_PORT) $(API_PORT); do \
		pids=$$(lsof -ti:$$port 2>/dev/null || fuser $$port/tcp 2>/dev/null); \
		[ -n "$$pids" ] && kill -9 $$pids 2>/dev/null; \
	done; true
	@echo "Servers stopped."

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	docker-compose down
	docker-compose build
	docker-compose up -d

# Database
db-reset:
	cd api && rails db:drop db:create db:migrate db:seed

db-migrate:
	cd api && rails db:migrate

db-seed:
	cd api && rails db:seed

db-rollback:
	cd api && rails db:rollback

# Cleaning
clean:
	@echo "Cleaning build artifacts..."
	cd base && rm -rf .next node_modules
	cd api && rm -rf tmp/cache
	@echo "Clean complete!"

clean-all: clean
	@echo "Removing all dependencies..."
	cd api && rm -rf vendor/bundle
	@echo "Full clean complete!"

# Linting
lint: lint-frontend lint-backend

lint-frontend:
	@echo "Running frontend linter..."
	cd base && pnpm run lint

lint-backend:
	@echo "Running backend linter..."
	cd api && bundle exec rubocop

lint-fix: lint-fix-frontend lint-fix-backend

lint-fix-frontend:
	cd base && pnpm run lint --fix

lint-fix-backend:
	cd api && bundle exec rubocop -a

# Runs the backend suite against PostgreSQL instead of SQLite. The two differ
# on locking, transaction semantics, and case sensitivity, so a green SQLite
# run says nothing about the database the application is meant to run on.
# CI runs this as its own job; this is the local equivalent.
test-backend-postgres:
	@echo "Requires: docker compose up -d postgres"
	cd api && DATABASE_URL=postgres://nora:nora@localhost:5432/nora_test bundle exec rails db:prepare
	cd api && DATABASE_URL=postgres://nora:nora@localhost:5432/nora_test bundle exec rspec
