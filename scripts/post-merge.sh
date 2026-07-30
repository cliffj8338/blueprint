#!/bin/bash
# Post-merge setup: runs automatically after a task merge.
set -e

# Install any new/changed dependencies (fast no-op when lockfile unchanged)
npm install --no-audit --no-fund

# Keep the mirrored app-core.js copies in sync (public/ is the source of truth)
if [ -f public/app-core.js ]; then
  cp public/app-core.js app-core.js
  mkdir -p dist
  cp public/app-core.js dist/app-core.js
fi

# Sanity check: core files must parse
node --check public/app-core.js
node --check api/ai.js

echo "post-merge setup OK"
