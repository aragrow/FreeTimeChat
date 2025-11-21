#!/bin/bash

# ================================
# FreeTimeChat - Test, Build & Docker Script
# ================================
# This script:
# 1. Restarts database servers if not active
# 2. Runs the complete test suite
# 3. Builds the entire project
# 4. Creates Docker images for API and Web
# ================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji for better visuals
CHECK_MARK="✅"
CROSS_MARK="❌"
ROCKET="🚀"
GEAR="⚙️"
TEST="🧪"
BUILD="🏗️"
DOCKER="🐳"

echo -e "${CYAN}${ROCKET} FreeTimeChat - Test, Build & Docker Script${NC}"
echo -e "${CYAN}=================================================${NC}\n"

# ================================
# Step 1: Check and Restart Servers
# ================================
echo -e "${BLUE}${GEAR} Step 1: Checking Database Servers...${NC}"

# Function to check if port is in use
check_port() {
  lsof -i :$1 > /dev/null 2>&1
  return $?
}

# Function to kill process on port
kill_port() {
  echo -e "${YELLOW}Killing process on port $1...${NC}"
  lsof -ti:$1 | xargs kill -9 2>/dev/null || true
  sleep 1
}

# Check PostgreSQL (port 5432)
if ! check_port 5432; then
  echo -e "${YELLOW}PostgreSQL not running. Starting Docker Compose...${NC}"
  docker-compose up -d postgres redis
  echo -e "${GREEN}Waiting for PostgreSQL to be ready...${NC}"
  sleep 5
else
  echo -e "${GREEN}${CHECK_MARK} PostgreSQL is running${NC}"
fi

# Check Redis (port 6379)
if ! check_port 6379; then
  echo -e "${YELLOW}Redis not running. Starting Docker Compose...${NC}"
  docker-compose up -d redis
  echo -e "${GREEN}Waiting for Redis to be ready...${NC}"
  sleep 3
else
  echo -e "${GREEN}${CHECK_MARK} Redis is running${NC}"
fi

# Wait for PostgreSQL to be fully ready
echo -e "${YELLOW}Verifying PostgreSQL health...${NC}"
max_attempts=30
attempt=0
while ! docker-compose exec -T postgres pg_isready -U freetimechat > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}${CROSS_MARK} PostgreSQL failed to start after 30 seconds${NC}"
    exit 1
  fi
  echo -e "${YELLOW}Waiting for PostgreSQL... ($attempt/$max_attempts)${NC}"
  sleep 1
done

echo -e "${GREEN}${CHECK_MARK} PostgreSQL is healthy${NC}"

# Verify Redis
if docker-compose exec -T redis redis-cli --raw incr ping > /dev/null 2>&1; then
  echo -e "${GREEN}${CHECK_MARK} Redis is healthy${NC}"
else
  echo -e "${RED}${CROSS_MARK} Redis is not responding${NC}"
  exit 1
fi

echo ""

# ================================
# Step 2: Run Test Suite
# ================================
echo -e "${BLUE}${TEST} Step 2: Running Test Suite...${NC}"

# Kill any processes that might interfere with tests
kill_port 3000 || true
kill_port 3001 || true

# Track test results
API_TEST_RESULT=0
WEB_TEST_RESULT=0

# Run API tests
echo -e "${CYAN}Running API tests...${NC}"
if pnpm --filter @freetimechat/api test; then
  echo -e "${GREEN}${CHECK_MARK} API tests passed${NC}"
else
  echo -e "${RED}${CROSS_MARK} API tests failed${NC}"
  API_TEST_RESULT=1
fi

echo ""

# Run Web tests (always run, even if API tests failed)
echo -e "${CYAN}Running Web tests...${NC}"
if pnpm --filter @freetimechat/web test; then
  echo -e "${GREEN}${CHECK_MARK} Web tests passed${NC}"
else
  echo -e "${RED}${CROSS_MARK} Web tests failed${NC}"
  WEB_TEST_RESULT=1
fi

echo ""

# Check if any tests failed
if [ $API_TEST_RESULT -ne 0 ] || [ $WEB_TEST_RESULT -ne 0 ]; then
  echo -e "${RED}${CROSS_MARK} Test suite failed!${NC}"
  echo ""
  echo -e "${YELLOW}Test Results Summary:${NC}"
  if [ $API_TEST_RESULT -ne 0 ]; then
    echo -e "  ${RED}${CROSS_MARK} API tests: FAILED${NC}"
  else
    echo -e "  ${GREEN}${CHECK_MARK} API tests: PASSED${NC}"
  fi
  if [ $WEB_TEST_RESULT -ne 0 ]; then
    echo -e "  ${RED}${CROSS_MARK} Web tests: FAILED${NC}"
  else
    echo -e "  ${GREEN}${CHECK_MARK} Web tests: PASSED${NC}"
  fi
  echo ""
  echo -e "${RED}Aborting build and Docker image creation.${NC}"
  echo -e "${YELLOW}Fix the failing tests and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}${CHECK_MARK} All tests passed!${NC}"
echo ""

# ================================
# Step 3: Build Project
# ================================
echo -e "${BLUE}${BUILD} Step 3: Building Project...${NC}"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf apps/api/dist
rm -rf apps/web/.next
rm -rf packages/types/dist

# Build with Turbo
echo -e "${CYAN}Building all packages...${NC}"
if pnpm build; then
  echo -e "${GREEN}${CHECK_MARK} Project built successfully${NC}"
else
  echo -e "${RED}${CROSS_MARK} Build failed${NC}"
  exit 1
fi

echo ""

# ================================
# Step 4: Build Docker Images
# ================================
echo -e "${BLUE}${DOCKER} Step 4: Building Docker Images...${NC}"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${CYAN}Building images with version: ${VERSION}${NC}"

# Build API image
echo -e "${YELLOW}Building API Docker image...${NC}"
if docker build -f apps/api/Dockerfile -t freetimechat-api:latest -t freetimechat-api:${VERSION} .; then
  echo -e "${GREEN}${CHECK_MARK} API image built successfully${NC}"
  API_SIZE=$(docker images freetimechat-api:latest --format "{{.Size}}")
  echo -e "${CYAN}   Image size: ${API_SIZE}${NC}"
else
  echo -e "${RED}${CROSS_MARK} API image build failed${NC}"
  exit 1
fi

echo ""

# Build Web image
echo -e "${YELLOW}Building Web Docker image...${NC}"
if docker build -f apps/web/Dockerfile -t freetimechat-web:latest -t freetimechat-web:${VERSION} .; then
  echo -e "${GREEN}${CHECK_MARK} Web image built successfully${NC}"
  WEB_SIZE=$(docker images freetimechat-web:latest --format "{{.Size}}")
  echo -e "${CYAN}   Image size: ${WEB_SIZE}${NC}"
else
  echo -e "${RED}${CROSS_MARK} Web image build failed${NC}"
  exit 1
fi

echo ""

# ================================
# Summary
# ================================
echo -e "${CYAN}=================================================${NC}"
echo -e "${GREEN}${ROCKET} Build Complete!${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo -e "${GREEN}${CHECK_MARK} Database servers: Running${NC}"
echo -e "${GREEN}${CHECK_MARK} Test suite: Passed${NC}"
echo -e "${GREEN}${CHECK_MARK} Project build: Successful${NC}"
echo -e "${GREEN}${CHECK_MARK} Docker images: Built${NC}"
echo ""
echo -e "${CYAN}Docker Images Created:${NC}"
echo -e "  • freetimechat-api:${VERSION} (${API_SIZE})"
echo -e "  • freetimechat-api:latest (${API_SIZE})"
echo -e "  • freetimechat-web:${VERSION} (${WEB_SIZE})"
echo -e "  • freetimechat-web:latest (${WEB_SIZE})"
echo ""
echo -e "${CYAN}Database Images (from Docker Hub):${NC}"
echo -e "  • postgres:16-alpine"
echo -e "  • redis:7-alpine"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  • Run production stack: ${BLUE}./scripts/docker-prod.sh${NC}"
echo -e "  • View images: ${BLUE}docker images | grep freetimechat${NC}"
echo -e "  • Clean up: ${BLUE}./scripts/docker-clean.sh${NC}"
echo ""
