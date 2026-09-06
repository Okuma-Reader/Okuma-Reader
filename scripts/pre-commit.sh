#!/usr/bin/env sh
set -e

# Keep lockfile aligned with package.json, then format and verify.
npm install
npm run fmt
npm run lint
npm run check

# Include lockfile / fmt fixes for paths already in this commit.
git add package-lock.json package.json
git diff --cached --name-only | while IFS= read -r f; do
  [ -n "$f" ] && [ -e "$f" ] && git add -- "$f"
done
