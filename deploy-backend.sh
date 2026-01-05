#!/bin/bash

# Backend-Only Deployment Script for SysDes
# Usage: ./deploy-backend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting backend deployment..."

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Load environment variables
export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)

# Pull latest changes (optional - comment out if deploying manually)
# echo "📥 Pulling latest changes..."
# git pull origin main

# Build backend image
echo "🐳 Building backend Docker image..."
docker compose -f docker-compose.backend.yml build --no-cache backend

# Stop existing containers
echo "🔄 Stopping existing containers..."
docker compose -f docker-compose.backend.yml down

# Start services
echo "🚀 Starting backend services..."
docker compose -f docker-compose.backend.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check PostgreSQL health
echo "🏥 Checking PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker compose.backend.yml exec -T postgres pg_isready -U ${DB_USER:-sysdes} > /dev/null 2>&1; then
        echo "✅ PostgreSQL is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL health check failed!"
        docker compose -f docker-compose.backend.yml logs postgres
        exit 1
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

# Check backend health
echo "🏥 Checking backend..."
for i in {1..30}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend health check failed!"
        docker-compose -f docker-compose.backend.yml logs backend
        exit 1
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose -f docker-compose.backend.yml logs --tail=20

echo ""
echo "✅ Backend deployment completed successfully!"
echo ""
echo "📊 Service status:"
docker-compose -f docker-compose.backend.yml ps
echo ""
echo "🌐 Backend is running at:"
echo "   Local:  http://localhost:8080"
echo "   HTTPS:  https://your-domain.com (after SSL setup)"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.backend.yml logs -f"
echo "   Stop:         docker-compose -f docker-compose.backend.yml down"
echo "   Restart:      docker-compose -f docker-compose.backend.yml restart"
echo "   DB backup:    docker-compose -f docker-compose.backend.yml exec postgres pg_dump -U sysdes sysdes > backup.sql"
