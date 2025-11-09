# IMPORTANT: DO NOT USE DOCKER

This project **does not use Docker** for local development.

## Database Access

- Use **native database connections** instead of Docker containers
- PostgreSQL is installed and running locally on the system
- Access database directly via psql or native connection tools

## Why No Docker?

Per user preference, this project has been set up to work without Docker
containers for database access and development tools.

## Database Configuration

- PostgreSQL: Running natively on localhost
- Connection details are in `.env` files
- Use standard PostgreSQL client tools for database management

---

**Created**: 2025-11-08 **Last Updated**: 2025-11-08
