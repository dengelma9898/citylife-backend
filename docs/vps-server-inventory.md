# VPS Server-Inventar — nuernbergspots.de

> Erstellt am 2026-06-16 per SSH-Inventur (`87.106.208.51`).  
> Aktualisiert am 2026-06-16: OBD/OBG-Berliner-Döner-Stack entfernt.  
> Hosting: IONOS VPS (klassisch, kein IONOS Cloud). Zugang: `ssh root@87.106.208.51`

## Übersicht

| Eigenschaft | Wert |
|-------------|------|
| Hostname | `ubuntu` |
| OS | Ubuntu 24.04.3 LTS (Noble Numbat) |
| Kernel | 6.8.0-94-generic |
| Architektur | x86_64 |
| CPU | 2 vCPUs (AMD EPYC-Milan) |
| RAM | 1,8 GiB gesamt |
| Swap | **keiner** konfiguriert |
| Disk | 77 GiB (`/dev/vda1`), ~15 % belegt |
| Load | niedrig |

## Netzwerk

| Interface | Adresse |
|-----------|---------|
| `ens6` (öffentlich) | `87.106.208.51/32` |
| `docker0` | `172.17.0.1/16` |

### Lauschende Ports (relevant)

| Port | Dienst | Bindung |
|------|--------|---------|
| 22 | SSH | `0.0.0.0` / `::` |
| 80 | nginx (HTTP → HTTPS Redirect) | `0.0.0.0` |
| 443 | nginx (TLS, Reverse Proxy) | `0.0.0.0` |
| 3000 | Docker: `nuernbergspots-test` (Dev-Backend) | `0.0.0.0` |
| 3100 | Docker: `nuernbergspots` (Prod-Backend) | `0.0.0.0` |

## Docker

| Tool | Version |
|------|---------|
| Docker Engine | 29.2.0 |
| Docker Compose | v5.0.2 |

### Container

| Name | Image | Host-Port | Restart |
|------|-------|-----------|---------|
| `nuernbergspots` | `dengelma/nuernbergspots:latest` | `3100→3100` | `unless-stopped` |
| `nuernbergspots-test` | `dengelma/nuernbergspots-test:latest` | `3000→3000` | `unless-stopped` |

### Images

| Repository | Tag | Größe (ca.) | Stand |
|------------|-----|-------------|-------|
| `dengelma/nuernbergspots` | `latest` | 2,96 GB | **veraltet** (vor Multi-Stage-Optimierung) |
| `dengelma/nuernbergspots-test` | `latest` | 2,14 GB | **veraltet** (vor Multi-Stage-Optimierung) |

**Erwartet nach nächstem Deploy:** ~400–600 MB pro Image (Multi-Stage, ohne Chromium, nur Prod-Deps).

**Entfernt (2026-06-16):** `obd-backend-dev`, `obd-admin-dev` sowie Images `berliner-doener-*` (~800 MB).

## Nürnbergspots Backend (Docker)

### Produktion — `nuernbergspots`

| Variable | Wert |
|----------|------|
| `NODE_ENV` | `prd` |
| `PORT` | `3100` |
| `BASE_URL` | `/prd` |
| Node.js | v20.20.0 |

Öffentlich: `https://nuernbergspots.de/prd/`

### Test/Dev — `nuernbergspots-test`

| Variable | Wert |
|----------|------|
| `NODE_ENV` | `dev` |
| `PORT` | `3000` |
| `BASE_URL` | `/dev` |
| Node.js | v24.16.0 |

Öffentlich: `https://nuernbergspots.de/dev/`

### Health-Check

- Backend `GET /health` (Port 3000/3100): **401** (Auth erforderlich — korrekt)
- nginx `GET https://nuernbergspots.de/health`: **200** `healthy`

## nginx Reverse Proxy

- **Version:** nginx/1.24.0 (Ubuntu)
- **Config:** `/etc/nginx/sites-available/nuernbergspots.de`
- **Repo-Referenz:** `.cursor/skills/vps-maintenance/scripts/nuernbergspots.de.nginx`
- **Backup auf Server:** `nuernbergspots.de.bak-*` im selben Verzeichnis
- **Domain:** `nuernbergspots.de`, `www.nuernbergspots.de`
- **Root `/`:** Redirect nach `/dev/`

### Routing

| Pfad | Upstream |
|------|----------|
| `/dev/` | `localhost:3000` |
| `/prd/` | `localhost:3100` |
| `/health` | statisch 200 (nginx) |

**Entfernt:** alle `/obg/*`-Routen (Berliner Döner Dev/Prod).

**Features:** TLS 1.2/1.3, HSTS, Security-Headers, Gzip, `client_max_body_size 10M`.

## SSL/TLS

| Eigenschaft | Wert |
|-------------|------|
| Zertifikat | Wildcard `*.nuernbergspots.de` |
| Pfad | `/etc/ssl/nuernbergspots.de/` |
| Gültig bis | **2027-02-02** |

## Systemd-Dienste (relevant)

| Dienst | Status |
|--------|--------|
| `docker.service` | active |
| `nginx.service` | active |
| `ssh.service` | active |
| `unattended-upgrades` | active |

## Sicherheit & Hardening

| Thema | Status |
|-------|--------|
| UFW Firewall | inaktiv |
| fail2ban | nicht aktiv |
| SSH Root + Passwort | aktiv |
| Automatische Security-Updates | aktiv |

## Verzeichnisse

| Pfad | Inhalt |
|------|--------|
| `/var/www/html` | Standard-Webroot |
| `/root/.ssh/` | SSH-Keys |
| `/root/` | SSL-Backup-Dateien |

**Entfernt:** `/srv/berliner-doener/`

Deployments per `docker run` — siehe `README.md`.

## Deploy-Bezug (Projekt)

- CI: `.github/workflows/deployment.yml` → `appleboy/ssh-action` auf `87.106.208.51`
- Dev: `dengelma/nuernbergspots-test` → Port 3000
- Prod: `dengelma/nuernbergspots` → Port 3100

## Auffälligkeiten / Empfehlungen

1. **RAM entlastet** durch Entfernung von 2 Containern (~800 MB Images) — weiterhin kein Swap.
2. **Docker-Image optimiert (2026-06-16):** Multi-Stage-`Dockerfile` ohne Chromium — nach Deploy deutlich kleinere Images und kein Puppeteer-Runtime-Cache mehr auf Prod.
3. **Sicherheit:** UFW, fail2ban, SSH-Key statt Passwort.
4. **Docker-Updates:** apt-upgradable Pakete vorhanden.

## Nützliche Befehle

```bash
ssh root@87.106.208.51
docker ps -a
docker logs -f nuernbergspots
nginx -t && systemctl reload nginx

# Verifikation (lokal aus backend/)
eval "$(grep '^export IONOS_' ~/.zshrc)"
sshpass -p "$IONOS_PWD" ssh "${IONOS_USER}@${IONOS_IP}" 'bash -s' \
  < .cursor/skills/vps-maintenance/scripts/verify-vps.sh
```
