# Database Initialization

This directory contains the PostgreSQL database initialization scripts for the e-commerce application.

## Structure

- `init/01-schema.sql` - Database schema creation (tables, indexes)
- `init/02-seed.sql` - Sample product data for development and testing

## Schema

### Products Table
Stores product information including name, description, price, image URL, and stock quantity.

### Orders Table
Stores customer orders with email, total amount, and status tracking.

### Order Items Table
Stores individual items within each order, linking products to orders with quantity and price.

## Usage

The initialization scripts are automatically executed when the PostgreSQL container starts for the first time. Scripts in the `init/` directory are executed in alphabetical order by the PostgreSQL Docker image.

## Local Development

To initialize the database locally:

```bash
# Using Docker
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=ecommerce \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -v $(pwd)/init:/docker-entrypoint-initdb.d \
  -p 5432:5432 \
  postgres:15-alpine
```

## Seed Data

The seed data includes 12 sample products across various categories (laptops, peripherals, accessories) to facilitate development and testing.
