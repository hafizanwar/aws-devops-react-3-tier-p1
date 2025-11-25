#!/bin/sh

# Environment variable injection script for runtime configuration
# This script replaces placeholders in the built JavaScript files with actual environment variables

# Create runtime-env.js file with environment variables
cat <<EOF > /usr/share/nginx/html/runtime-env.js
window.RUNTIME_CONFIG = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-http://localhost:3000}",
  REACT_APP_ENV: "${REACT_APP_ENV:-production}"
};
EOF

echo "Runtime environment variables injected:"
cat /usr/share/nginx/html/runtime-env.js
