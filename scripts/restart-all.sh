#!/bin/bash
# FreeTimeChat - Restart All Services
# Restarts all development services (database, cache, API, frontend)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔄 FreeTimeChat - Restart All Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# Navigate to project root
cd "$(dirname "$0")/.."

# ============================================================================
# Step 1: Stop Running Processes
# ============================================================================
echo -e "${YELLOW}🛑 Stopping running processes...${NC}"

# Stop API server (port 3000)
API_PID=$(lsof -ti:3000 || true)
if [ ! -z "$API_PID" ]; then
  echo -e "${YELLOW}  • Stopping API server (PID: $API_PID)${NC}"
  kill -9 $API_PID 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}  ✓ API server stopped${NC}"
else
  echo -e "${GREEN}  ✓ No API server running on port 3000${NC}"
fi

# Stop Web server (port 3001)
WEB_PID=$(lsof -ti:3001 || true)
if [ ! -z "$WEB_PID" ]; then
  echo -e "${YELLOW}  • Stopping Web server (PID: $WEB_PID)${NC}"
  kill -9 $WEB_PID 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}  ✓ Web server stopped${NC}"
else
  echo -e "${GREEN}  ✓ No Web server running on port 3001${NC}"
fi

# Stop Prisma Studio (port 5555)
PRISMA_PID=$(lsof -ti:5555 || true)
if [ ! -z "$PRISMA_PID" ]; then
  echo -e "${YELLOW}  • Stopping Prisma Studio (PID: $PRISMA_PID)${NC}"
  kill -9 $PRISMA_PID 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}  ✓ Prisma Studio stopped${NC}"
else
  echo -e "${GREEN}  ✓ No Prisma Studio running on port 5555${NC}"
fi

echo ""

# ============================================================================
# Step 2: Clear Caches
# ============================================================================
echo -e "${YELLOW}🧹 Clearing caches...${NC}"

# Clear ts-node cache
if [ -d "apps/api/.ts-node" ]; then
  rm -rf apps/api/.ts-node
  echo -e "${GREEN}  ✓ Cleared ts-node cache${NC}"
else
  echo -e "${GREEN}  ✓ No ts-node cache to clear${NC}"
fi

# Clear dist directory
if [ -d "apps/api/dist" ]; then
  rm -rf apps/api/dist
  echo -e "${GREEN}  ✓ Cleared dist directory${NC}"
else
  echo -e "${GREEN}  ✓ No dist directory to clear${NC}"
fi

# Clear Next.js cache
if [ -d "apps/web/.next" ]; then
  rm -rf apps/web/.next
  echo -e "${GREEN}  ✓ Cleared Next.js cache${NC}"
else
  echo -e "${GREEN}  ✓ No Next.js cache to clear${NC}"
fi

echo ""

# ============================================================================
# Step 3: Check Database Services
# ============================================================================
echo -e "${YELLOW}🗄️  Checking database services...${NC}"

# Check PostgreSQL
PG_STATUS=$(brew services list | grep postgresql@16 | awk '{print $2}')
if [ "$PG_STATUS" == "started" ]; then
  echo -e "${GREEN}  ✓ PostgreSQL is running${NC}"
else
  echo -e "${YELLOW}  • Starting PostgreSQL...${NC}"
  brew services start postgresql@16
  sleep 2
  echo -e "${GREEN}  ✓ PostgreSQL started${NC}"
fi

# Check Redis
REDIS_STATUS=$(brew services list | grep redis | awk '{print $2}')
if [ "$REDIS_STATUS" == "started" ]; then
  echo -e "${GREEN}  ✓ Redis is running${NC}"
else
  echo -e "${YELLOW}  • Starting Redis...${NC}"
  brew services start redis
  sleep 2
  echo -e "${GREEN}  ✓ Redis started${NC}"
fi

echo ""

# ============================================================================
# Step 4: Test Database Connectivity
# ============================================================================
echo -e "${YELLOW}🔍 Testing database connectivity...${NC}"

# Test PostgreSQL connection
if psql -U david -d freetimechat_main -c "SELECT 1" >/dev/null 2>&1; then
  echo -e "${GREEN}  ✓ PostgreSQL connection successful${NC}"
else
  echo -e "${RED}  ✗ PostgreSQL connection failed${NC}"
  echo -e "${YELLOW}    Run: psql -U david -d freetimechat_main${NC}"
fi

# Test Redis connection
if redis-cli ping >/dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Redis connection successful${NC}"
else
  echo -e "${RED}  ✗ Redis connection failed${NC}"
  echo -e "${YELLOW}    Run: redis-cli ping${NC}"
fi

echo ""

# ============================================================================
# Step 5: Start Development Servers
# ============================================================================
echo -e "${YELLOW}🚀 Starting development servers...${NC}"
echo -e "${CYAN}  This will open two new terminal windows${NC}"
echo ""

# Start API server in new terminal
osascript <<EOF
tell application "Terminal"
    do script "cd \"$(pwd)/apps/api\" && echo \"Starting API Server...\" && pnpm dev"
end tell
EOF

echo -e "${GREEN}  ✓ API server starting in new terminal${NC}"
sleep 2

# Start Web server in new terminal
osascript <<EOF
tell application "Terminal"
    do script "cd \"$(pwd)/apps/web\" && echo \"Starting Web Server...\" && pnpm dev"
end tell
EOF

echo -e "${GREEN}  ✓ Web server starting in new terminal${NC}"
sleep 2

# Start Prisma Studio in new terminal
osascript <<EOF
tell application "Terminal"
    do script "cd \"$(pwd)/apps/api\" && echo \"Starting Prisma Studio (Main DB)...\" && pnpm prisma:studio:main"
end tell
EOF

echo -e "${GREEN}  ✓ Prisma Studio starting in new terminal${NC}"

echo ""
echo -e "${GREEN}✨ All services restarted!${NC}"
echo ""

# Wait a moment for servers to start
echo -e "${CYAN}Waiting for servers to initialize...${NC}"
sleep 5

# ============================================================================
# Service Summary
# ============================================================================
echo ""
echo -e "${BLUE}${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 FreeTimeChat Services - Access Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo -e "${BOLD}🌐 Frontend (Next.js Web App)${NC}"
echo -e "   ${GREEN}URL:${NC}        http://localhost:3000"
echo -e "   ${GREEN}Location:${NC}   apps/web"
echo -e "   ${GREEN}Framework:${NC}  Next.js 16 (Turbopack)"
echo -e "   ${GREEN}Status:${NC}     Check the new terminal window"
echo ""

echo -e "${BOLD}🔧 Backend API (Express)${NC}"
echo -e "   ${GREEN}URL:${NC}        http://localhost:3000/api/v1"
echo -e "   ${GREEN}Health:${NC}     http://localhost:3000/api/v1/health"
echo -e "   ${GREEN}Location:${NC}   apps/api"
echo -e "   ${GREEN}Framework:${NC}  Express.js + TypeScript"
echo -e "   ${GREEN}Status:${NC}     Check the new terminal window"
echo ""

echo -e "${BOLD}🗄️  Database (PostgreSQL 16)${NC}"
echo -e "   ${GREEN}Host:${NC}       localhost"
echo -e "   ${GREEN}Port:${NC}       5432"
echo -e "   ${GREEN}User:${NC}       david"
echo -e "   ${GREEN}Main DB:${NC}    freetimechat_main"
echo -e "   ${GREEN}Client DB:${NC}  freetimechat_client_dev"
echo -e "   ${GREEN}Connect:${NC}    psql -U david -d freetimechat_main"
echo -e "   ${GREEN}Service:${NC}    brew services list | grep postgresql"
echo ""

echo -e "${BOLD}⚡ Cache (Redis)${NC}"
echo -e "   ${GREEN}Host:${NC}       localhost"
echo -e "   ${GREEN}Port:${NC}       6379"
echo -e "   ${GREEN}Password:${NC}   (none - local dev)"
echo -e "   ${GREEN}Connect:${NC}    redis-cli"
echo -e "   ${GREEN}Test:${NC}       redis-cli ping"
echo -e "   ${GREEN}Service:${NC}    brew services list | grep redis"
echo ""

echo -e "${BOLD}📦 Package Manager${NC}"
echo -e "   ${GREEN}Tool:${NC}       pnpm (v10.20.0)"
echo -e "   ${GREEN}Scripts:${NC}"
echo -e "      pnpm dev           - Start all services (Turbo)"
echo -e "      pnpm dev:web       - Start frontend only"
echo -e "      pnpm dev:api       - Start backend only"
echo -e "      pnpm restart:api   - Clear cache & restart API"
echo ""

echo -e "${BOLD}🛠️  Development Tools${NC}"
echo -e "   ${GREEN}Prisma Studio (Main DB):${NC}"
echo -e "      URL: http://localhost:5555"
echo -e "      Status: Check the Prisma Studio terminal window"
echo ""
echo -e "   ${GREEN}Prisma Studio (Client DB):${NC}"
echo -e "      cd apps/api && pnpm prisma:studio:client"
echo -e "      Opens at: http://localhost:5556"
echo ""

echo -e "${BOLD}🔗 Quick Links${NC}"
echo -e "   ${CYAN}Homepage:${NC}     http://localhost:3000"
echo -e "   ${CYAN}Login:${NC}        http://localhost:3000/login"
echo -e "   ${CYAN}Register:${NC}     http://localhost:3000/register"
echo -e "   ${CYAN}API Health:${NC}   http://localhost:3000/api/v1/health"
echo -e "   ${CYAN}API Docs:${NC}     http://localhost:3000/api/v1/docs (future)"
echo ""

echo -e "${BOLD}📝 Useful Commands${NC}"
echo -e "   ${YELLOW}View API logs:${NC}      Check the API terminal window"
echo -e "   ${YELLOW}View Web logs:${NC}      Check the Web terminal window"
echo -e "   ${YELLOW}Restart API:${NC}        pnpm restart:api"
echo -e "   ${YELLOW}Restart all:${NC}        ./scripts/restart-all.sh"
echo -e "   ${YELLOW}Stop services:${NC}      lsof -ti:3000,3001 | xargs kill -9"
echo -e "   ${YELLOW}Database backup:${NC}    pg_dump -U david freetimechat_main > backup.sql"
echo ""

echo -e "${BOLD}👤 Admin Credentials${NC}"
echo -e "   ${GREEN}Email:${NC}        admin@freetimechat.local"
echo -e "   ${GREEN}Password:${NC}     0pen@2025"
echo -e "   ${GREEN}Seed DB:${NC}      pnpm db:seed"
echo -e "   ${CYAN}📄 See CREDENTIALS.md for full details${NC}"
echo ""

echo -e "${BLUE}${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo -e "${GREEN}✅ All services are running!${NC}"
echo -e "${CYAN}Check the terminal windows for server logs${NC}"
echo ""
