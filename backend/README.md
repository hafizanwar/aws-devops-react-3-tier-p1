# E-commerce Backend API

Node.js/Express backend API for the three-tier e-commerce application.

## Features

- RESTful API endpoints for products and orders
- PostgreSQL database with connection pooling
- Health check and Prometheus metrics endpoints
- Request logging and error handling
- Input validation and SQL injection prevention
- Transaction support for order creation
- Docker containerization

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Environment variables:
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DATABASE_HOST`: PostgreSQL host
- `DATABASE_PORT`: PostgreSQL port
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database user
- `DATABASE_PASSWORD`: Database password
- `CORS_ORIGIN`: CORS allowed origins

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint

### Metrics
- `GET /metrics` - Prometheus metrics

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID

## Docker

Build image:
```bash
docker build -t ecommerce-backend .
```

Run container:
```bash
docker run -p 3000:3000 \
  -e DATABASE_HOST=postgres \
  -e DATABASE_PASSWORD=secret \
  ecommerce-backend
```

## Database Schema

The application expects the following PostgreSQL tables:

- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items

See the database initialization scripts for schema details.
