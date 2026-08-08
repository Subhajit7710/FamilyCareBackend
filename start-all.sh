#!/bin/bash

# Start Docker containers
cd FamilyCare-Server
docker-compose up -d

echo "Docker containers started"
echo "Waiting for containers to be ready..."
sleep 5

# Start Auth Service
cd auth-service
npm install
npm run dev &
cd ..

# Start Family Service
cd family-service
npm install
npm run dev &
cd ..

# Start Health Service
cd health-service
npm install
npm run dev &
cd ..

# Start API Gateway
cd api-gateway
npm install
npm run dev &
cd ..

echo ""
echo "All services started!"
echo ""
echo "Service URLs:"
echo "   Auth Service:     http://localhost:3001"
echo "   Family Service:   http://localhost:3002"
echo "   Health Service:   http://localhost:3003"
echo "   API Gateway:      http://localhost:3000"
echo "   Bull Board:       http://localhost:3005"
echo ""
echo "Press Ctrl+C to stop all services"