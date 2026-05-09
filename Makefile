.PHONY: help install dev build start lint typecheck db-generate db-migrate db-push verify-no-pii up down logs clean

help:
	@echo "trustcard make targets:"
	@echo "  install         npm install"
	@echo "  dev             next dev (local Postgres expected at \$$DATABASE_URL)"
	@echo "  build           next build"
	@echo "  start           next start"
	@echo "  lint            next lint"
	@echo "  typecheck       tsc --noEmit"
	@echo "  db-generate     drizzle-kit generate (create migration from schema)"
	@echo "  db-migrate      drizzle-kit migrate (apply pending migrations)"
	@echo "  db-push         drizzle-kit push (dev shortcut, skips migrations)"
	@echo "  verify-no-pii   run the OSS PII guardrail script"
	@echo "  up              docker compose up --build (full stack)"
	@echo "  down            docker compose down"
	@echo "  logs            docker compose logs -f app"
	@echo "  clean           remove .next, coverage, and node_modules"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

typecheck:
	npm run typecheck

db-generate:
	npm run db:generate

db-migrate:
	npm run db:migrate

db-push:
	npm run db:push

verify-no-pii:
	npm run verify-no-pii

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f app

clean:
	rm -rf .next coverage node_modules
