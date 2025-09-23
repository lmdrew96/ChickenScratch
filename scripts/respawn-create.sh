#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ts="$(date +%Y%m%d-%H%M%S)"
tag="respawn-$ts"
branch="ui-stable-$ts"
backup_dir="backups/$tag"

mkdir -p "$backup_dir"

git add -A || true
if ! git diff --cached --quiet; then
  git commit -m "Respawn point $tag"
fi

git branch "$branch" >/dev/null 2>&1 || true
git tag -a "$tag" -m "Respawn point $tag" >/dev/null 2>&1 || true

git archive --format=tar --prefix="repo-$tag/" HEAD | gzip > "$backup_dir/repo-$tag.tar.gz"
printf "%s\n" "$(git rev-parse --short HEAD)" > "$backup_dir/commit.txt"
git status --porcelain=v1 > "$backup_dir/status.txt" || true
[ -f .env.local ] && cp .env.local "$backup_dir/.env.local"

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin "$branch" >/dev/null 2>&1 || true
  git push --tags >/dev/null 2>&1 || true
fi

echo "✓ Respawn point created:"
echo "  • tag:     $tag"
echo "  • branch:  $branch"
echo "  • backup:  $backup_dir"
