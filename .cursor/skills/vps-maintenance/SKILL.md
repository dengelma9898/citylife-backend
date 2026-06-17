---
name: vps-maintenance
description: SSH into the IONOS VPS (nuernbergspots.de), run OS/Docker updates, reboot the server, and verify all services (nginx, Docker containers, ports, TLS) are healthy afterward. Use when the user asks for VPS maintenance, server updates, apt upgrade, reboot, server health check, or post-reboot verification.
---

# VPS Wartung — nuernbergspots.de

IONOS-VPS (klassisch, **kein** `ionosctl`/Cloud-API). Vollständiges Inventar: [docs/vps-server-inventory.md](../../../docs/vps-server-inventory.md).

## Voraussetzungen

- Env-Variablen in `~/.zshrc`: `IONOS_USER`, `IONOS_IP`, `IONOS_PWD`
- Lokal: `sshpass` für nicht-interaktiven SSH (`brew install hudochenkov/sshpass/sshpass`)
- **User explizit informieren** vor Reboot (Downtime ~2–5 Min)
- **Kein Commit** der Credentials; Passwörter nie in Logs/Markdown ausgeben

## SSH-Helfer

Credentials laden und verbinden:

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
SSHPASS_CMD="sshpass -p \"$IONOS_PWD\" ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 ${IONOS_USER}@${IONOS_IP}"
```

Remote-Befehl:

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh -o StrictHostKeyChecking=accept-new "${IONOS_USER}@${IONOS_IP}" 'BEFEHL'
```

## Workflow

```
Task Progress:
- [ ] Schritt 1: Pre-Check (Baseline erfassen)
- [ ] Schritt 2: Updates durchführen
- [ ] Schritt 3: Reboot (nur nach User-Bestätigung oder expliziter Anfrage)
- [ ] Schritt 4: Warten bis SSH wieder erreichbar
- [ ] Schritt 5: Post-Reboot-Verifikation
- [ ] Schritt 6: Ergebnis dokumentieren
```

### Schritt 1: Pre-Check

Remote-Verifikation **vor** Änderungen:

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" 'bash -s' < .cursor/skills/vps-maintenance/scripts/verify-vps.sh
```

Baseline lokal notieren: Uptime, ausstehende Updates (`apt list --upgradable | wc -l`), Container-Status.

Falls Pre-Check fehlschlägt: **nicht** updaten/rebooten — erst Ursache klären.

### Schritt 2: Updates

**Nur nach grünem Pre-Check.** Remote:

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" 'bash -s' <<'REMOTE'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get autoremove -y
apt-get autoclean -y
echo "=== PENDING REBOOT? ==="
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required || echo "no reboot flag"
REMOTE
```

**Hinweise:**
- `unattended-upgrades` läuft bereits — manuelles Upgrade ergänzt das
- Kernel-/Docker-Updates setzen oft Reboot voraus (`/var/run/reboot-required`)
- **Kein** `dist-upgrade` auf Major-Release ohne explizite User-Anfrage

Optional Docker-Pakete prüfen (stehen oft in `apt list --upgradable`):

```bash
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" \
  "apt list --upgradable 2>/dev/null | grep -E 'docker|containerd' || true"
```

### Schritt 3: Reboot

**Nur wenn** User Reboot wollte **oder** `/var/run/reboot-required` existiert.

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" 'reboot' || true
```

SSH bricht ab — erwartet.

### Schritt 4: Warten auf SSH

Poll bis erreichbar (max. ~5 Min):

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
for i in $(seq 1 30); do
  if sshpass -p "$IONOS_PWD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
    "${IONOS_USER}@${IONOS_IP}" 'echo up' 2>/dev/null; then
    echo "SSH ready after attempt $i"
    break
  fi
  echo "waiting... ($i/30)"
  sleep 10
done
```

Danach 30–60 s warten, bis Docker-Container gestartet sind (`unless-stopped`).

### Schritt 5: Post-Reboot-Verifikation

```bash
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" 'bash -s' < .cursor/skills/vps-maintenance/scripts/verify-vps.sh
```

**Alle Checks müssen PASS sein.** Bei FAIL: Diagnose (siehe [reference.md](reference.md) → Fehlerbehebung).

Zusätzlich von lokal (optional, externe Erreichbarkeit):

```bash
curl -sf -o /dev/null -w "nginx /health: %{http_code}\n" https://nuernbergspots.de/health
curl -sf -o /dev/null -w "https redirect: %{http_code}\n" -L http://nuernbergspots.de/dev/ 2>/dev/null | tail -1
```

### Schritt 6: Ergebnis dokumentieren

Kurz an User melden:

- Anzahl upgradeter Pakete / Reboot ja/nein
- Post-Check: alle PASS / welche FAIL
- Uptime nach Reboot, Container-Laufzeit
Optional `docs/vps-server-inventory.md` aktualisieren, wenn sich Infrastruktur geändert hat.

## Erwartete Services (Post-Check)

| Check | Erwartung |
|-------|-----------|
| `nuernbergspots` | `Up`, Port 3100 |
| `nuernbergspots-test` | `Up`, Port 3000 |
| nginx | `active` |
| docker | `active` |
| Backend `/health` (direkt) | HTTP **401** (Auth required — korrekt) |
| nginx `https://…/health` | HTTP **200** |
| SSL-Zertifikat | Gültig (Wildcard `*.nuernbergspots.de`) |

## Sicherheit

- Reboot nur mit User-Einverständnis
- Keine Firewall-/SSH-Config-Änderungen ohne explizite Anfrage
- Bei OOM-Risiko (1,8 GiB RAM, kein Swap): nach Reboot `free -h` prüfen

## Zusätzliche Ressourcen

- Server-Details: [reference.md](reference.md)
- Verifikations-Skript: [scripts/verify-vps.sh](scripts/verify-vps.sh)
