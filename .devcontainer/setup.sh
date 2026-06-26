#!/bin/bash
set -e

echo "=== DITO Dev Environment Setup ==="

# Ensure npm is available (fallback if feature didn't install)
if ! command -v npm &>/dev/null; then
  echo "npm not found — installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "Node: $(node -v), npm: $(npm -v)"

# Copy .env files if they don't exist
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "Created apps/api/.env from .env.example"
fi

if [ -f apps/web/.env.example ] && [ ! -f apps/web/.env ]; then
  cp apps/web/.env.example apps/web/.env
  echo "Created apps/web/.env from .env.example"
fi

# Install dependencies
echo "Installing root dependencies..."
npm install 2>/dev/null || true

echo "Installing API dependencies..."
(cd apps/api && npm install)

echo "Installing web dependencies..."
(cd apps/web && npm install)

# Start docker services if Docker is available
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  echo "Starting Docker services (Postgres, Redis, MinIO)..."
  docker compose up -d postgres redis minio 2>/dev/null || true

  echo "Waiting for Postgres to be ready..."
  for i in $(seq 1 20); do
    docker compose exec -T postgres pg_isready -U dito -d dito_db &>/dev/null && break
    echo "  attempt $i/20..."
    sleep 2
  done

  echo "Running DB migrations..."
  (cd apps/api && npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null) || true
fi

echo ""
echo "=== Setup complete! ==="
echo "  Start API:  cd apps/api && npm run dev"
echo "  Start Web:  cd apps/web && npm start"
