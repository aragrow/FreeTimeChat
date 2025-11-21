#!/bin/bash

# ================================
# FreeTimeChat - Docker Clean Script
# ================================
# Cleans up Docker resources
# ================================

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
TRASH="🗑️"

echo -e "${CYAN}${TRASH} FreeTimeChat - Docker Clean${NC}"
echo -e "${CYAN}================================${NC}\n"

# Parse arguments
REMOVE_VOLUMES=false
REMOVE_IMAGES=false
REMOVE_ALL=false
PRUNE_SYSTEM=false

if [ $# -eq 0 ]; then
  echo -e "${YELLOW}No arguments provided. What would you like to clean?${NC}\n"
  echo "Options:"
  echo "  --containers     Stop and remove containers"
  echo "  --volumes        Remove volumes (WARNING: deletes all data)"
  echo "  --images         Remove FreeTimeChat Docker images"
  echo "  --all            Remove everything (containers + volumes + images)"
  echo "  --prune          Prune unused Docker resources system-wide"
  echo ""
  read -p "Enter option (or 'exit' to cancel): " CHOICE

  case $CHOICE in
    --containers)
      ;;
    --volumes)
      REMOVE_VOLUMES=true
      ;;
    --images)
      REMOVE_IMAGES=true
      ;;
    --all)
      REMOVE_ALL=true
      REMOVE_VOLUMES=true
      REMOVE_IMAGES=true
      ;;
    --prune)
      PRUNE_SYSTEM=true
      ;;
    exit)
      echo -e "${YELLOW}Cancelled${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid option${NC}"
      exit 1
      ;;
  esac
else
  while [[ $# -gt 0 ]]; do
    case $1 in
      --containers)
        shift
        ;;
      --volumes)
        REMOVE_VOLUMES=true
        shift
        ;;
      --images)
        REMOVE_IMAGES=true
        shift
        ;;
      --all)
        REMOVE_ALL=true
        REMOVE_VOLUMES=true
        REMOVE_IMAGES=true
        shift
        ;;
      --prune)
        PRUNE_SYSTEM=true
        shift
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo "Usage: $0 [--containers] [--volumes] [--images] [--all] [--prune]"
        exit 1
        ;;
    esac
  done
fi

# ================================
# Stop and Remove Containers
# ================================
echo -e "${BLUE}Stopping containers...${NC}"

# Stop dev containers
if docker compose ps -q > /dev/null 2>&1; then
  docker compose down
  echo -e "${GREEN}${CHECK_MARK} Dev containers stopped${NC}"
else
  echo -e "${YELLOW}No dev containers running${NC}"
fi

# Stop production containers
if docker compose -f docker-compose.prod.yml ps -q > /dev/null 2>&1; then
  docker compose -f docker-compose.prod.yml down
  echo -e "${GREEN}${CHECK_MARK} Production containers stopped${NC}"
else
  echo -e "${YELLOW}No production containers running${NC}"
fi

echo ""

# ================================
# Remove Volumes
# ================================
if [ "$REMOVE_VOLUMES" = true ]; then
  echo -e "${RED}⚠️  WARNING: This will delete ALL database data!${NC}"
  read -p "Are you sure? Type 'yes' to confirm: " CONFIRM

  if [ "$CONFIRM" = "yes" ]; then
    echo -e "${BLUE}Removing volumes...${NC}"

    # Remove dev volumes
    docker compose down -v 2>/dev/null

    # Remove production volumes
    docker compose -f docker-compose.prod.yml down -v 2>/dev/null

    # Remove named volumes
    docker volume rm freetimechat_postgres_data 2>/dev/null || true
    docker volume rm freetimechat_redis_data 2>/dev/null || true
    docker volume rm freetimechat_api_logs 2>/dev/null || true

    echo -e "${GREEN}${CHECK_MARK} Volumes removed${NC}"
  else
    echo -e "${YELLOW}Volume removal cancelled${NC}"
  fi
  echo ""
fi

# ================================
# Remove Images
# ================================
if [ "$REMOVE_IMAGES" = true ]; then
  echo -e "${BLUE}Removing FreeTimeChat images...${NC}"

  # Remove API images
  docker images | grep freetimechat-api | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

  # Remove Web images
  docker images | grep freetimechat-web | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

  echo -e "${GREEN}${CHECK_MARK} Images removed${NC}"
  echo ""
fi

# ================================
# System Prune
# ================================
if [ "$PRUNE_SYSTEM" = true ]; then
  echo -e "${BLUE}Pruning Docker system...${NC}"
  echo -e "${YELLOW}This will remove:${NC}"
  echo "  - All stopped containers"
  echo "  - All networks not used by at least one container"
  echo "  - All dangling images"
  echo "  - All build cache"
  echo ""

  read -p "Continue? (y/n): " CONFIRM
  if [ "$CONFIRM" = "y" ]; then
    docker system prune -af
    echo -e "${GREEN}${CHECK_MARK} System pruned${NC}"
  else
    echo -e "${YELLOW}System prune cancelled${NC}"
  fi
  echo ""
fi

# ================================
# Summary
# ================================
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}${TRASH} Cleanup Complete!${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Show remaining resources
echo -e "${CYAN}Remaining Docker resources:${NC}"
echo ""

echo -e "${YELLOW}Containers:${NC}"
docker ps -a --filter "name=freetimechat" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "None"
echo ""

echo -e "${YELLOW}Images:${NC}"
docker images | grep freetimechat || echo "None"
echo ""

echo -e "${YELLOW}Volumes:${NC}"
docker volume ls | grep freetimechat || echo "None"
echo ""

echo -e "${CYAN}To start fresh:${NC}"
echo -e "  • Local dev: ${BLUE}./scripts/local-dev.sh${NC}"
echo -e "  • Production: ${BLUE}./scripts/docker-prod.sh${NC}"
echo -e "  • Build images: ${BLUE}./scripts/docker-build.sh${NC}"
echo ""
