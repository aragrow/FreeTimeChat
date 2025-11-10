#!/bin/bash

# Restart Development Servers Script
# Kills existing dev servers and Prisma Studio, then restarts everything

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default tenant database URL (ARAGROW-LLC)
DEFAULT_TENANT_DB_URL="postgresql://david@localhost:5432/freetimechat_customer_22d1fe9f_b025_4ce1_ba7c_5d53aecc3762"

echo -e "${BLUE}🔄 Restarting FreeTimeChat Development Environment${NC}\n"

# Step 1: Kill existing processes
echo -e "${YELLOW}⏹  Stopping existing processes...${NC}"

# Kill Prisma Studio
pkill -f "prisma studio" 2>/dev/null && echo -e "${GREEN}  ✓ Killed Prisma Studio${NC}" || echo -e "${YELLOW}  ℹ  No Prisma Studio processes found${NC}"

# Kill Next.js dev servers
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}  ✓ Killed Next.js dev servers${NC}" || echo -e "${YELLOW}  ℹ  No Next.js processes found${NC}"

# Kill nodemon/tsx processes
pkill -f "nodemon" 2>/dev/null && echo -e "${GREEN}  ✓ Killed nodemon${NC}" || echo -e "${YELLOW}  ℹ  No nodemon processes found${NC}"
pkill -f "tsx" 2>/dev/null && echo -e "${GREEN}  ✓ Killed tsx${NC}" || echo -e "${YELLOW}  ℹ  No tsx processes found${NC}"

# Kill any pnpm processes that might be hanging
pkill -f "pnpm dev" 2>/dev/null && echo -e "${GREEN}  ✓ Killed pnpm dev processes${NC}" || echo -e "${YELLOW}  ℹ  No pnpm dev processes found${NC}"

# Kill Mailpit
pkill -f "mailpit" 2>/dev/null && echo -e "${GREEN}  ✓ Killed Mailpit${NC}" || echo -e "${YELLOW}  ℹ  No Mailpit processes found${NC}"

# Wait a moment for processes to fully terminate
sleep 2

echo ""

# Step 2: Clean up ports if needed
echo -e "${YELLOW}🔍 Checking ports...${NC}"

check_port() {
  local port=$1
  local name=$2
  if lsof -ti:$port >/dev/null 2>&1; then
    echo -e "${RED}  ⚠  Port $port ($name) is still in use, force killing...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "${GREEN}  ✓ Port $port ($name) is available${NC}"
  fi
}

check_port 3001 "API"
check_port 3000 "Web"
check_port 5555 "Prisma Studio (Main)"
check_port 5556 "Prisma Studio (Tenant)"
check_port 8025 "Mailpit Web UI"
check_port 1025 "Mailpit SMTP"

echo ""

# Step 3: Start development servers
echo -e "${BLUE}🚀 Starting development servers...${NC}"

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Start Mailpit in background
echo -e "${YELLOW}  Starting Mailpit (SMTP: 1025, Web UI: 8025)...${NC}"
mailpit > /tmp/mailpit.log 2>&1 &
MAILPIT_PID=$!
echo -e "${GREEN}  ✓ Mailpit started (PID: $MAILPIT_PID)${NC}"

# Start API server in background
echo -e "${YELLOW}  Starting API server (port 3001)...${NC}"
cd "$PROJECT_ROOT/apps/api"
pnpm dev > /tmp/freetimechat-api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}  ✓ API server started (PID: $API_PID)${NC}"

# Start Web server in background
echo -e "${YELLOW}  Starting Web server (port 3000)...${NC}"
cd "$PROJECT_ROOT/apps/web"
pnpm dev > /tmp/freetimechat-web.log 2>&1 &
WEB_PID=$!
echo -e "${GREEN}  ✓ Web server started (PID: $WEB_PID)${NC}"

echo ""

# Step 4: Wait for servers to start
echo -e "${YELLOW}⏳ Waiting for servers to start...${NC}"
sleep 5

# Check if API is responding
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
  echo -e "${GREEN}  ✓ API server is responding${NC}"
else
  echo -e "${RED}  ⚠  API server might not be ready yet (check logs: tail -f /tmp/freetimechat-api.log)${NC}"
fi

# Check if Web is responding
if curl -s http://localhost:3000 >/dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Web server is responding${NC}"
else
  echo -e "${RED}  ⚠  Web server might not be ready yet (check logs: tail -f /tmp/freetimechat-web.log)${NC}"
fi

echo ""

# Step 5: Start Prisma Studio (both main and tenant databases)
echo -e "${BLUE}🔧 Starting Prisma Studio...${NC}"

# Start Main database Prisma Studio
echo -e "${YELLOW}  Starting Prisma Studio for Main database...${NC}"
cd "$PROJECT_ROOT/apps/api"
npx prisma studio --schema=prisma/schema-main.prisma --port 5555 > /tmp/prisma-studio-main.log 2>&1 &
echo -e "${GREEN}  ✓ Main DB Prisma Studio: http://localhost:5555${NC}"

# Start Tenant database Prisma Studio (ARAGROW-LLC)
echo -e "${YELLOW}  Starting Prisma Studio for Tenant database (ARAGROW-LLC)...${NC}"
CLIENT_DATABASE_URL="$DEFAULT_TENANT_DB_URL" npx prisma studio --schema=prisma/schema-client.prisma --port 5556 > /tmp/prisma-studio-tenant.log 2>&1 &
echo -e "${GREEN}  ✓ Tenant DB Prisma Studio: http://localhost:5556${NC}"

echo ""
echo -e "${GREEN}✅ Development environment restarted!${NC}\n"
echo -e "${BLUE}📋 Services Running:${NC}\n"

# Print table header
printf "  ${GREEN}%-15s %-30s %-50s${NC}\n" "Service" "URL" "Purpose"
printf "  ${YELLOW}%-15s %-30s %-50s${NC}\n" "───────────────" "──────────────────────────────" "──────────────────────────────────────────────────"

# Print table rows
printf "  %-15s ${BLUE}%-30s${NC} %-50s\n" "API" "http://localhost:3001" "Backend API"
printf "  %-15s ${BLUE}%-30s${NC} %-50s\n" "Web" "http://localhost:3000" "Next.js Frontend"
printf "  %-15s ${BLUE}%-30s${NC} %-50s\n" "Mailpit" "http://localhost:8025" "Email testing (SMTP: 1025)"
printf "  %-15s ${BLUE}%-30s${NC} %-50s\n" "Prisma Main" "http://localhost:5555" "Browse main DB (users, tenants, roles)"
printf "  %-15s ${BLUE}%-30s${NC} %-50s\n" "Prisma Tenant" "http://localhost:5556" "Browse ARAGROW-LLC DB (clients, projects, time entries)"

echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "  ${GREEN}•${NC} API:     tail -f /tmp/freetimechat-api.log"
echo -e "  ${GREEN}•${NC} Web:     tail -f /tmp/freetimechat-web.log"
echo -e "  ${GREEN}•${NC} Mailpit: tail -f /tmp/mailpit.log"
echo -e "  ${GREEN}•${NC} Prisma:  tail -f /tmp/prisma-studio-main.log"
echo -e "  ${GREEN}•${NC} Prisma:  tail -f /tmp/prisma-studio-tenant.log"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo -e "  ${GREEN}•${NC} Stop all: pkill -f 'next dev|nodemon|prisma studio|mailpit'"
echo -e "  ${GREEN}•${NC} Change tenant: Edit DEFAULT_TENANT_DB_URL in this script"
echo ""
echo -e "${GREEN}🚀 Now you can restart your entire development environment with one command!${NC}"
echo ""
