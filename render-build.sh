#!/usr/bin/env bash
set -euo pipefail

if [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo "VITE_API_BASE_URL must be set for a production build." >&2
  exit 1
fi

node scripts/prepare-api-client.mjs --force

npm ci --no-audit --no-fund
npm run build
