#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

set -a
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +a

if [[ "${DATABASE_URL:-}" == file:* ]]; then
  npx prisma db push --schema prisma/schema.sqlite.prisma
else
  npx prisma migrate deploy
fi

npm exec remix vite:dev
