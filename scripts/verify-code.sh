#!/usr/bin/env bash
# Run the same checks as CI locally (client ESLint + server build/format).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Client: ESLint"
(
  cd "$ROOT/client"
  npm ci --silent
  npm run lint
)

echo "==> Server: build"
dotnet restore "$ROOT/server/Rydo.sln"
dotnet build "$ROOT/server/Rydo.sln" --no-restore

echo "==> Server: dotnet format"
dotnet format "$ROOT/server/Rydo.sln" --verify-no-changes

echo "All checks passed."
