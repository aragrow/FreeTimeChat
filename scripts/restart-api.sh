#!/bin/bash
# FreeTimeChat API Restart Script
# Clears ts-node cache and restarts the API development server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting FreeTimeChat API...${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Step 1: Clear ts-node cache
echo -e "${YELLOW}🧹 Clearing ts-node cache...${NC}"
if [ -d "apps/api/.ts-node" ]; then
  rm -rf apps/api/.ts-node
  echo -e "${GREEN}✓ Cleared .ts-node cache${NC}"
else
  echo -e "${GREEN}✓ No .ts-node cache to clear${NC}"
fi

# Step 2: Clear dist directory
echo -e "${YELLOW}🧹 Clearing dist directory...${NC}"
if [ -d "apps/api/dist" ]; then
  rm -rf apps/api/dist
  echo -e "${GREEN}✓ Cleared dist directory${NC}"
else
  echo -e "${GREEN}✓ No dist directory to clear${NC}"
fi

# Step 3: Kill existing API server process (if any)
echo -e "${YELLOW}🛑 Checking for existing API server process...${NC}"
API_PID=$(lsof -ti:3000 || true)
if [ ! -z "$API_PID" ]; then
  echo -e "${YELLOW}Found process on port 3000 (PID: $API_PID), killing it...${NC}"
  kill -9 $API_PID 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}✓ Killed existing process${NC}"
else
  echo -e "${GREEN}✓ No existing process on port 3000${NC}"
fi

echo ""
echo -e "${GREEN}✨ Cache cleared! Starting API server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 4: Start the API server
cd apps/api
pnpm dev
