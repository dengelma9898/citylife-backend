#!/usr/bin/env bash
# VPS post-maintenance verification — run on server (via SSH)
set -uo pipefail

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name — $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== VPS VERIFY $(date -Is) ==="
echo "--- system ---"
uptime
disk_pct=$(df -h / | awk 'NR==2 {gsub(/%/,""); print $5}')
if [ -n "$disk_pct" ] && [ "$disk_pct" -lt 90 ]; then
  check "disk-root" "ok"
else
  check "disk-root" "usage ${disk_pct}%"
fi

echo "--- systemd ---"
for svc in nginx docker ssh; do
  if [ "$(systemctl is-active "$svc" 2>/dev/null)" = "active" ]; then
    check "systemd-$svc" "ok"
  else
    check "systemd-$svc" "inactive"
  fi
done

echo "--- docker containers ---"
REQUIRED_CONTAINERS="nuernbergspots nuernbergspots-test"
for c in $REQUIRED_CONTAINERS; do
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
    status=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null)
    if [ "$status" = "running" ]; then
      check "container-$c" "ok"
    else
      check "container-$c" "status=$status"
    fi
  else
    check "container-$c" "not running"
  fi
done

echo "--- ports ---"
for spec in "3000:nuernbergspots-test" "3100:nuernbergspots" "80:nginx" "443:nginx"; do
  port="${spec%%:*}"
  name="${spec#*:}"
  if ss -tln 2>/dev/null | grep -q ":${port} "; then
    check "port-$port-$name" "ok"
  else
    check "port-$port-$name" "not listening"
  fi
done

echo "--- nginx config ---"
if nginx -t 2>&1 | grep -q "successful"; then
  check "nginx-config" "ok"
else
  check "nginx-config" "nginx -t failed"
fi

echo "--- health endpoints ---"
code_prd=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/health 2>/dev/null || echo "000")
code_dev=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health 2>/dev/null || echo "000")
if [ "$code_prd" = "401" ]; then
  check "health-prd-401" "ok"
else
  check "health-prd-401" "got $code_prd (expected 401)"
fi
if [ "$code_dev" = "401" ]; then
  check "health-dev-401" "ok"
else
  check "health-dev-401" "got $code_dev (expected 401)"
fi

if [ -f /etc/ssl/nuernbergspots.de/fullchain.pem ]; then
  if openssl x509 -in /etc/ssl/nuernbergspots.de/fullchain.pem -noout -checkend 86400 2>/dev/null; then
    check "ssl-cert-valid" "ok"
  else
    check "ssl-cert-valid" "expires within 24h or invalid"
  fi
else
  check "ssl-cert-valid" "cert file missing"
fi

echo "--- resources ---"
mem_avail=$(free -m 2>/dev/null | awk '/^Mem:/ {print $7}')
if [ -n "$mem_avail" ] && [ "$mem_avail" -gt 100 ]; then
  check "memory-available" "ok"
else
  check "memory-available" "${mem_avail:-?}MB available (low)"
fi

echo "=== SUMMARY: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
  exit 0
fi
exit 1
