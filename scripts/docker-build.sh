#!/bin/bash

# ================================
# FreeTimeChat - Docker Build Script
# ================================
# Builds Docker images for API and Web
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
DOCKER="🐳"

echo -e "${CYAN}${DOCKER} FreeTimeChat - Docker Build${NC}"
echo -e "${CYAN}================================${NC}\n"

# Parse arguments
NO_CACHE=""
PLATFORM=""
VERSION=$(node -p "require('./package.json').version")

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --platform)
      PLATFORM="--platform $2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--no-cache] [--platform linux/amd64] [--version X.Y.Z]"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}Building images with version: ${VERSION}${NC}"
if [ -n "$NO_CACHE" ]; then
  echo -e "${YELLOW}Building without cache${NC}"
fi
if [ -n "$PLATFORM" ]; then
  echo -e "${YELLOW}Building for platform: ${PLATFORM#--platform }${NC}"
fi
echo ""

# ================================
# Build API Image
# ================================
echo -e "${BLUE}Building API Docker image...${NC}"
START_TIME=$(date +%s)

if docker build \
  $NO_CACHE \
  $PLATFORM \
  -f apps/api/Dockerfile \
  -t freetimechat-api:latest \
  -t freetimechat-api:${VERSION} \
  .; then

  END_TIME=$(date +%s)
  BUILD_TIME=$((END_TIME - START_TIME))
  API_SIZE=$(docker images freetimechat-api:latest --format "{{.Size}}")

  echo -e "${GREEN}${CHECK_MARK} API image built successfully${NC}"
  echo -e "${CYAN}   Build time: ${BUILD_TIME}s${NC}"
  echo -e "${CYAN}   Image size: ${API_SIZE}${NC}"
  echo -e "${CYAN}   Tags: freetimechat-api:latest, freetimechat-api:${VERSION}${NC}"
else
  echo -e "${RED}${CROSS_MARK} API image build failed${NC}"
  exit 1
fi

echo ""

# ================================
# Build Web Image
# ================================
echo -e "${BLUE}Building Web Docker image...${NC}"
START_TIME=$(date +%s)

if docker build \
  $NO_CACHE \
  $PLATFORM \
  -f apps/web/Dockerfile \
  -t freetimechat-web:latest \
  -t freetimechat-web:${VERSION} \
  .; then

  END_TIME=$(date +%s)
  BUILD_TIME=$((END_TIME - START_TIME))
  WEB_SIZE=$(docker images freetimechat-web:latest --format "{{.Size}}")

  echo -e "${GREEN}${CHECK_MARK} Web image built successfully${NC}"
  echo -e "${CYAN}   Build time: ${BUILD_TIME}s${NC}"
  echo -e "${CYAN}   Image size: ${WEB_SIZE}${NC}"
  echo -e "${CYAN}   Tags: freetimechat-web:latest, freetimechat-web:${VERSION}${NC}"
else
  echo -e "${RED}${CROSS_MARK} Web image build failed${NC}"
  exit 1
fi

echo ""

# ================================
# Summary
# ================================
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}${DOCKER} Docker Build Complete!${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo -e "${GREEN}Images created:${NC}"
echo -e "  • freetimechat-api:${VERSION} (${API_SIZE})"
echo -e "  • freetimechat-api:latest (${API_SIZE})"
echo -e "  • freetimechat-web:${VERSION} (${WEB_SIZE})"
echo -e "  • freetimechat-web:latest (${WEB_SIZE})"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  • View images: ${BLUE}docker images | grep freetimechat${NC}"
echo -e "  • Run production: ${BLUE}./scripts/docker-prod.sh${NC}"
echo -e "  • Push to registry: ${BLUE}docker push freetimechat-api:${VERSION}${NC}"
echo ""
