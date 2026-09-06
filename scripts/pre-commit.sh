#!/usr/bin/env sh
set -e

# Keep lockfile aligned with package.json, then format and verify.
npm install
npm run fmt
npm run lint
npm run check

# Include lockfile / fmt fixes for paths already in this commit.
# Skip deletions (they may still exist via directory symlinks) and any path
# whose parent is a symlink — git rejects "beyond a symbolic link".
git add package-lock.json package.json
git diff --cached --name-only --diff-filter=ACMR | while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -e "$f" ] || continue
  skip=
  d=$f
  while [ "$d" != "." ] && [ "$d" != "/" ]; do
    d=$(dirname -- "$d")
    if [ -L "$d" ]; then
      skip=1
      break
    fi
  done
  [ -n "$skip" ] && continue
  git add -- "$f"
done
