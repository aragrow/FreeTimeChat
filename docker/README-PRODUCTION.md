# FreeTimeChat - Production Docker Setup

Complete guide for deploying FreeTimeChat with Docker in production.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Building Images](#building-images)
- [Running Production Stack](#running-production-stack)
- [Database Management](#database-management)
- [Monitoring & Logs](#monitoring--logs)
- [Scaling](#scaling)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Deployment Guides](#deployment-guides)

## Overview

FreeTimeChat uses a multi-container Docker architecture for production
deployment:

- **PostgreSQL 16** - Multi-tenant database (main + client databases)
- **Redis 7** - Caching and session storage
- **API Backend** - Express.js with TypeScript
- **Web Frontend** - Next.js 16 with React 19

All services communicate via a Docker network and use health checks for
reliability.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Internet                        │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │   Reverse Proxy       │
         │   (nginx/traefik)     │
         └───────┬───────┬───────┘
                 │       │
         ┌───────┘       └───────┐
         │                       │
    ┌────▼────┐            ┌────▼────┐
    │   Web   │            │   API   │
    │  :3000  │───────────▶│  :3001  │
    └─────────┘            └────┬────┘
                                │
                      ┌─────────┴─────────┐
                      │                   │
                 ┌────▼────┐         ┌───▼────┐
                 │ Postgres│         │ Redis  │
                 │  :5432  │         │ :6379  │
                 └─────────┘         └────────┘
```

### Network Communication

- `web:3000` → `api:3001` (internal Docker network)
- `api:3001` → `postgres:5432` (internal)
- `api:3001` → `redis:6379` (internal)
- External access via port mapping (configurable)

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM available
- 10GB+ disk space

### System Requirements

**Minimum:**

- 2 CPU cores
- 2GB RAM
- 10GB storage

**Recommended:**

- 4+ CPU cores
- 4GB+ RAM
- 50GB+ storage (for multi-tenant databases)

## Quick Start

### 1. Test, Build & Deploy

Run the complete automated workflow:

```bash
# This script does everything:
# - Restarts servers if needed
# - Runs all tests
# - Builds the project
# - Creates Docker images
./scripts/test-build-docker.sh
```

### 2. Configure Environment

```bash
# Copy Docker environment template
cp .env.docker .env

# Edit with your production credentials
nano .env
```

**IMPORTANT:** Update these values:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### 3. Generate JWT Keys

```bash
# Create RSA key pair for JWT
mkdir -p apps/api/keys
openssl genrsa -out apps/api/keys/private.pem 2048
openssl rsa -in apps/api/keys/private.pem -pubout -out apps/api/keys/public.pem
chmod 600 apps/api/keys/private.pem
```

### 4. Start Production Stack

```bash
# Start all services
./scripts/docker-prod.sh

# Or manually with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check service health
curl http://localhost:3001/api/v1/health  # API
curl http://localhost:3000/api/health      # Web

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Environment Configuration

### Required Variables

| Variable               | Description            | Example                   |
| ---------------------- | ---------------------- | ------------------------- |
| `POSTGRES_PASSWORD`    | Database password      | `secure_password_here`    |
| `REDIS_PASSWORD`       | Redis password         | `redis_secure_pass`       |
| `SESSION_SECRET`       | Session encryption key | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID | From Google Console       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret    | From Google Console       |

### Optional Variables

| Variable        | Description          | Default                 |
| --------------- | -------------------- | ----------------------- |
| `API_PORT`      | API external port    | `3001`                  |
| `WEB_PORT`      | Web external port    | `3000`                  |
| `POSTGRES_PORT` | Database port        | `5432`                  |
| `REDIS_PORT`    | Redis port           | `6379`                  |
| `CORS_ORIGIN`   | Allowed CORS origins | `http://localhost:3000` |

### Production URLs

For production deployment, update these in `.env`:

```bash
# Production API URL (your domain)
API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Production Web URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# CORS (allow your frontend domain)
CORS_ORIGIN=https://yourdomain.com

# Google OAuth callback
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
```

## Building Images

### Build All Images

```bash
# Build with default settings
./scripts/docker-build.sh

# Build without cache (clean build)
./scripts/docker-build.sh --no-cache

# Build for specific platform
./scripts/docker-build.sh --platform linux/amd64

# Build with custom version
./scripts/docker-build.sh --version 2.0.0
```

### Build Individual Images

```bash
# API only
docker build -f apps/api/Dockerfile -t freetimechat-api:latest .

# Web only
docker build -f apps/web/Dockerfile -t freetimechat-web:latest .
```

### Image Optimization

Our Dockerfiles use multi-stage builds for minimal image sizes:

- **API Image:** ~200-300MB (Alpine-based)
- **Web Image:** ~150-200MB (Next.js standalone)

## Running Production Stack

### Start Services

```bash
# Start in detached mode
./scripts/docker-prod.sh

# Start in foreground (see logs)
./scripts/docker-prod.sh --foreground

# Rebuild images and start
./scripts/docker-prod.sh --build
```

### Stop Services

```bash
# Stop all containers
./scripts/docker-prod.sh --down

# Or manually
docker-compose -f docker-compose.prod.yml down
```

### Restart Services

```bash
# Restart all services
./scripts/docker-prod.sh --restart

# Restart individual service
docker-compose -f docker-compose.prod.yml restart api
docker-compose -f docker-compose.prod.yml restart web
```

## Database Management

### Run Migrations

Migrations are automatically run on container startup. To run manually:

```bash
# Access API container
docker exec -it freetimechat-api-prod sh

# Run main database migration
pnpm prisma:migrate:deploy:main

# Run client database migration
pnpm prisma:migrate:deploy:client
```

### Seed Database

```bash
# Access API container
docker exec -it freetimechat-api-prod sh

# Seed production data
pnpm prisma:seed:main

# Seed development data (includes test users)
pnpm seed:dev
```

### Database Backups

```bash
# Backup main database
docker exec freetimechat-postgres-prod pg_dump -U freetimechat freetimechat_main > backup_main_$(date +%Y%m%d).sql

# Backup specific client database
docker exec freetimechat-postgres-prod pg_dump -U freetimechat freetimechat_client_dev > backup_client_$(date +%Y%m%d).sql

# Backup all databases
docker exec freetimechat-postgres-prod pg_dumpall -U freetimechat > backup_all_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore main database
docker exec -i freetimechat-postgres-prod psql -U freetimechat freetimechat_main < backup_main.sql

# Restore specific client database
docker exec -i freetimechat-postgres-prod psql -U freetimechat freetimechat_client_dev < backup_client.sql
```

### Database Shell Access

```bash
# PostgreSQL shell
docker exec -it freetimechat-postgres-prod psql -U freetimechat -d freetimechat_main

# Redis CLI
docker exec -it freetimechat-redis-prod redis-cli

# Authenticate in Redis
AUTH your_redis_password
```

## Monitoring & Logs

### View Logs

```bash
# All services (follow mode)
./scripts/docker-prod.sh --logs

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f postgres

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api
```

### Health Checks

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check health endpoints
curl http://localhost:3001/api/v1/health  # API
curl http://localhost:3000/api/health      # Web

# Database health
docker exec freetimechat-postgres-prod pg_isready -U freetimechat

# Redis health
docker exec freetimechat-redis-prod redis-cli ping
```

### Container Stats

```bash
# Real-time resource usage
docker stats

# Specific containers
docker stats freetimechat-api-prod freetimechat-web-prod
```

## Scaling

### Horizontal Scaling

To run multiple instances of API or Web:

```bash
# Scale API to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Scale Web to 2 instances
docker-compose -f docker-compose.prod.yml up -d --scale web=2
```

**Note:** You'll need a load balancer (nginx/traefik) in front of scaled
services.

### Resource Limits

Add to `docker-compose.prod.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

## Security Best Practices

### 1. Use Strong Secrets

```bash
# Generate strong passwords
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 24  # For passwords
```

### 2. Secure JWT Keys

```bash
# Restrict key permissions
chmod 600 apps/api/keys/private.pem
chmod 644 apps/api/keys/public.pem

# In production, mount keys as secrets
docker secret create jwt_private apps/api/keys/private.pem
docker secret create jwt_public apps/api/keys/public.pem
```

### 3. Use Docker Secrets

For Docker Swarm deployments:

```yaml
secrets:
  postgres_password:
    external: true
  redis_password:
    external: true
  session_secret:
    external: true
```

### 4. Network Isolation

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # No external access
```

### 5. Run as Non-Root

Our Dockerfiles already use non-root users:

- API runs as `nodejs` (uid 1001)
- Web runs as `nextjs` (uid 1001)

### 6. Keep Images Updated

```bash
# Update base images
docker-compose -f docker-compose.prod.yml pull

# Rebuild with latest dependencies
./scripts/docker-build.sh --no-cache
```

## Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check specific service
docker-compose -f docker-compose.prod.yml logs api

# Verify environment variables
docker-compose -f docker-compose.prod.yml config
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker exec freetimechat-postgres-prod pg_isready -U freetimechat

# Test connection from API container
docker exec freetimechat-api-prod sh -c "psql \$DATABASE_URL -c 'SELECT 1'"

# Check connection string format
echo $DATABASE_URL
```

### Out of Memory

```bash
# Check container memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Add memory limits to docker-compose.prod.yml
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
API_PORT=3002
```

### Image Build Failures

```bash
# Clean build cache
docker builder prune -af

# Check Docker disk space
docker system df

# Clean up unused resources
./scripts/docker-clean.sh --all
```

## Deployment Guides

### AWS ECS/Fargate

1. Push images to ECR:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag freetimechat-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/freetimechat-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/freetimechat-api:latest
```

2. Create RDS PostgreSQL and ElastiCache Redis
3. Update environment variables in ECS task definition
4. Deploy task definition

### Digital Ocean App Platform

1. Push images to Docker Hub or DO Container Registry
2. Create new app from Docker images
3. Configure environment variables
4. Set up managed PostgreSQL and Redis
5. Deploy

### Kubernetes

```bash
# Build and tag images
./scripts/docker-build.sh

# Push to registry
docker tag freetimechat-api:latest registry.example.com/freetimechat-api:latest
docker push registry.example.com/freetimechat-api:latest

# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml freetimechat

# View services
docker stack services freetimechat

# Scale services
docker service scale freetimechat_api=3
```

## Cleanup

```bash
# Stop and remove everything
./scripts/docker-clean.sh --all

# Remove just containers
./scripts/docker-clean.sh --containers

# Remove volumes (deletes data!)
./scripts/docker-clean.sh --volumes

# Remove images
./scripts/docker-clean.sh --images

# System-wide cleanup
./scripts/docker-clean.sh --prune
```

## Next Steps

1. **Set up reverse proxy** (nginx/traefik) for SSL/TLS
2. **Configure domain names** and DNS
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure backups** (automated daily backups)
5. **Set up CI/CD** (GitHub Actions, GitLab CI)
6. **Enable logging aggregation** (ELK stack, CloudWatch)

## Support

For issues and questions:

- GitHub Issues:
  [FreeTimeChat Issues](https://github.com/your-org/freetimechat/issues)
- Documentation: See main README.md
- Local development: See docker/README.md

---

**Version:** 1.0.0 **Last Updated:** 2024
