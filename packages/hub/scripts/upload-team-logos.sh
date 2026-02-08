#!/usr/bin/env bash
# Uploads all seed team logos to the running hub server.
# Usage: pnpm seed:logos [HUB_URL]

set -euo pipefail

HUB_URL="${1:-http://localhost:3001}"
LOGO_DIR="$(dirname "$0")/../src/db/seed_team_logos"

echo "Uploading team logos to ${HUB_URL}..."

failed=0
count=0

for file in "$LOGO_DIR"/**/*.png; do
  teamId="$(basename "$file" .png)"

  if curl -s -f -X POST "${HUB_URL}/api/teams/${teamId}/logo" \
    -F "file=@${file}" > /dev/null; then
    echo "  ✓ ${teamId}"
  else
    echo "  ✗ ${teamId} (failed)"
    failed=$((failed + 1))
  fi
  count=$((count + 1))
done

echo ""
echo "Done: ${count} logos processed, ${failed} failed."
