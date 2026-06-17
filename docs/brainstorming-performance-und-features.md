# Brainstorming: Performance, Build-Größe & Feature-Potenzial

Stand: Juni 2026 · Basis: aktuelle Codebase (`citylife-backend`), Architektur-Doku und vorhandene Integrations-Guides.

---

## 1. Ist-Zustand (Kurzüberblick)

| Bereich | Aktuell |
|---------|---------|
| Framework | NestJS 11, TypeScript, Firebase Admin (Firestore, Auth, Storage) |
| Module | ~31 Domänen-Module (Events, Businesses, Curated Spots, Direct Chats, Wallet, …) |
| Auth | Globaler `AuthGuard` – alle Endpunkte erfordern Firebase-Token (inkl. anonym) |
| Caching | In-Memory (`@nestjs/cache-manager`) pro Docker-Container, u. a. User-Profiles, Kategorien, Keywords, App-Settings, Taxi-Stands, Legal Documents, HERE Location |
| Rate-Limiting | Global `ThrottlerGuard` (60/min prd, 100/min dev) |
| DataLoader | `UserProfileLoader` in Direct Chats, Direct Messages und News verdrahtet |
| Doku | 28 Integrations-Guides unter `docs/` |

Referenzen: [architecture.md](./architecture.md), [configuration-values.md](./configuration-values.md), [notification-suggestions.md](./notification-suggestions.md)

---

## 2. Performance-Optimierungen

### 2.1 Kritisch – Skalierung bei wachsenden Datenmengen

#### Vollständige Collection-Reads ohne Pagination

Mehrere Kern-Endpunkte laden **alle** Firestore-Dokumente und filtern teils im Speicher:

| Endpunkt | Problem |
|----------|---------|
| `GET /events` | `collection('events').get()` – kein `limit`, kein Cursor |
| `GET /businesses` | `collection('businesses').get()` – inkl. vollem `customers[]` pro Partner |
| `GET /special-polls` | Vollscan + Filter `status` / `isHighlighted` in Node |
| `getAllUserProfilesWithIds()` | Vollscan aller User – u. a. für Push-Notifications bei `NEW_BUSINESS` |

**Empfehlung:**

1. **Cursor-basierte Pagination** (`limit`, `startAfter`, `updatedAt`/`createdAt` als Sortierfeld) für Listen-Endpunkte.
2. **List-DTOs** ohne schwere Felder (`customers`, `responses`, große `imageUrls`-Arrays) – Detail-Endpunkt liefert Vollbild.
3. **Firestore-Queries** statt In-Memory-Filter (`where('status', '==', 'ACTIVE')` wie bereits bei Curated Spots).
4. Für Notifications: **Topic-basiertes FCM** oder **Firestore-Query auf `notificationPreferences.newBusinesses == true`** statt alle Profile zu laden.

**Impact:** Weniger Firestore-Reads, kleinere JSON-Payloads, schnellere App-Starts (besonders Flutter Cold Start).

#### Schwere Business-Listen

`GET /businesses` liefert jeden Partner mit kompletter Scan-Historie (`customers[]`). Das wächst linear mit Nutzung.

**Empfehlung:** Öffentliche Liste ohne `customers`; Partner-Portal-Endpunkt `GET /businesses/:id/scans` (paginiert) oder Nutzung von `pass-scans` (bereits unter `users/{id}/pass-scans`).

Siehe auch: [flutter-city-pass-stats-integration.md](./flutter-city-pass-stats-integration.md)

---

### 2.2 Mittel – Vorhandene Bausteine besser nutzen (umgesetzt)

#### DataLoader

`UserProfileLoader` ist in `DirectChatsService`, `DirectMessagesService` und `NewsService` (request-scoped) eingebunden.

#### Caching ausbauen (umgesetzt)

Keywords, App-Settings, Taxi-Stands, Legal Documents und HERE Location API sind gecacht. Event-Listen-Caching folgt mit Pagination (§2.1). Shared Cache (Redis) ist bewusst **nicht** aktiv – siehe [configuration-values.md](./configuration-values.md) (Zukünftige Option: Shared Cache).

#### HERE Location API

`GET /location/search` und `/reverse` rufen externe APIs auf – guter Kandidat für kurzes Caching (z. B. 24 h für identische Koordinaten bei Reverse Geocode).

Siehe: [location-api.md](./location-api.md)

---

### 2.3 Niedrig – Code-Qualität & Wartbarkeit

#### Duplizierte `removeUndefined`-Hilfen

~30 Dateien enthalten identische Firebase-Konvertierungslogik. Zentralisierung in `src/firebase/firebase-data.utils.ts` reduziert Fehlerrisiko und Bundle-Duplikate leicht.

#### Architektur-Inkonsistenz

`docs/architecture.md` beschreibt hexagonale Schichten; die Realität ist gemischt (z. B. `EventsService` direkt mit Firestore). Schrittweise Migration der größten Module (Events, Businesses) würde Testbarkeit und gezieltes Caching erleichtern – kein direkter Runtime-Gewinn, aber langfristig weniger Regressionen.

---

## 3. Build-Größe & Deployment

> Hinweis: „Build Size“ betrifft hier primär **Docker-Image**, **node_modules** (~520 MB lokal) und **dist** (~5 MB). Flutter-App-Größe wird indirekt durch kleinere API-Payloads beeinflusst.

### 3.1 Docker-Image – größter Hebel

**Status (2026-06-16): umgesetzt** — Multi-Stage-`Dockerfile` + `.dockerignore`.

| Vorher (VPS) | Nach Deploy (erwartet) |
|--------------|------------------------|
| Prod-Image ~2,96 GB | ~400–600 MB |
| Dev-Image ~2,14 GB | ~400–600 MB |
| Chromium-Layer ~680 MB | entfernt |
| `npm install` inkl. Dev-Deps ~1,3 GB | Runtime nur `npm ci --omit=dev` |

**Umgesetzte Maßnahmen:**

| Maßnahme | Nutzen |
|----------|--------|
| Multi-Stage Build | Builder-Stage mit `npm ci && npm run build`, Runtime nur `dist` + prod-deps |
| Chromium + Puppeteer-ENV entfernt | ~680 MB weniger; kein Puppeteer-Runtime-Cache |
| `npm ci --omit=dev` in Runtime | Keine Jest/ESLint/TypeScript im Image |
| `.dockerignore` | Keine Tests, Docs, `.git` im Build-Kontext |
| `node dist/main.js` statt `nest start` | Kein `@nestjs/cli` zur Laufzeit nötig |
| `USER node` | Läuft nicht als root |

**Offen:**

| Maßnahme | Nutzen |
|----------|--------|
| `NODE_ENV=prd` + kein Swagger | Weniger Startup-Memory |

### 3.2 npm-Dependencies bereinigen

| Paket | Beobachtung | Empfehlung |
|-------|-------------|------------|
| `date-fns` | In `package.json`, **nicht** in `src/` importiert | Entfernen |
| `luxon` | Tatsächlich genutzt (`DateTimeUtils`, Pass-Stats) | Behalten; `date-fns` streichen |
| `firebase` (Client SDK) | Nur `FirebaseService.getClientFirestore()` – Runtime-Nutzung fraglich | Prüfen, ob vollständig durch `firebase-admin` ersetzbar; Client-SDK spart ~MB im Bundle |
| `@nestjs/swagger` + `swagger-ui-express` | Immer in `main.ts` aktiv | Nur bei `NODE_ENV !== 'prd'` registrieren |

### 3.3 TypeScript-Build

`tsconfig.json`: `sourceMap: true` – in Produktion deaktivieren (`tsconfig.build.json` → `"sourceMap": false`) spart Dateien und leicht Speicher.

### 3.4 Ungenutztes Modul

`BlogPostsModule` existiert (`src/blog-posts/`), ist aber **nicht** in `AppModule` importiert.

**Option A:** Modul aktivieren, wenn Feature geplant.  
**Option B:** Code entfernen oder archivieren, um Verwirrung und toten Code zu vermeiden.

---

## 4. API-Design für bessere Client-Performance

Diese Maßnahmen entlasten vor allem die **Flutter-App** (weniger Parsing, weniger Speicher, schnellere Screens).

### 4.1 Aggregierter Bootstrap-Endpunkt

Viele Screens brauchen beim Start: App-Settings, Kategorien, Keywords, Downtime-Status, ggf. App-Version.

**Vorschlag:** `GET /bootstrap` oder `GET /app-config` liefert ein kompaktes Bundle (nur IDs + Namen + Flags). Reduziert 5–8 Roundtrips auf 1.

### 4.2 Feld-Selektion

Query-Parameter `?fields=id,name,logoUrl,categoryIds` oder vordefinierte Views (`?view=list` vs `?view=detail`).

### 4.3 HTTP-Caching-Header

Für selten ändernde Ressourcen (Legal Documents, Kategorien): `Cache-Control: public, max-age=300` + `ETag` aus `updatedAt`.

### 4.4 Kompression

Express-Compression-Middleware (`compression`) für JSON > 1 KB – besonders bei Event-/Business-Listen.

---

## 5. Feature-Empfehlungen (Backend-ready / wenig Aufwand)

Basierend auf vorhandenen Modulen, Doku und Datenmodellen.

### 5.1 City Pass & Partner-Ökosystem

| Feature | Basis im Backend | Aufwand |
|---------|------------------|---------|
| **Geschätzte Ersparnis** in Pass-Stats | `price` + `benefit`-Snapshot bereits gespeichert; Regel serverseitig optional | Klein |
| **Partner-Dashboard** (Scans pro Monat) | `pass-scans` + `businesses` | Mittel |
| **„Meist besuchte Partner“** | Aggregation über `users/{id}/pass-scans` | Mittel |
| **Google Wallet Pass** | Apple Wallet via `passkit-generator` existiert | Groß |

Docs: [flutter-city-pass-stats-integration.md](./flutter-city-pass-stats-integration.md), [business-user-notifications.md](./business-user-notifications.md)

### 5.2 Curated Spots

| Feature | Basis | Aufwand |
|---------|-------|---------|
| **Favoriten / „Meine Spots“** | User-Profile erweiterbar (`favoriteSpotIds`) | Klein |
| **„In der Nähe“** | `latitude`/`longitude` in Spots + HERE API | Mittel |
| **User-Ratings** (öffentlich) | Settings + Submit bereits vorhanden | Klein (Flutter) |
| **Spot-Empfehlungen** | Keywords + Ratings + Geo | Mittel |

Docs: [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md), [curated-spots-ratings-flutter-integration.md](./curated-spots-ratings-flutter-integration.md)

### 5.3 Events & Community

| Feature | Basis | Aufwand |
|---------|-------|---------|
| **Event-Erinnerungen** (24h / 1h) | `favoriteEventIds`, `dailyTimeSlots` – Doku vorhanden | Mittel (`@nestjs/schedule`) |
| **„Events diese Woche“** | Gefilterte Query auf `dailyTimeSlots` | Klein |
| **CSV-Import-Status** für Admins | [csv-event-import.md](./csv-event-import.md) | Klein |
| **Pending-Events Workflow** | Bereits `PENDING` → `approve` | Flutter Admin |

Docs: [events-api.md](./events-api.md), [notification-suggestions.md](./notification-suggestions.md)

### 5.4 Notifications (offene Punkte aus Doku)

Noch nicht oder teilweise umgesetzt laut [notification-suggestions.md](./notification-suggestions.md):

- `NEW_JOB_OFFER`
- `NEW_NEWS`
- `NEW_SURVEY` (Special Polls)
- `EVENT_REMINDER` (Scheduled Job)

**Zusätzliche Ideen:**

- Push bei **neuem Curated Spot** in favorisierten Keywords
- Push bei **Pass-Milestone** („10. Scan dieses Jahr“)
- Stille Stunden / Do-Not-Disturb in `notificationPreferences`

### 5.5 Saisonale & Gamification-Features

Bereits im Backend, Integration in App prüfbar:

| Modul | Möglichkeit |
|-------|-------------|
| `advent-calendar` | Tägliche Überraschungen im Dezember |
| `easter-egg-hunt` | Standortbasierte Sammel-Events |
| `special-polls` | Community-Umfragen mit Highlight-Flag |
| `feature-requests` | In-App Feedback mit Upvotes |

### 5.6 Infrastruktur & Admin

| Feature | Nutzen |
|---------|--------|
| **Blog Posts aktivieren** | Content-Marketing in App |
| **Taxi-Stands Karte** | [taxi-stands-app-integration.md](./taxi-stands-app-integration.md) |
| **Downtime-Banner** | `downtime`-Modul für Wartungsmodus |
| **Feature Flags** via `app-settings` | Rollouts ohne App-Release |
| **Webhook für Partner-CRM** | Bei Scan: POST an Partner-URL |

### 5.7 Suche

Aktuell: Prefix-Suche bei Curated Spots, HERE für Adressen. Für globale Suche (Events + Businesses + Spots):

- **Kurzfristig:** Kombinierter Endpoint, der parallel 3 Firestore-Queries mit `limit` ausführt
- **Langfristig:** Algolia / Typesense / Firestore Extension für Volltext

---

## 6. Priorisierte Roadmap (Vorschlag)

### Phase 1 – Quick Wins (1–2 Sprints)

1. Chromium aus Dockerfile entfernen (falls bestätigt unnötig)
2. `date-fns` entfernen, Swagger nur in dev
3. List-DTOs für Businesses ohne `customers`
4. `BlogPostsModule` aktivieren oder entfernen
5. Multi-Stage Docker Build

### Phase 2 – Performance (2–4 Sprints)

1. Pagination für Events & Businesses
2. Notification-Query statt `getAllUserProfilesWithIds`
3. Caching für Keywords, App-Settings, Taxi-Stands
4. `UserProfileLoader` in Chat-Modulen
5. Optional: `GET /bootstrap`

### Phase 3 – Features (nach Produkt-Priorität)

1. Pass-Stats Erweiterungen (Ersparnis, Partner-Insights)
2. Event-Reminders (`@nestjs/schedule`)
3. Curated Spots: Favoriten + Nearby
4. Offene Notifications (`NEW_NEWS`, `NEW_JOB_OFFER`, …)
5. Google Wallet

---

## 7. Metriken & Validierung

Ohne Messung sind Optimierungen schwer einzuordnen. Empfohlen:

| Metrik | Ziel |
|--------|------|
| p95 Latenz `GET /events`, `GET /businesses` | < 500 ms bei aktueller Datenmenge |
| Firestore Reads pro App-Start | Deutliche Reduktion nach Bootstrap-Endpunkt |
| Docker-Image-Größe | −30 % nach Chromium-Entfernung + multi-stage |
| 429-Rate (Throttler) | Monitoring; ggf. höhere Limits für Read-Endpunkte |
| Cache-Hit-Rate | Logging in Category-/User-Services |

Health-Checks existieren bereits: `GET /health`, `GET /health/detailed` – siehe [configuration-values.md](./configuration-values.md).

---

## 8. Risiken & Trade-offs

| Maßnahme | Risiko |
|----------|--------|
| Aggressives Caching | Veraltete Daten – **immer** Cache-Invalidierung bei Writes |
| Pagination | Breaking Change für Clients – Versionierung oder `?legacy=true` Übergangsphase |
| Swagger nur in dev | Weniger API-Discovery in prd – OpenAPI-JSON separat hosten |
| Firebase-Client-SDK entfernen | Regression in Edge-Cases – Tests vor Entfernung |
| In-Memory-Cache (Single Container) | Cache leer nach Container-Restart; bei Skalierung auf mehrere Backend-Instanzen kein geteilter Cache |
| Topic-Notifications | Weniger granular als per-User – Präferenzen schwieriger |
| Shared Cache (Redis, zukünftig) | Zusätzlicher Compose-Service auf dem VPS; lohnt sich erst bei mehreren Backend-Replikas oder Cache über Restarts hinweg |

---

## 9. Zusammenfassung

Das Backend ist **funktionsreich und gut dokumentiert**, hat aber **Skalierungsengpässe** bei Vollscans (Events, Businesses, User für Push) und **Deployment-Overhead** (Chromium ohne Puppeteer, volle dev-Dependencies im Image). Die größten Performance-Gewinne liegen in **kleineren Payloads**, **Pagination** und **gezieltem Caching** – nicht in Mikro-Optimierungen.

Für Features bietet die Codebase viele **fast fertige Bausteine**: Pass-Stats, Curated Spots mit Ratings, Wallet, saisonale Module, Notification-Infrastruktur und Location-API. Die Produktentscheidung sollte steuern, welche Module in der Flutter-App als Nächstes angebunden werden.

---

**Verwandte Dokumentation**

- [architecture.md](./architecture.md)
- [configuration-values.md](./configuration-values.md)
- [notification-suggestions.md](./notification-suggestions.md)
- [flutter-city-pass-stats-integration.md](./flutter-city-pass-stats-integration.md)
- [events-api.md](./events-api.md)
- [curated-spots-admin-integration.md](./curated-spots-admin-integration.md)
