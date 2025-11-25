# Use PostgreSQL 15 Alpine base image for minimal size
FROM postgres:15-alpine

# Set maintainer label
LABEL maintainer="devops-team"
LABEL description="PostgreSQL database for three-tier e-commerce application"

# Copy initialization scripts to the docker-entrypoint-initdb.d directory
# Scripts in this directory are automatically executed in alphabetical order
# when the container is started for the first time
COPY init/*.sql /docker-entrypoint-initdb.d/

# Set PostgreSQL configuration parameters for better performance
# These can be overridden via environment variables or postgresql.conf
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=en_US.utf8"

# Configure PostgreSQL settings for production use
# max_connections: Maximum number of concurrent connections
# shared_buffers: Memory used for caching data
# effective_cache_size: Estimate of memory available for disk caching
# maintenance_work_mem: Memory for maintenance operations
# checkpoint_completion_target: Spread out checkpoint writes
# wal_buffers: Memory for WAL (Write-Ahead Log) data
# default_statistics_target: Statistics collection for query planner
# random_page_cost: Cost estimate for random disk access
# effective_io_concurrency: Number of concurrent disk I/O operations
# work_mem: Memory for query operations (sorting, hash tables)
# min_wal_size: Minimum size of WAL files
# max_wal_size: Maximum size of WAL files before checkpoint

RUN echo "# Custom PostgreSQL Configuration" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "max_connections = 100" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "shared_buffers = 256MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "effective_cache_size = 1GB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "maintenance_work_mem = 64MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "checkpoint_completion_target = 0.9" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "wal_buffers = 16MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "default_statistics_target = 100" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "random_page_cost = 1.1" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "effective_io_concurrency = 200" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "work_mem = 4MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "min_wal_size = 1GB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "max_wal_size = 4GB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "log_timezone = 'UTC'" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "timezone = 'UTC'" >> /usr/local/share/postgresql/postgresql.conf.sample

# Expose PostgreSQL default port
EXPOSE 5432

# Health check to verify database is accepting connections
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} || exit 1

# The base image already defines the correct ENTRYPOINT and CMD
# ENTRYPOINT ["docker-entrypoint.sh"]
# CMD ["postgres"]
