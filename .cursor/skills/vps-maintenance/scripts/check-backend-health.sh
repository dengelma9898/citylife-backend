#!/usr/bin/env bash
# Prüft Backend-Health-Endpoints auf dem VPS (dev + prd Container-Ports).
# Exit 0 = alle Checks OK, Exit 1 = mindestens ein Check fehlgeschlagen.
set -euo pipefail

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FAILED=0

check_health() {
  local name=$1
  local port=$2
  local container=$3
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "${TIMESTAMP} OK ${name} port=${port} http=${code}"
    return 0
  fi
  echo "${TIMESTAMP} FAIL ${name} port=${port} http=${code}"
  docker ps --filter "name=${container}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
  FAILED=1
  return 1
}

check_health "dev" 3000 "nuernbergspots-test" || true
check_health "prd" 3100 "nuernbergspots" || true

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi
