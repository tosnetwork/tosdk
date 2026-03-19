#!/usr/bin/env bash
set -euo pipefail

# Publish @tosnetwork/tosdk to npm.
# Usage: ./publish.sh [--dry-run]

VERSION=$(node -p "require('./package.json').version")
echo "Publishing @tosnetwork/tosdk@${VERSION}..."

EXTRA_FLAGS=""
if [[ "${1:-}" == "--dry-run" ]]; then
  EXTRA_FLAGS="--dry-run"
  echo "(dry run — nothing will actually be published)"
fi

pnpm test
pnpm build

npm publish \
  --no-git-checks \
  --provenance=false \
  --access public \
  $EXTRA_FLAGS

if [[ -z "$EXTRA_FLAGS" ]]; then
  echo "✓ @tosnetwork/tosdk@${VERSION} published to npm"
fi
