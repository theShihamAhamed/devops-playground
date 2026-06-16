#!/usr/bin/env bash

# Production startup script for DevOps Playground API with Neon Cloud.

set -e

COMPOSE_FILE="docker-compose.prod.yml"

echo "Starting DevOps Playground API in production mode"
echo "================================================"

if [ ! -f .env.production ]; then
  echo "Error: .env.production file not found."
  echo "Create .env.production with your production environment variables."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running."
  echo "Start Docker and try again."
  exit 1
fi

echo "Building and starting production container..."
echo "   - Using Neon Cloud Database and the production app container"
echo "   - Running in optimized production mode"
echo ""

docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting for the production app container to be ready..."
sleep 5

echo "Applying latest schema with Drizzle..."
npm run db:migrate:prod

echo ""
echo "Production environment started."
echo "   Application: http://localhost:${PORT:-3000}"
echo "   Logs: docker logs devops-playground-api-prod"
echo ""
echo "Useful commands:"
echo "   View logs: docker logs -f devops-playground-api-prod"
echo "   Stop app: docker compose -f $COMPOSE_FILE down"
