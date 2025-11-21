#!/bin/bash

# ================================
# FreeTimeChat - Production Docker Script
# ================================
# Runs the full production stack with Docker
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
DOCKER="🐳"

echo -e "${CYAN}${DOCKER} FreeTimeChat - Production Docker${NC}"
echo -e "${CYAN}====================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.docker...${NC}"
  cp .env.docker .env
  echo -e "${YELLOW}⚠️  Please update .env with your production credentials!${NC}"
  echo -e "${YELLOW}   Especially: POSTGRES_PASSWORD, REDIS_PASSWORD, SESSION_SECRET${NC}"
  echo ""
  read -p "Press enter to continue or Ctrl+C to abort..."
fi

# Check if JWT keys exist
if [ ! -f apps/api/keys/private.pem ] || [ ! -f apps/api/keys/public.pem ]; then
  echo -e "${YELLOW}JWT keys not found. Generating RSA key pair...${NC}"
  mkdir -p apps/api/keys
  openssl genrsa -out apps/api/keys/private.pem 2048
  openssl rsa -in apps/api/keys/private.pem -pubout -out apps/api/keys/public.pem
  echo -e "${GREEN}${CHECK_MARK} JWT keys generated${NC}"
  echo ""
fi

# Check if Docker images exist
if ! docker images | grep -q "freetimechat-api"; then
  echo -e "${YELLOW}Docker images not found. Building...${NC}"
  ./scripts/docker-build.sh
  echo ""
fi

# Parse arguments
ACTION="up"
DETACH="-d"

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      echo -e "${YELLOW}Rebuilding images...${NC}"
      ./scripts/docker-build.sh
      shift
      ;;
    --logs)
      ACTION="logs"
      DETACH="-f"
      shift
      ;;
    --down)
      ACTION="down"
      shift
      ;;
    --restart)
      ACTION="restart"
      shift
      ;;
    --foreground|-f)
      DETACH=""
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--build] [--logs] [--down] [--restart] [--foreground]"
      exit 1
      ;;
  esac
done

# ================================
# Execute Action
# ================================

if [ "$ACTION" == "down" ]; then
  echo -e "${BLUE}Stopping production stack...${NC}"
  docker compose -f docker-compose.prod.yml down
  echo -e "${GREEN}${CHECK_MARK} Production stack stopped${NC}"
  exit 0
fi

if [ "$ACTION" == "restart" ]; then
  echo -e "${BLUE}Restarting production stack...${NC}"
  docker compose -f docker-compose.prod.yml restart
  echo -e "${GREEN}${CHECK_MARK} Production stack restarted${NC}"
  exit 0
fi

if [ "$ACTION" == "logs" ]; then
  echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}"
  docker compose -f docker-compose.prod.yml logs -f
  exit 0
fi

# Start the stack
echo -e "${BLUE}Starting production stack...${NC}"

if [ -z "$DETACH" ]; then
  echo -e "${YELLOW}Running in foreground mode (Ctrl+C to stop)${NC}"
fi

docker compose -f docker-compose.prod.yml up $DETACH

if [ -n "$DETACH" ]; then
  echo ""
  echo -e "${GREEN}${CHECK_MARK} Production stack started${NC}"
  echo ""

  # Wait for services to be healthy
  echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
  sleep 10

  # Check service health
  echo -e "${CYAN}Service Status:${NC}"

  # Check PostgreSQL
  if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U freetimechat > /dev/null 2>&1; then
    echo -e "  ${GREEN}${CHECK_MARK} PostgreSQL: Healthy${NC}"
  else
    echo -e "  ${RED}${CROSS_MARK} PostgreSQL: Unhealthy${NC}"
  fi

  # Check Redis
  if docker compose -f docker-compose.prod.yml exec -T redis redis-cli --raw incr ping > /dev/null 2>&1; then
    echo -e "  ${GREEN}${CHECK_MARK} Redis: Healthy${NC}"
  else
    echo -e "  ${RED}${CROSS_MARK} Redis: Unhealthy${NC}"
  fi

  # Check API
  sleep 5  # Give API more time to start
  if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}${CHECK_MARK} API: Healthy${NC}"
  else
    echo -e "  ${YELLOW}⚠️  API: Starting (may take a moment)${NC}"
  fi

  # Check Web
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}${CHECK_MARK} Web: Healthy${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Web: Starting (may take a moment)${NC}"
  fi

  echo ""
  echo -e "${CYAN}====================================${NC}"
  echo -e "${GREEN}${ROCKET} Production Stack Running!${NC}"
  echo -e "${CYAN}====================================${NC}"
  echo ""
  echo -e "${GREEN}Services:${NC}"
  echo -e "  • PostgreSQL: ${BLUE}localhost:5432${NC}"
  echo -e "  • Redis: ${BLUE}localhost:6379${NC}"
  echo -e "  • API: ${BLUE}http://localhost:3001${NC}"
  echo -e "  • Web: ${BLUE}http://localhost:3000${NC}"
  echo ""
  echo -e "${YELLOW}Useful commands:${NC}"
  echo -e "  • View logs: ${BLUE}./scripts/docker-prod.sh --logs${NC}"
  echo -e "  • View logs (compose): ${BLUE}docker compose -f docker-compose.prod.yml logs -f${NC}"
  echo -e "  • Stop stack: ${BLUE}./scripts/docker-prod.sh --down${NC}"
  echo -e "  • Restart stack: ${BLUE}./scripts/docker-prod.sh --restart${NC}"
  echo -e "  • View containers: ${BLUE}docker ps${NC}"
  echo -e "  • API shell: ${BLUE}docker exec -it freetimechat-api-prod sh${NC}"
  echo -e "  • Web shell: ${BLUE}docker exec -it freetimechat-web-prod sh${NC}"
  echo -e "  • Database shell: ${BLUE}docker exec -it freetimechat-postgres-prod psql -U freetimechat${NC}"
  echo ""
fi
