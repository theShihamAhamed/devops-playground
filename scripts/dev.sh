#!/usr/bin/env bash

# Development startup script for DevOps Playground API with Neon Local.

set -e

COMPOSE_FILE="docker-compose.dev.yml"

echo "Starting DevOps Playground API in development mode"
echo "================================================"

if [ ! -f .env.development ]; then
  echo "Error: .env.development file not found."
  echo "Copy .env.example to .env.development and fill in your Neon and Arcjet values."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running."
  echo "Start Docker Desktop and try again."
  exit 1
fi

mkdir -p .neon_local

if ! grep -q ".neon_local/" .gitignore 2>/dev/null; then
  echo ".neon_local/" >> .gitignore
  echo "Added .neon_local/ to .gitignore"
fi

echo "Building and starting development containers..."
echo "   - Neon Local proxy will create an ephemeral database branch"
echo "   - Application will run with hot reload enabled"
echo ""

docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting for the Neon Local proxy to be ready..."
docker compose -f "$COMPOSE_FILE" exec neon-local psql -U neon -d neondb -c 'SELECT 1'

echo "Applying latest schema with Drizzle..."
npm run db:migrate:dev

echo ""
echo "Development environment started."
echo "   Application: http://localhost:${PORT:-3000}"
echo "   Database: postgres://neon:npg@localhost:5432/neondb"
echo ""
echo "Useful commands:"
echo "   View logs: docker compose -f $COMPOSE_FILE logs -f app"
echo "   Stop stack: docker compose -f $COMPOSE_FILE down"
