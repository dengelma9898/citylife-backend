# Deployment & Infrastruktur: Optimierungs-Review (2026-09)

> Status: **P0/P1 umgesetzt (2026-09)** – P2+ weiterhin Backlog.
> Kontext: Review der Deployment-Pipeline, VPS-Infrastruktur und verbleibender Performance-Engpässe nach dem ersten Optimierungs-Sprint.

---

## 1. Zusammenfassung

Das Performance-Paket 2026-09 adressiert echte Hotspots (Firestore-Roundtrips, Batch-Lookups, FCM-Concurrency pro User). Die **Infrastruktur-Basis ist solide** (Multi-Stage-Docker, nginx mit gzip/TLS, Rate-Limiting, Helmet, Health-Module).

Die **größten verbleibenden Risiken** liegen nicht primär in Docker/nginx, sondern in:

1. **Unbegrenztem parallelem Notification-Fan-out** auf User-Ebene
2. **Vollständigem Laden der Events-Collection** in den Prozess-Speicher
3. **Hard-Cutover-Deployments** ohne Graceful Shutdown

Dieses Dokument priorisiert Maßnahmen, verweist auf bestehende Migrations-Docs und listet Quick Wins mit konkreten Dateien.

**Referenzen:**

- `CONSTITUTION.md` §3 (Caching, Health-Checks, Redis-Option)
- `docs/migrations/fcm-multicast-batching.md`
- `docs/migrations/events-server-side-queries.md`
- `.cursor/skills/vps-maintenance/scripts/nuernbergspots.de.nginx`
- `.cursor/skills/vps-maintenance/scripts/verify-vps.sh`

---

## 2. Was bereits gut ist (kein Handlungsbedarf)

| Bereich | Ist-Zustand | Referenz |
|---------|-------------|----------|
| Docker-Build | Multi-Stage (`node:24-slim`), nur Prod-Deps im Runtime-Image | `Dockerfile` |
| Build-Kontext | Tests/Docs ausgeschlossen | `.dockerignore` |
| CI/CD | Lint + Tests vor Build/Deploy | `.github/workflows/deployment.yml` |
| Netzwerk | Container nur `127.0.0.1`, nginx als Reverse Proxy | `deployment.yml`, nginx-Config |
| Sicherheit | Helmet, Throttler (60/min prd), ValidationPipe whitelist | `src/main.ts`, `src/app.module.ts` |
| Logging prd | Nur `warn`/`error` | `src/main.ts` |
| nginx | TLS 1.2/1.3, HSTS, gzip für JSON, `client_max_body_size 10M` | nginx-Config |
| Compression | nginx gzip aktiv – kein Express-`compression` nötig | `docs/app_review.html` |
| Monitoring-Basis | Terminus Health mit Firebase + Memory | `src/health/` |

---

## 3. Was das Performance-Paket 2026-09 bereits verbessert hat

| Bereich | Änderung | Dateien |
|---------|----------|---------|
| Firestore Writes | Update liefert gemergtes Objekt statt Re-Read | `users.service.ts`, `events.service.ts` |
| User-Profile Batch | Cache-Einträge parallel setzen | `users.service.ts` |
| Businesses | `getByIds` per `in`-Query; kein N+1 in `getBusinessUsersNeedsReview` | `businesses.service.ts` |
| FCM pro User | Concurrency-Limiter (25 in-flight), parallele Token-Bereinigung | `notification.service.ts` |
| Tests | Unit-Tests für Notification-Concurrency | `notification.service.spec.ts` |

---

## 4. Priorisierte Maßnahmen (Backlog)

### Legende

| Priorität | Bedeutung |
|-----------|-----------|
| **P0** | Hoher Impact, geringer Aufwand – als Nächstes |
| **P1** | Wichtig für Stabilität/Sicherheit |
| **P2** | Mittlerer Aufwand, hoher Impact bei Skalierung |
| **P3** | Langfristig / bei Wachstum relevant |

---

### P0 – User-Level Concurrency bei Notification-Fan-out

**Problem:** Der FCM-Limiter in `NotificationService` gilt **pro User** (max. 25 Tokens parallel). `EventsService` und `BusinessesService` starten aber **unbegrenzt viele** `sendToUser`-Aufrufe via `Promise.all`:

```typescript
// src/events/events.service.ts (analog in businesses.service.ts)
const sendPromises = usersToNotify.map(async ({ id }) => {
  await this.notificationService.sendToUser(id, { ... });
});
await Promise.all(sendPromises);
```

Bei z. B. 2.000 Usern → 2.000 parallele Firestore-Reads (`getFcmTokens`) plus FCM-Sends.

**Zusätzlich:** Jede Notification lädt **alle User** aus Firestore:

```typescript
const allUsers = await this.usersService.getAllUserProfilesWithIds();
```

**Betroffene Dateien:**

- `src/events/events.service.ts` – `sendNewEventNotification`, `sendEventUpdateNotification`
- `src/businesses/application/services/businesses.service.ts` – `sendNewBusinessNotification`, `sendBusinessActivatedNotification`
- `src/special-polls/special-polls.service.ts` – nutzt ebenfalls `getAllUserProfilesWithIds`
- `src/news/news.service.ts` – Notification-Fan-out (prüfen)

**Empfohlene Schritte:**

- [x] `mapWithConcurrency` aus `NotificationService` extrahieren (z. B. `src/core/utils/concurrency.util.ts`) oder in einen Shared Helper
- [x] User-Level-Concurrency (10–25) in Event/Business-Notification-Methoden
- [x] Tests: Fan-out mit vielen Usern mocken, Parallelität begrenzt verifizieren
- [ ] Optional kurzfristig: Firestore-Query nur User mit `notificationPreferences.newEvents == true` (Index prüfen)

**Aufwand:** Klein | **Impact:** Hoch

---

### P1 – Graceful Shutdown

**Problem:** `src/main.ts` hat kein `app.enableShutdownHooks()`. Bei `docker stop` werden laufende Requests abgebrochen.

**Empfohlene Schritte:**

- [x] `app.enableShutdownHooks()` in `bootstrap()` ergänzen
- [ ] Optional: kurzer Drain-Delay vor Prozess-Ende (in-flight Requests abschließen)
- [x] Deploy-Script: `docker stop` mit Timeout (`-t 30`) statt hartem Kill

**Betroffene Dateien:** `src/main.ts`, `.github/workflows/deployment.yml`

**Aufwand:** Klein | **Impact:** Mittel (weniger 502 bei Deploys)

---

### P1 – Health-Endpoints ohne Auth

**Problem:**

- nginx `location = /health` liefert statisches `200 healthy` – prüft **nicht** das Backend
- App `GET /health` liegt hinter `AuthGuard` → `401` ohne Token
- VPS-Verify (`verify-vps.sh`) erwartet `401` auf Container-Port als „läuft“ – schwacher Liveness-Check

**Empfohlene Schritte:**

- [x] `@Public()` / Skip-Auth Decorator für `/health` (nur Liveness öffentlich)
- [x] `HEALTHCHECK` in `Dockerfile`
- [x] Deploy wartet auf healthy Container
- [x] VPS-Cron: `check-backend-health.sh` alle 5 Min (Ports 3000/3100)
- [ ] Optional: nginx `/health` auf Backend-Proxy umstellen (oder separaten internen Endpoint)

**Betroffene Dateien:**

- `src/health/health.controller.ts`
- `src/core/guards/auth.guard.ts` (oder neuer `@Public()` Decorator)
- `Dockerfile`
- `.github/workflows/deployment.yml`

**Referenz:** `CONSTITUTION.md` §3 (Health-Check-Endpoints)

**Aufwand:** Klein | **Impact:** Mittel (besseres Monitoring, sicherere Deploys)

---

### P1 – Swagger in Production deaktivieren

**Problem:** Swagger UI läuft in `main.ts` immer auf `/api` – auch in `prd`. Geringer Overhead, aber unnötige API-Schema-Exposition.

**Empfohlene Schritte:**

- [x] `SwaggerModule.setup` nur wenn `NODE_ENV !== 'prd'`
- [ ] Optional: Swagger in dev/staging per Env-Flag (`SWAGGER_ENABLED=true`)

**Betroffene Dateien:** `src/main.ts`

**Referenz:** `CONSTITUTION.md` § OpenAPI / Swagger

**Aufwand:** Minimal | **Impact:** Sicherheit

---

### P2 – FCM Multicast-Batching

**Problem:** Pro Token ein separater FCM-HTTP-Call. Bei Massen-Benachrichtigungen ineffizient.

**Lösung:** Bereits dokumentiert in `docs/migrations/fcm-multicast-batching.md`.

**Empfohlene Schritte:** Siehe dort (Phasen 1–5).

**Aufwand:** Mittel | **Impact:** Sehr hoch bei Fan-out

**Abhängigkeit:** Sinnvoll nach P0 (User-Level-Limiter), kann P0 ergänzen oder ersetzen.

---

### P2 – Globaler Cache: `max: 100` Items

**Problem:** LRU mit nur 100 Einträgen global (`src/core/cache/cache.config.ts`). Viele `user-profile:{id}`-Keys können `events:list:all` oder Kategorien verdrängen (Cache-Thrashing).

**Empfohlene Schritte:**

- [ ] `CACHE_MAX_ITEMS` als Environment-Variable (analog `CACHE_TTL_MS`)
- [ ] Production auf 150–200 erhöhen (siehe `CONSTITUTION.md` §3)
- [ ] Memory beobachten via `GET /health/memory` und `MEMORY_HEAP_THRESHOLD`

**Betroffene Dateien:** `src/core/cache/cache.config.ts`, `CONSTITUTION.md` §3

**Aufwand:** Minimal | **Impact:** Mittel

---

### P2 – Events server-seitig in Firestore

**Problem:** `EventsListQueryService` lädt die gesamte `events`-Collection in den In-Memory-Cache und filtert in JavaScript.

**Lösung:** Bereits dokumentiert in `docs/migrations/events-server-side-queries.md`.

**Empfohlene Schritte:** Siehe dort.

**Aufwand:** Groß | **Impact:** Skalierung Event-Liste

---

### P2 – Weitere N+1-Muster

| Stelle | Ist-Zustand | Ziel |
|--------|-------------|------|
| `EventsService.getByIds` | `Promise.all(ids.map(getById))` | Batch-`in`-Query (wie `BusinessesService.getByIds`) |
| `EventsService.findByTitleAndDate` | `getAll()` für Duplikat-Check | Firestore-Query mit title + date-Filter |

**Betroffene Dateien:** `src/events/events.service.ts`

**Aufwand:** Klein–Mittel | **Impact:** Mittel

---

### P3 – Zero-Downtime Deployment

**Problem:** Aktuelles Deploy-Pattern:

```bash
docker stop … && docker rm … && docker run …
```

→ Hard Cutover, typisch 2–10 s Downtime.

**Empfohlene Schritte:**

- [ ] Blue-Green: neuen Container auf anderem Port → Health-Wait → nginx upstream umschalten → alten stoppen
- [ ] Oder `docker compose` mit `healthcheck` + Rolling-Update
- [ ] Bei zwei parallelen Containern: Shared Cache (Redis) prüfen – siehe `CONSTITUTION.md` §3

**Betroffene Dateien:**

- `.github/workflows/deployment.yml`
- `.cursor/skills/vps-maintenance/scripts/nuernbergspots.de.nginx`

**Aufwand:** Mittel | **Impact:** Verfügbarkeit

---

### P3 – Docker/CI-Feintuning

| Thema | Ist-Zustand | Empfehlung |
|-------|-------------|------------|
| npm Build-Cache | Basic | BuildKit `RUN --mount=type=cache` für `npm ci` |
| Secrets im Image | `.env.{dev,prd}` im Build kopiert | Runtime-Injection via `-e` / Docker Secrets bevorzugen |
| Resource Limits | Keine | `docker run --memory=512m --cpus=1` |
| `NODE_OPTIONS` | Nicht gesetzt | `--max-old-space-size=384` passend zu Container-Limit |
| CI Sequential | prd wartet auf dev | Optional parallel deployen |

**Betroffene Dateien:** `Dockerfile`, `.github/workflows/deployment.yml`

**Aufwand:** Klein–Mittel | **Impact:** Niedrig–Mittel

---

### P3 – Redis (Shared Cache)

**Wann relevant:** Mehrere Backend-Replikas, Zero-Downtime mit zwei Containern, Cache-Persistenz über Restarts.

**Empfehlung:** Siehe `CONSTITUTION.md` §3 „Zukünftige Option: Shared Cache (Redis)“.

**Aufwand:** Mittel | **Impact:** Nur bei Horizontal Scaling

---

## 5. Roadmap (empfohlene Reihenfolge)

```
Erledigt (2026-09)
  └── Firestore Re-Reads, Batch-Lookups, FCM Concurrency pro User

Phase 1 – Quick Wins (1–2 Tage)
  ├── P0: User-Level Notification Concurrency
  ├── P1: Graceful Shutdown
  ├── P1: Health ohne Auth + Docker HEALTHCHECK
  └── P1: Swagger in prd aus

Phase 2 – Skalierung Notifications (3–5 Tage)
  ├── P2: FCM Multicast (fcm-multicast-batching.md)
  └── P2: CACHE_MAX_ITEMS konfigurierbar

Phase 3 – Skalierung Events (1–2 Wochen)
  ├── P2: Events server-side (events-server-side-queries.md)
  └── P2: Events N+1 (getByIds, findByTitleAndDate)

Phase 4 – Infrastruktur (bei Bedarf)
  ├── P3: Zero-Downtime Deploy
  ├── P3: Docker Resource Limits + NODE_OPTIONS
  └── P3: Redis (nur bei Multi-Container)
```

---

## 6. Checkliste pro Maßnahme (Vorlage)

Bei Umsetzung einer Maßnahme aus diesem Dokument:

- [ ] Code-Änderung gemäß `.cursorrules` (Tests, Typen, keine Scope-Creep)
- [ ] Unit-Tests für neue Logik (Erfolg, Fehler, Edge Cases)
- [ ] `npm run lint` und `npm test` grün
- [ ] `CONSTITUTION.md` aktualisieren (falls Env-Vars, TTL, Health, Deploy-Verhalten)
- [ ] `README.md` nur bei developer-facing Änderungen (Env, Deploy, Endpoints)
- [ ] Status in diesem Dokument oder verlinkter Migration-Doc auf „Umgesetzt“ setzen
- [ ] Nach Deploy: VPS-Verify (`verify-vps.sh`) bzw. manuell `/health` prüfen

---

## 7. Metriken zur Erfolgsmessung

| Metrik | Wo beobachten | Ziel nach Optimierung |
|--------|---------------|------------------------|
| Deploy-Downtime | nginx access log, manuell | < 1 s (mit Zero-Downtime) |
| 502/503 bei Deploy | nginx error log | 0 |
| Event-Notification Dauer | App-Logs `[NOTIFICATION]` | Stabil bei wachsender User-Zahl |
| FCM HTTP-Calls pro Fan-out | App-Logs `[FCM]` | Deutlich weniger (Multicast) |
| Firestore Reads pro Notification | Firebase Console / Logs | Kein `getAllUserProfilesWithIds` pro Event |
| Heap Memory | `GET /health/memory` | Unter `MEMORY_HEAP_THRESHOLD` |
| Cache Hit Rate | Debug-Logs `Cache hit/miss` | Weniger Thrashing bei höherem `max` |

---

## 8. Verwandte Dokumente

| Dokument | Inhalt |
|----------|--------|
| `docs/migrations/fcm-multicast-batching.md` | FCM `sendEachForMulticast`, Batch-Größe 500 |
| `docs/migrations/events-server-side-queries.md` | Firestore-Queries statt In-Memory-Event-Liste |
| `CONSTITUTION.md` §3 | Cache, Health, Rate-Limiting, Redis-Option |
| `docs/app_review.html` | VPS-Inventar, Client-Integration, Audits |
| `.cursor/skills/vps-maintenance/SKILL.md` | VPS-Wartung und Post-Reboot-Verifikation |

---

## 9. Änderungshistorie

| Datum | Autor | Änderung |
|-------|-------|----------|
| 2026-09-02 | Performance/Infra-Review | Initiales Dokument nach Commit `9fc7891` |
| 2026-09-02 | P0/P1 Umsetzung | User-Concurrency, Graceful Shutdown, Health ohne Auth, Swagger prd aus, VPS Health-Cron |
