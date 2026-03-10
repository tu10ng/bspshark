.PHONY: dev dev-frontend dev-backend build build-frontend build-backend test test-frontend test-backend lint lint-frontend lint-backend db-migrate

# Development
dev:
	@echo "Starting backend and frontend..."
	$(MAKE) dev-backend & $(MAKE) dev-frontend

dev-frontend:
	cd frontend && pnpm dev

dev-backend:
	cd backend && cargo run -j 6

# Build
build: build-frontend build-backend

build-frontend:
	cd frontend && pnpm build

build-backend:
	cd backend && cargo build -j 6 --release

# Test
test: test-frontend test-backend

test-frontend:
	cd frontend && pnpm test

test-backend:
	cd backend && cargo test -j 6

# Lint
lint: lint-frontend lint-backend

lint-frontend:
	cd frontend && pnpm lint

lint-backend:
	cd backend && cargo clippy -j 6 -- -D warnings

# Database
db-migrate:
	cd backend && sqlx database create && sqlx migrate run
