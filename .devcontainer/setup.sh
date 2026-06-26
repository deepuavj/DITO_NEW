#!/bin/bash
set -e

echo "=== DITO Dev Environment Setup ==="

# Copy .env files if they don't exist
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "Created apps/api/.env from .env.example"
fi

if [ ! -f apps/web/.env ]; then
  [ -f apps/web/.env.example ] && cp apps/web/.env.example apps/web/.env && echo "Created apps/web/.env from .env.example"
fi

# Install dependencies
echo "Installing root dependencies..."
npm install

echo "Installing API dependencies..."
cd apps/api && npm install && cd ../..

echo "Installing web dependencies..."
cd apps/web && npm install && cd ../..

# Start docker services
if command -v docker &>/dev/null; then
  echo "Starting Docker services (Postgres, Redis, MinIO)..."
  docker compose up -d postgres redis minio 2>/dev/null || true
  # Wait for postgres
  echo "Waiting for Postgres..."
  for i in $(seq 1 20); do
    docker compose exec -T postgres pg_isready -U dito -d dito_db &>/dev/null && break || sleep 2
  done
  # Run migrations
  echo "Running DB migrations..."
  cd apps/api && npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null || true && cd ../..
fi

echo "=== Setup complete! ==="
echo "Run: cd apps/api && npm run dev"
echo "Run: cd apps/web && npm start"
