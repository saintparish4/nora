.PHONY: help install setup test clean dev dev-stop docker-up docker-down db-reset db-migrate db-seed

# Default target
help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies (frontend + backend)"
	@echo "  make setup        - Full project setup (install + database setup)"
	@echo "  make test         - Run all tests (frontend + backend)"
	@echo "  make dev          - Start development servers"
	@echo "  make dev-stop     - Stop development servers (frontend:3000, backend:3001)"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make db-reset     - Reset database (drop, create, migrate, seed)"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database"
	@echo "  make clean        - Clean build artifacts and dependencies"

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

# Development
dev:
	@echo "Starting development servers..."
	@echo "Backend will run on http://localhost:3001"
	@echo "Frontend will run on http://localhost:3000"
	cd api && rails s & cd base && pnpm run dev

dev-stop:
	@echo "Stopping development servers..."
	-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
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
lint:
	@echo "Running linters..."
	cd base && pnpm run lint
	cd api && bundle exec rubocop

lint-fix:
	cd base && pnpm run lint -- --fix
	cd api && bundle exec rubocop -a