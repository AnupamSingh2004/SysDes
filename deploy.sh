#!/bin/bash

# SysDes Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENV=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting deployment for $ENV environment..."

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and start services
echo "🐳 Building Docker images..."
docker-compose build --no-cache

echo "🔄 Stopping existing containers..."
docker-compose down

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check backend health
echo "🏥 Checking backend health..."
for i in {1..30}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend health check failed!"
        docker-compose logs backend
        exit 1
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Check frontend health
echo "🏥 Checking frontend health..."
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend health check failed!"
        docker-compose logs frontend
        exit 1
    fi
    echo "Waiting for frontend... ($i/30)"
    sleep 2
done

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment completed successfully!"
echo "📊 Service status:"
docker-compose ps

echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo "   Nginx:    http://localhost"
