-- FreeTimeChat PostgreSQL Initialization Script
-- This script runs when the PostgreSQL container is first created
-- It creates the main database and a development client database

-- Main database (for authentication and client registry)
-- Already created as POSTGRES_DB via docker-compose environment variable

-- Development client database
-- Note: PostgreSQL does not support IF NOT EXISTS for CREATE DATABASE
-- This will fail if database already exists (safe for init scripts)
CREATE DATABASE freetimechat_client_dev;

-- Create extensions in main database
\c freetimechat_main;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Create extensions in client database
\c freetimechat_client_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Note: pgvector extension for embeddings will be added later if needed
-- CREATE EXTENSION IF NOT EXISTS "vector";
