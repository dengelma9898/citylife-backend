# VPS Reference — nuernbergspots.de

Vollständiges Inventar: [docs/vps-server-inventory.md](../../../docs/vps-server-inventory.md).

## Zugang

| Variable | Typisch |
|----------|---------|
| `IONOS_IP` | `87.106.208.51` |
| `IONOS_USER` | `root` |
| `IONOS_PWD` | in `~/.zshrc` |

## Container → Ports → URLs

| Container | Port | BASE_URL | Öffentlich |
|-----------|------|----------|------------|
| `nuernbergspots-test` | 3000 | `/dev` | `https://nuernbergspots.de/dev/` |
| `nuernbergspots` | 3100 | `/prd` | `https://nuernbergspots.de/prd/` |

## nginx

- Config: `/etc/nginx/sites-available/nuernbergspots.de`
- Referenz-Kopie im Repo: [scripts/nuernbergspots.de.nginx](scripts/nuernbergspots.de.nginx)
- SSL: `/etc/ssl/nuernbergspots.de/` (Wildcard bis 2027-02-02)
- Statischer Health: `GET /health` → 200
- Routen: nur `/dev/`, `/prd/`, `/` → Redirect `/dev/`

## Fehlerbehebung nach Reboot

| Symptom | Maßnahme |
|---------|----------|
| Container `Exited` | `docker start <name>` oder `docker logs <name> --tail 50` |
| Port nicht offen | Container-Status prüfen |
| nginx inactive | `nginx -t && systemctl start nginx` |
| docker inactive | `systemctl start docker` |
| health ≠ 401 | Nest-App noch am Starten — 60 s warten |

## Manuelles Container-Neustarten

Siehe `README.md`:

```bash
# Dev
docker stop nuernbergspots-test && docker rm nuernbergspots-test
docker pull dengelma/nuernbergspots-test
docker run -d --name nuernbergspots-test -p 3000:3000 --restart unless-stopped \
  -e PORT=3000 -e NODE_ENV=dev -e BASE_URL=/dev dengelma/nuernbergspots-test

# Prod
docker stop nuernbergspots && docker rm nuernbergspots
docker pull dengelma/nuernbergspots
docker run -d --name nuernbergspots -p 3100:3100 --restart unless-stopped \
  -e PORT=3100 -e NODE_ENV=prd -e BASE_URL=/prd dengelma/nuernbergspots
```

## Risiken

- **RAM:** 1,8 GiB, kein Swap
- **Downtime:** Reboot ~2–5 Min
