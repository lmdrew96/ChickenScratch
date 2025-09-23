#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

target="${1:-latest}"
if [ "$target" = "latest" ]; then
  target="$(git tag --list 'respawn-*' --sort=-creatordate | head -n1)"
  [ -z "$target" ] && { echo "No respawn tags found."; exit 1; }
fi

echo "About to reset working tree to: $target"
read -r -p "This will discard local changes. Continue? [y/N] " ans
case "$ans" in
  y|Y) ;;
  *) echo "Cancelled."; exit 1 ;;
esac

git fetch --all --tags >/dev/null 2>&1 || true
git reset --hard "$target"
echo "✓ Reset to $target"

backup_dir="backups/$target"
if [ -f "$backup_dir/.env.local" ] && [ ! -f .env.local ]; then
  cp "$backup_dir/.env.local" .env.local
  echo "✓ Restored .env.local from $backup_dir"
fi

echo "Tip: create a working branch now:  git checkout -B ui-wip"
