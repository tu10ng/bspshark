.PHONY: dev dev-frontend dev-backend build build-frontend build-backend test test-frontend test-backend lint lint-frontend lint-backend db-migrate dist docker-build docker-save docker-load docker-up docker-down docker-logs

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

# Dist packaging (local build)
DIST_DIR := dist/bspshark

dist: build-frontend
	cd backend && cargo build -j 6 --release --target x86_64-unknown-linux-musl
	rm -rf dist
	mkdir -p $(DIST_DIR)/frontend $(DIST_DIR)/migrations $(DIST_DIR)/data $(DIST_DIR)/logs $(DIST_DIR)/pids
	cp backend/target/x86_64-unknown-linux-musl/release/backend $(DIST_DIR)/
	cp -r frontend/.next/standalone/. $(DIST_DIR)/frontend/
	cp -r frontend/.next/static $(DIST_DIR)/frontend/.next/static
	cp -r frontend/public $(DIST_DIR)/frontend/public
	cp -r backend/migrations/* $(DIST_DIR)/migrations/
	cp deploy/.env.production $(DIST_DIR)/.env.example
	cp deploy/start.sh deploy/stop.sh deploy/update.sh $(DIST_DIR)/
	chmod +x $(DIST_DIR)/start.sh $(DIST_DIR)/stop.sh $(DIST_DIR)/update.sh
	@echo "Dist ready at $(DIST_DIR)/"
	@echo "Run: cd $(DIST_DIR) && cp .env.example .env && ./start.sh"

# Docker
DOCKER_IMAGE := bspshark

docker-build:
	docker build -t $(DOCKER_IMAGE):latest .

docker-save: docker-build
	docker save $(DOCKER_IMAGE):latest | gzip > $(DOCKER_IMAGE).tar.gz
	@ls -lh $(DOCKER_IMAGE).tar.gz

docker-load:
	docker load < $(DOCKER_IMAGE).tar.gz

docker-up:
	docker compose -f docker-compose.prod.yml up -d

docker-down:
	docker compose -f docker-compose.prod.yml down

docker-logs:
	docker compose -f docker-compose.prod.yml logs -f
