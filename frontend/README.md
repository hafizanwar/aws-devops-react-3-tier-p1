# E-Commerce Frontend

React-based frontend application for the three-tier e-commerce platform.

## Features

- Product catalog browsing
- Product detail views
- Shopping cart management
- Order placement
- Error handling with automatic retry
- Responsive design

## Environment Variables

Create a `.env` file based on `.env.example`:

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:3000)
- `REACT_APP_ENV`: Environment identifier (default: development)

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Docker

### Build the Docker image

```bash
docker build -t ecommerce-frontend:latest .
```

### Run the container

```bash
docker run -p 80:80 \
  -e REACT_APP_API_URL=http://backend:3000 \
  -e REACT_APP_ENV=production \
  ecommerce-frontend:latest
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Multi-stage Build

The Dockerfile uses a multi-stage build process:

1. **Build Stage**: Uses `node:18-alpine` to build the React application
2. **Runtime Stage**: Uses `nginx:alpine` to serve the built static files

This approach:
- Optimizes image size by excluding build dependencies from the final image
- Uses Alpine Linux base images for minimal footprint
- Implements runtime environment variable injection
- Includes production-ready nginx configuration

### Environment Variables

Environment variables are injected at runtime using the `env.sh` script:

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:3000)
- `REACT_APP_ENV`: Environment identifier (default: production)

### Image Size Optimization

- Multi-stage build separates build and runtime dependencies
- Alpine Linux base images (~5MB vs ~900MB for standard images)
- `.dockerignore` excludes unnecessary files
- Nginx serves pre-built static assets efficiently
