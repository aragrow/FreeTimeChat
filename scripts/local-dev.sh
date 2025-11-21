#!/bin/bash

# ================================
# FreeTimeChat - Local Development Script
# ================================
# Runs the app locally (NOT in Docker)
# Only database services run in Docker
# ================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Emoji
CHECK_MARK="✅"
CROSS_MARK="❌"
ROCKET="🚀"
GEAR="⚙️"

echo -e "${CYAN}${ROCKET} FreeTimeChat - Local Development${NC}"
echo -e "${CYAN}====================================${NC}\n"

# Function to check if port is in use
check_port() {
  lsof -i :$1 > /dev/null 2>&1
  return $?
}

# Function to kill process on port
kill_port() {
  local port=$1
  if check_port $port; then
    echo -e "${YELLOW}Killing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# ================================
# Step 1: Clean Up Ports
# ================================
echo -e "${BLUE}${GEAR} Step 1: Cleaning up ports...${NC}"
kill_port 3000  # Next.js
kill_port 3001  # API
echo -e "${GREEN}${CHECK_MARK} Ports cleared${NC}\n"

# ================================
# Step 2: Start Database Services
# ================================
echo -e "${BLUE}${GEAR} Step 2: Starting database services (Docker)...${NC}"

# Start PostgreSQL and Redis via Docker Compose
docker-compose up -d postgres redis

# Wait for PostgreSQL
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
max_attempts=30
attempt=0
while ! docker-compose exec -T postgres pg_isready -U freetimechat > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}${CROSS_MARK} PostgreSQL failed to start${NC}"
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}${CHECK_MARK} PostgreSQL is ready${NC}"

# Verify Redis
if docker-compose exec -T redis redis-cli --raw incr ping > /dev/null 2>&1; then
  echo -e "${GREEN}${CHECK_MARK} Redis is ready${NC}"
else
  echo -e "${RED}${CROSS_MARK} Redis failed to start${NC}"
  exit 1
fi

echo ""

# ================================
# Step 3: Check Environment Files
# ================================
echo -e "${BLUE}${GEAR} Step 3: Checking environment files...${NC}"

if [ ! -f apps/api/.env ]; then
  echo -e "${YELLOW}Creating apps/api/.env from .env.example...${NC}"
  cp apps/api/.env.example apps/api/.env
  echo -e "${YELLOW}⚠️  Please update apps/api/.env with your credentials${NC}"
fi

if [ ! -f apps/web/.env.local ]; then
  echo -e "${YELLOW}Creating apps/web/.env.local from .env.example...${NC}"
  cp apps/web/.env.example apps/web/.env.local
fi

# Check JWT keys
if [ ! -f apps/api/keys/private.pem ] || [ ! -f apps/api/keys/public.pem ]; then
  echo -e "${YELLOW}Generating JWT keys...${NC}"
  mkdir -p apps/api/keys
  openssl genrsa -out apps/api/keys/private.pem 2048
  openssl rsa -in apps/api/keys/private.pem -pubout -out apps/api/keys/public.pem
  echo -e "${GREEN}${CHECK_MARK} JWT keys generated${NC}"
fi

echo -e "${GREEN}${CHECK_MARK} Environment configured${NC}\n"

# ================================
# Step 4: Install Dependencies
# ================================
echo -e "${BLUE}${GEAR} Step 4: Checking dependencies...${NC}"

if [ ! -d node_modules ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  pnpm install
else
  echo -e "${GREEN}${CHECK_MARK} Dependencies installed${NC}"
fi

echo ""

# ================================
# Step 5: Generate Prisma Clients
# ================================
echo -e "${BLUE}${GEAR} Step 5: Generating Prisma clients...${NC}"

cd apps/api
pnpm prisma:generate:main
pnpm prisma:generate:client
cd ../..

echo -e "${GREEN}${CHECK_MARK} Prisma clients generated${NC}\n"

# ================================
# Step 6: Run Migrations
# ================================
echo -e "${BLUE}${GEAR} Step 6: Running database migrations...${NC}"

cd apps/api

# Run migrations for main database
if pnpm prisma:migrate:deploy:main; then
  echo -e "${GREEN}${CHECK_MARK} Main database migrated${NC}"
else
  echo -e "${YELLOW}⚠️  Main database migration skipped or failed${NC}"
fi

# Run migrations for client database
if pnpm prisma:migrate:deploy:client; then
  echo -e "${GREEN}${CHECK_MARK} Client database migrated${NC}"
else
  echo -e "${YELLOW}⚠️  Client database migration skipped or failed${NC}"
fi

cd ../..

echo ""

# ================================
# Step 7: Build Packages
# ================================
echo -e "${BLUE}${GEAR} Step 7: Building packages...${NC}"

# Build types package (required by API and Web)
pnpm --filter @freetimechat/types build

echo -e "${GREEN}${CHECK_MARK} Packages built${NC}\n"

# ================================
# Step 8: Start Development Servers
# ================================
echo -e "${BLUE}${GEAR} Step 8: Starting development servers...${NC}\n"

# Parse arguments
FOREGROUND=false
if [[ "$1" == "--foreground" ]] || [[ "$1" == "-f" ]]; then
  FOREGROUND=true
fi

if [ "$FOREGROUND" = true ]; then
  echo -e "${YELLOW}Running in foreground mode (Ctrl+C to stop all)${NC}"
  echo ""

  # Run both servers in foreground using a trap to kill both on exit
  trap 'kill 0' EXIT

  # Start API in background
  (cd apps/api && pnpm dev) &
  API_PID=$!

  # Start Web in background
  (cd apps/web && pnpm dev) &
  WEB_PID=$!

  # Wait for both processes
  wait $API_PID $WEB_PID
else
  # Open new terminal windows for each service
  echo -e "${CYAN}Opening terminal windows...${NC}"

  # API Server
  osascript -e "tell application \"Terminal\"
    do script \"cd $(pwd)/apps/api && pnpm dev\"
  end tell"

  # Give API a moment to start
  sleep 2

  # Web Server
  osascript -e "tell application \"Terminal\"
    do script \"cd $(pwd)/apps/web && pnpm dev\"
  end tell"

  echo ""
  echo -e "${CYAN}====================================${NC}"
  echo -e "${GREEN}${ROCKET} Local Development Started!${NC}"
  echo -e "${CYAN}====================================${NC}"
  echo ""
  echo -e "${GREEN}Services:${NC}"
  echo -e "  • PostgreSQL: ${BLUE}localhost:5432${NC} (Docker)"
  echo -e "  • Redis: ${BLUE}localhost:6379${NC} (Docker)"
  echo -e "  • API: ${BLUE}http://localhost:3001${NC} (Local)"
  echo -e "  • Web: ${BLUE}http://localhost:3000${NC} (Local)"
  echo ""
  echo -e "${YELLOW}Development servers are running in separate terminal windows${NC}"
  echo ""
  echo -e "${CYAN}Useful commands:${NC}"
  echo -e "  • Stop databases: ${BLUE}docker-compose stop${NC}"
  echo -e "  • View DB logs: ${BLUE}docker-compose logs -f postgres${NC}"
  echo -e "  • Database shell: ${BLUE}docker-compose exec postgres psql -U freetimechat${NC}"
  echo -e "  • Restart API: Kill terminal and run: ${BLUE}cd apps/api && pnpm dev${NC}"
  echo -e "  • Restart Web: Kill terminal and run: ${BLUE}cd apps/web && pnpm dev${NC}"
  echo ""
fi
