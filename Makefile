.PHONY: help up down build rebuild logs shell composer artisan migrate seed test frontend-install frontend-dev frontend-build frontend-lint frontend-test frontend-test-ci db-fresh db-seed artisan-tinker dev-backend dev-all ps up-dev up-prod

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker commands
up: ## Start all containers
	docker compose up -d

down: ## Stop all containers
	docker compose down

build: ## Build all containers
	docker compose build

rebuild: ## Rebuild and restart all containers
	docker compose down
	docker compose build --no-cache
	docker compose up -d

logs: ## Show logs from all containers
	docker compose logs -f

ps: ## Show container status
	docker compose ps

shell: ## Open shell in app container
	docker compose exec app sh

# Laravel commands (run inside app container)
composer: ## Install PHP dependencies
	docker compose exec app composer install

artisan: ## Run artisan command (usage: make artisan cmd="list")
	docker compose exec app php artisan $(cmd)

migrate: ## Run migrations
	docker compose exec app php artisan migrate

seed: ## Run seeders
	docker compose exec app php artisan db:seed

test: ## Run PHP tests
	docker compose exec app php artisan test

# Database commands
db-fresh: ## Drop and recreate database with migrations
	docker compose exec app php artisan migrate:fresh --seed

db-seed: ## Run seeders only
	docker compose exec app php artisan db:seed --class="TenantDemoSeeder"

artisan-tinker: ## Open tinker
	docker compose exec app php artisan tinker

# Frontend commands
frontend-install: ## Install frontend dependencies (preserves host UID/GID)
	docker compose run --rm --user $$(id -u):$$(id -g) frontend npm install --no-audit --no-fund

frontend-add: ## Install additional npm packages, usage: make frontend-add pkg="<package names>"
	@[ -n "$(pkg)" ] || (echo "Usage: make frontend-add pkg=\"package@version other@version\""; exit 1)
	docker compose run --rm --user $$(id -u):$$(id -g) frontend sh -lc 'npm install --no-audit --no-fund $(pkg)'

frontend-dev: ## Start frontend dev server with hot reload (exposes ports)
	docker compose run --rm --service-ports frontend npm run dev

frontend-build: ## Build frontend
	docker compose run --rm frontend npm run build

frontend-lint: ## Lint frontend
	docker compose run --rm frontend npm run lint

frontend-test: ## Run frontend Jest tests
	docker compose run --rm frontend npm test

frontend-test-ci: ## Run frontend Jest tests in CI-friendly way (installs dev deps as root to avoid EACCES)
	docker compose run --rm -u root frontend sh -lc "(npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund) && ./node_modules/.bin/jest --ci --runInBand --colors"

# Full stack commands
install: up composer frontend-install migrate ## Setup project from scratch
dev-backend: ## Start backend services (app, db, redis, svggen) in background
	docker compose up -d app db redis svggen
dev-all: dev-backend ## Start full dev: backend in background, then run frontend dev (Ctrl+C to stop dev server)
	$(MAKE) frontend-dev
dev: dev-all ## Alias for dev-all
up-dev: ## Start with dev profile (frontend, comfyui-mock)
	docker compose --profile dev up -d
up-prod: ## Start without dev profile (no frontend dev, no comfyui-mock)
	docker compose up -d
