# CONSTITUTION — Citylife Backend
> Kanonische Referenz für Architektur, Regeln, Konfiguration und API-Verträge.
> Client-Integration, Audits und Roadmap: [`docs/app_review.html`](docs/app_review.html)
> Coding-Standards: [`.cursorrules`](.cursorrules)

---

## 1. Governance

- Alle Endpunkte erfordern Firebase-Auth (inkl. anonym).
- `RolesGuard`-Module müssen `UsersModule` importieren.
- Ressourcen-Ownership: `req.user.uid` muss `:id` entsprechen oder Aufrufer ist `super_admin`.
- Mutationen: explizite Guards + strikte DTOs (`ValidationPipe`: `whitelist`, `forbidNonWhitelisted`, `transform`).
- Read-heavy Module: Caching mit Invalidierung bei Writes (siehe §3).
- Tests sind Pflicht für neue Features (siehe `.cursorrules`).

### Erzwungene Sicherheitsmuster (Audit 2026-07-29)

- Ownership-Prüfung auf `/users/:id/*`-Mutationen
- Rollen aus JWT, nicht aus URL-Parametern
- `RolesGuard` auf Business-Mutationen + `verifyBusinessAccessOrSuperAdmin()`
- Globaler `@Catch()` Exception-Filter
- Controller-Transformationen in Mapper/Services auslagern

---

## 2. Architektur

## ADR-001: Pragmatisches Modul-Layout (2026-06-22)

**Status:** Angenommen  
**Kontext:** Ponytail-Audit Phase 08 – das Repo nutzte zwei parallele Muster (hexagonal/DDD vs. flache Services). Dieses Dokument ist die verbindliche Referenz.

### Entscheidungs-Checkliste

| Frage | Antwort | Konsequenz |
|-------|---------|------------|
| Plan für zweites Persistence-Backend? | **Nein** (nur Firebase/Firestore) | Repository-Abstraktion bringt keinen unmittelbaren Nutzen |
| Testbarkeit via Repository-Mocks harte Anforderung? | **Nein** | Services werden mit gemocktem `FirebaseService` getestet (wie `events`, `news`) |
| Team akzeptiert Architektur-Update? | **Ja** | Dieses Dokument ist die verbindliche Referenz |

### Gewählte Option: **A – Pragmatisch (alles flach)**

Neue und migrierte Module folgen dem flachen NestJS-Modul-Pattern. Repository-Interfaces, DI-Tokens und Entity-Klassen mit `create`/`fromProps`/`update`/`toJSON` werden schrittweise entfernt (Ponytail-Audit Phase 09/10).

**Abgelehnte Alternativen:**

- **Option B (strikt hexagonal):** Einheitlich, aber ~5.000 LOC Mehraufwand ohne zweites Backend.
- **Option C (Hybrid dauerhaft):** Zwei Patterns parallel pflegen – höherer Wartungsaufwand ohne klaren Exit.

### Konsequenzen für Ponytail-Audit Phase 09/10

| Phase | Aktion | Status nach Entscheidung |
|-------|--------|--------------------------|
| **09 – Repositories flatten** | Firebase-Repositories und Domain-Repository-Interfaces in Services konsolidieren | **Ausführen** (modulweise, klein zuerst) |
| **10 – Entities flatten** | Entity-Klassen durch `interface`-Types ersetzen | **Ausführen** (nach Phase 09 pro Modul) |
| **11 – Business Value Objects** | Unverändert abhängig von Phase 10 | Wie in Plan 11 beschrieben |

**Regeln bis Migration abgeschlossen:**

- **Neue Module:** ausschließlich flaches Pattern (siehe unten).
- **Bestehende DDD-Module:** nicht erweitern (keine neuen Repositories/Entities); bei Änderungen bevorzugt im Rahmen von Phase 09/10 migrieren.

---

## Ziel-Modul-Layout (Soll)

Jedes Feature-Modul unter `src/<feature>/`:

```
src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts          # oder application/controllers/
├── <feature>.service.ts             # oder application/services/
├── interfaces/                      # Plain TypeScript interfaces
├── dto/
├── enums/                           # optional
└── *.spec.ts                        # Unit-Tests neben der Implementierung
```

### Service-Pattern

Services injizieren `FirebaseService` (und ggf. weitere Nest-Services) direkt und kapseln Firestore-Zugriff:

```typescript
@Injectable()
export class EventsService {
  private readonly collection = 'events';

  constructor(private readonly firebaseService: FirebaseService) {}

  async findById(id: string): Promise<Event> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) throw new NotFoundException();
    return { id: doc.id, ...doc.data() } as Event;
  }
}
```

Referenz-Implementierungen: `src/events/events.service.ts`, `src/news/news.service.ts`.

### Types statt Entity-Klassen

```typescript
// interfaces/event.interface.ts
export interface Event {
  id: string;
  title: string;
  createdAt: Date;
  // ...
}
```

Kein `create`/`fromProps`/`update`/`toJSON`-Boilerplate. Updates als Plain Objects; vor dem Speichern `removeUndefined` aus `src/firebase/firebase-mapper.util.ts` verwenden.

### Tests

- Externe Abhängigkeiten mocken (`FirebaseService`, andere Services).
- Arrange-Act-Assert; Erfolgs-, Fehler- und Randfälle abdecken.
- Bei read-heavy Endpoints: Caching wie in `src/event-categories/services/event-categories.service.ts` (siehe §3 Konfiguration).

### Caching (Pflicht für neue read-heavy Module)

Siehe `.cursorrules` – globaler `CACHE_MANAGER`, TTL in §3 Konfiguration, Invalidierung bei Writes, Tests für Hit/Miss/Invalidierung.

---

## Ist-Zustand: DDD-Module (werden migriert)

Diese Module nutzen noch `domain/`, `application/`, `infrastructure/` mit Repository-Interfaces und Entity-Klassen. Sie bleiben funktionsfähig, werden aber in Phase 09/10 auf das flache Pattern umgestellt:

| Modul | Merkmale |
|-------|----------|
| `businesses` | Entity + Firebase-Repository |
| `business-categories` | Entity + Firebase-Repository |
| `direct-chats` | Mehrere Repositories, komplex |
| `curated-spots` | Entity + mehrere Repositories |
| `taxi-stands` | Entity + Firebase-Repository |
| `chatrooms` | Entity + Firebase-Repository |
| `job-offers`, `job-offer-categories` | Entity + Firebase-Repository |
| `feature-requests`, `contact`, `legal-documents` | Entity + Firebase-Repository |
| `app-settings`, `app-versions` | Entity + Firebase-Repository |
| `advent-calendar`, `easter-egg-hunt` | Entity + Firebase-Repository |
| `pass-stats` | Entity + Firebase-Repository |

## Ist-Zustand: Flache Module (Referenz)

Bereits im Ziel-Pattern: `events`, `news`, `keywords`, `blog-posts`, `special-polls`, `users`, `event-categories`, u. a.

---

## Firebase-Persistenz

### Datenkonvertierung

1. **Keine `undefined`-Werte** – vor dem Speichern `removeUndefined` aus `src/firebase/firebase-mapper.util.ts` nutzen (nicht pro Repository duplizieren).

2. **Timestamps** – Firebase `Timestamp` bei Reads nach `Date` konvertieren:
   ```typescript
   createdAt: data.createdAt?.toDate?.() || data.createdAt,
   ```

3. **IDs** – Firestore-Dokument-ID als `id`-Feld im zurückgegebenen Interface führen.

### Best Practices

- Validierung in DTOs (class-validator) und ggf. in Services.
- Batch-Operationen und Transaktionen für mehrere Schreibvorgänge.
- Firebase-Fehler loggen; Domain-spezifische Nest-Exceptions (`NotFoundException`, `BadRequestException`) nach außen.
- Indizes für häufig gefilterte Felder in Firestore pflegen.

---

## Querverweise

- Ponytail-Audit Übersicht: `.cursor/plans/ponytail-audit-2026-06-20-overview.plan.md`
- Phase 09 (Repositories): `.cursor/plans/ponytail-audit-09-flatten-repositories.plan.md`
- Phase 10 (Entities): `.cursor/plans/ponytail-audit-10-flatten-entities.plan.md`
- Firebase-Mapper: `src/firebase/firebase-mapper.util.ts`
- Coding-Standards: `.cursorrules`

---

## 3. Konfiguration

Dieses Dokument erläutert alle gesetzten Konfigurationswerte für Rate-Limiting, Caching, DataLoader und Health-Checks. Es erklärt die Begründung für jeden Wert und gibt Empfehlungen für Anpassungen.

## Inhaltsverzeichnis

1. [Rate-Limiting](#rate-limiting)
2. [Caching](#caching)
3. [User-Profile Batch-Load](#user-profile-batch-load)
4. [Health-Checks](#health-checks)
5. [Umgebungsabhängige Konfigurationen](#umgebungsabhängige-konfigurationen)
6. [Performance-Überlegungen](#performance-überlegungen)
7. [Best Practices](#best-practices)
8. [Zeitzonen-Strategie](#zeitzonen-strategie)

---

## Rate-Limiting

Rate-Limiting schützt die API vor DDoS-Angriffen und Brute-Force-Attacken.

### TTL (Time To Live)

- **Wert:** 60000ms (60 Sekunden)
- **Begründung:** 60 Sekunden ist ein Standard-Zeitfenster für Rate-Limiting. Es bietet einen guten Kompromiss zwischen Sicherheit und Benutzerfreundlichkeit.
- **Warum dieser Wert:**
  - Kurz genug, um bei legitimer Nutzung nach Überschreitung schnell wieder freigegeben zu werden
  - Lang genug, um effektiven Schutz gegen schnelle automatisierte Anfragen zu bieten
  - Standard in der Branche für API-Rate-Limiting
- **Anpassung:** 
  - Kann für verschiedene Umgebungen angepasst werden
  - Kürzere Zeitfenster (30s) für strengere Limits
  - Längere Zeitfenster (120s) für entspanntere Limits

### Limit

- **Wert:** 60 Anfragen pro Zeitfenster (Production), 100 (Development)
- **Begründung:** 
  - 60 Anfragen pro Minute ist ein moderater Wert, der legitime API-Nutzung erlaubt
  - Entspricht 1 Anfrage pro Sekunde im Durchschnitt
- **Warum dieser Wert:**
  - Verhindert Missbrauch ohne legitime Benutzer zu stark einzuschränken
  - Berücksichtigt, dass mobile Apps mehrere API-Aufrufe pro Aktion machen können
  - Höherer Wert in Development für einfacheres Testen
- **Anpassung:** 
  - Kann pro Endpoint mit `@Throttle()` Decorator angepasst werden
  - Endpoints mit `@SkipThrottle()` werden vom Rate-Limiting ausgenommen
- **Empfehlung:**
  - Authentifizierungs-Endpoints: Niedrigere Limits (z.B. 10/60s) gegen Brute-Force
  - Read-Only-Endpoints: Höhere Limits (z.B. 120/60s)
  - Health-Checks: Vom Rate-Limiting ausgenommen

### Konfiguration im Code

```typescript
// src/app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'default',
    ttl: 60000, // 60 Sekunden
    limit: process.env.NODE_ENV === 'dev' ? 100 : 60,
  },
]),
```

---

## Caching

Caching reduziert Datenbankabfragen für häufig abgerufene Daten.

### TTL (Time To Live)

- **Wert:** 300000ms (5 Minuten) global, 600000ms (10 Minuten) für Kategorien
- **Begründung:** 
  - 5 Minuten ist ein guter Kompromiss für häufig abgerufene, aber sich ändernde Daten
  - Kategorien ändern sich seltener, daher längere TTL
- **Warum dieser Wert:**
  - **User-Profiles (5 Minuten):** 
    - Ändern sich nicht häufig (Profilbild, Name)
    - Sollten nicht zu lange gecacht werden, um Aktualisierungen sichtbar zu machen
    - Cache-Invalidierung bei Updates implementiert
  - **Kategorien (10 Minuten):**
    - Ändern sich sehr selten (nur bei Admin-Aktionen)
    - Können länger gecacht werden
    - Cache-Invalidierung bei Create/Update/Delete
  - **App-Settings (5 Minuten):**
    - Ändern sich selten
    - Cache-Invalidierung bei Updates
- **Anpassung:** 
  - Pro Service/Methode mit `@CacheTTL(ms)` anpassbar
  - Für kritische Daten: Kürzere TTL (60s)
  - Für statische Daten: Längere TTL (900s)
- **Empfehlung:**
  - User-Profiles: 300s (5 Minuten)
  - Event-Kategorien: 600s (10 Minuten)
  - Business-Kategorien: 600s (10 Minuten)
  - App-Settings: 900s (15 Minuten)

### Max Items

- **Wert:** 100 Items (Production), 50 Items (Development)
- **Begründung:** 
  - 100 Items ist ein guter Startwert für in-memory Cache
  - Verhindert unbegrenztes Memory-Wachstum
- **Warum dieser Wert:**
  - Ausreichend für typische Workloads (User-Profiles, Kategorien, Settings)
  - LRU (Least Recently Used) Eviction Policy entfernt alte Einträge automatisch
  - Geringerer Wert in Development, da weniger Daten benötigt werden
- **Anpassung:** 
  - Basierend auf Memory-Verfügbarkeit und typischer Cache-Größe
  - Bei Memory-Problemen: Reduzieren auf 50-75 Items
  - Bei guter Memory-Verfügbarkeit: Erhöhen auf 150-200 Items
- **Empfehlung:**
  - Development: 50 Items (geringerer Bedarf)
  - Production: 100-200 Items (je nach Memory-Verfügbarkeit)

### Konfiguration im Code

```typescript
// src/app.module.ts
CacheModule.register({
  isGlobal: true,
  ...createCacheModuleOptions(), // src/core/cache/cache.config.ts
}),

// src/event-categories/services/event-categories.service.ts
private readonly CACHE_TTL = 600000; // 10 Minuten für Kategorien
```

### In-Memory Cache (aktuell)

- **Store:** `@nestjs/cache-manager` mit In-Memory-LRU pro Node.js-Prozess
- **Deployment:** Ein Docker-Container auf dem VPS – der Cache lebt im Prozess-Speicher dieses Containers
- **Env:** `CACHE_TTL_MS` – optional; globaler Default-TTL (Standard: 300000 ms)
- **Grenzen:** Cache wird bei Container-Neustart geleert; bei mehreren Backend-Instanzen hätte jede ihren eigenen, nicht geteilten Cache
- **Ausreichend wenn:** Ein Backend-Container, moderate Traffic-Last, TTL + Invalidierung bei Writes

### Zukünftige Option: Shared Cache (Redis)

Erst relevant, wenn das Deployment **über einen einzelnen VPS-Container** hinauswächst, z. B.:

- Mehrere Backend-Replikas (z. B. `docker compose scale` oder zweiter VPS)
- Zero-Downtime-Deploys mit kurzzeitig zwei laufenden Containern
- Bedarf an Cache-Persistenz über Restarts hinweg

**Empfohlener Ansatz auf dem VPS:** Redis als eigener Docker-Compose-Service im selben Netzwerk (`redis:6379`), Backend verbindet sich intern – kein öffentlicher Redis-Port nötig.

**Dann zu prüfen:** `cache-manager-redis-yet` oder Keyv-Redis-Store, zentraler Cache-Store in `cache.config.ts`, Health-Check, Invalidierung bleibt unverändert pro Service.

**Bis dahin:** In-Memory beibehalten – weniger Infrastruktur, ausreichend für Single-Container-VPS.

### Service-spezifische TTLs

| Ressource | Cache-Key | TTL | Invalidierung |
|-----------|-----------|-----|---------------|
| Keywords | `keywords:all` | 10 Min | Create/Update/Delete |
| App-Settings | `app-settings:all`, `app-settings:{id}` | 15 Min | Writes (wenn vorhanden) |
| Taxi-Stands | `taxi-stands:all` | 30 Min | Create/Update/Delete |
| Legal Documents (latest) | `legal-documents:latest:{type}` | 15 Min | Create |
| Location Search | `location:search:{query}` | 1 h | – |
| Location Reverse | `location:reverse:{lat}:{lng}` | 24 h | – |
| User-Profiles | `user-profile:{id}` | 5 Min | Profile-Update |
| Event-Kategorien | `event-categories:all` | 10 Min | Create/Update/Delete |
| Business-Kategorien | `business-categories:all` | 10 Min | Create/Update/Delete |
| Bootstrap Bundle | `bootstrap:public`, `bootstrap:public:{version}` | 5 Min | TTL-basiert (`userProfile` nicht im Bundle) |

---

## User-Profile Batch-Load

`UsersService.getUserProfilesByIds()` lädt mehrere Profile in einem Batch und vermeidet N+1-Queries.

### Verhalten

- **Deduplizierung:** IDs werden vor dem Laden eindeutig gemacht
- **Cache:** Treffer aus `user-profile:{id}` (5 Min TTL, siehe Caching-Tabelle)
- **Firestore:** `where('__name__', 'in', chunk)` in Chunks à **30** IDs (Firebase-Limit)
- **Rückgabe:** `Map<string, UserProfile>` – fehlende IDs sind nicht in der Map

### Verwendung

Listen-Anreicherung (z. B. Direct Chats, News): `getUserProfilesByIds(ids)` statt einzelner `getUserProfile()`-Aufrufe in Schleifen.

```typescript
// src/users/users.service.ts
const profiles = await this.usersService.getUserProfilesByIds(authorIds);
const author = profiles.get(item.createdBy);
```

---

## Health-Checks

Health-Checks ermöglichen Monitoring und Kubernetes Probes.

### Memory Heap Threshold

- **Wert:** 500MB (konfigurierbar via `MEMORY_HEAP_THRESHOLD`)
- **Begründung:** 
  - 500MB ist ein moderater Wert für Node.js Anwendungen
  - Gibt Zeit für Reaktion, bevor Out-of-Memory auftritt
- **Warum dieser Wert:**
  - Typische NestJS-Anwendung verwendet 100-300MB
  - 500MB als Warnschwelle gibt ausreichend Puffer
  - Verhindert Out-of-Memory-Fehler durch frühzeitige Warnung
- **Anpassung:** 
  - Über Environment-Variable `MEMORY_HEAP_THRESHOLD` konfigurierbar
  - Für Container mit wenig Memory: Niedriger (256MB)
  - Für größere Server: Höher (1024MB)
- **Empfehlung:**
  - Kubernetes mit 512MB Limit: 400MB Threshold
  - Kubernetes mit 1GB Limit: 800MB Threshold

### Health-Check-Endpoints

| Endpoint | Zweck | Kubernetes Probe |
|----------|-------|------------------|
| `GET /health` | Basis-Check (Service läuft) | Liveness Probe |
| `GET /health/detailed` | Alle Indikatoren | Readiness Probe |
| `GET /health/firebase` | Firebase-Verbindung | - |
| `GET /health/memory` | Memory-Status | - |

### Konfiguration im Code

```typescript
// src/health/indicators/memory-health.indicator.ts
this.heapThresholdMB = parseInt(process.env.MEMORY_HEAP_THRESHOLD || '500', 10);
```

---

## Umgebungsabhängige Konfigurationen

### Development

| Einstellung | Wert | Begründung |
|-------------|------|------------|
| Rate-Limiting | 100/60s | Höher für einfacheres Testen |
| Cache TTL | 300s | Standard (kann für Debugging reduziert werden) |
| Cache Max | 50 Items | Geringerer Bedarf |
| Memory Threshold | 500MB | Standard |

### Production

| Einstellung | Wert | Begründung |
|-------------|------|------------|
| Rate-Limiting | 60/60s | Strenger für Sicherheit |
| Cache TTL | 300s | Standard |
| Cache Max | 100 Items | Höher für bessere Performance |
| Memory Threshold | 500MB+ | Anpassbar je nach Container-Größe |

### Environment-Variablen

```bash
# Rate-Limiting (keine explizite Variable, basiert auf NODE_ENV)
NODE_ENV=prd  # Production: 60/60s
NODE_ENV=dev  # Development: 100/60s

# Memory Health-Check
MEMORY_HEAP_THRESHOLD=500  # MB, Standard: 500
```

---

## Performance-Überlegungen

### Trade-offs

#### Cache-TTL vs. Datenaktualität

- **Längere TTL:** Bessere Performance, aber möglicherweise veraltete Daten
- **Kürzere TTL:** Frischere Daten, aber mehr Datenbankabfragen
- **Empfehlung:** Cache-Invalidierung bei Writes verwenden, dann kann TTL länger sein

#### Cache-Size vs. Memory-Verbrauch

- **Mehr Items:** Bessere Hit-Rate, aber höherer Memory-Verbrauch
- **Weniger Items:** Geringerer Memory-Verbrauch, aber mehr Cache-Misses
- **Empfehlung:** Monitoring der Cache-Hit-Rate, Anpassung basierend auf Metriken

#### Rate-Limiting vs. Benutzerfreundlichkeit

- **Strenge Limits:** Besserer Schutz, aber mögliche False-Positives
- **Lockere Limits:** Bessere UX, aber weniger Schutz
- **Empfehlung:** Monitoring der 429-Responses, Anpassung basierend auf Daten

---

## Best Practices

### Monitoring

1. **Cache-Hit-Rate überwachen:**
   - Niedrige Hit-Rate → TTL erhöhen oder Max erhöhen
   - Hohe Hit-Rate → Konfiguration ist optimal

2. **Rate-Limit-Überschreitungen überwachen:**
   - Viele 429-Responses → Limits möglicherweise zu streng
   - Keine 429-Responses → Limits möglicherweise zu locker

3. **Memory-Auslastung überwachen:**
   - Regelmäßig über Threshold → Threshold erhöhen oder Caching reduzieren
   - Selten über Threshold → Konfiguration ist optimal

### Wann anpassen?

#### Cache-TTL erhöhen wenn:
- Daten ändern sich sehr selten
- Hohe Datenbank-Last
- Niedrige Cache-Hit-Rate

#### Cache-TTL verringern wenn:
- Benutzer beschweren sich über veraltete Daten
- Daten ändern sich häufig
- Cache-Invalidierung nicht zuverlässig

#### Rate-Limits anpassen wenn:
- Legitime Benutzer werden geblockt (erhöhen)
- Verdächtige Aktivitäten beobachtet (verringern)
- Neue Use-Cases mit mehr API-Calls (erhöhen)

### Beispiel für Anpassung

```typescript
// Für einen Endpoint mit vielen Aufrufen
@Throttle({ default: { limit: 120, ttl: 60000 } })
@Get('popular-endpoint')
async getPopular() { ... }

// Für einen sensiblen Endpoint
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() { ... }

// Für Health-Checks (kein Rate-Limiting)
@SkipThrottle()
@Get('health')
async health() { ... }
```

---

## Zusammenfassung

| Komponente | Wert | Umgebung |
|------------|------|----------|
| Rate-Limit TTL | 60s | Alle |
| Rate-Limit | 60/60s | Production |
| Rate-Limit | 100/60s | Development |
| Cache TTL | 5 Min | Alle |
| Cache TTL Bootstrap Bundle | 5 Min | Alle |
| Cache TTL Kategorien | 10 Min | Alle |
| Cache TTL Keywords | 10 Min | Alle |
| Cache TTL App-Settings | 15 Min | Alle |
| Cache TTL Taxi-Stands | 30 Min | Alle |
| Cache TTL Legal Documents | 15 Min | Alle |
| Cache TTL Location Search | 1 h | Alle |
| Cache TTL Location Reverse | 24 h | Alle |
| Cache Max | 100 | Production |
| Cache Max | 50 | Development |
| Cache Store | In-Memory (pro Container) | Alle |
| DataLoader Cache | true | Alle |
| DataLoader Batch | true | Alle |
| Memory Threshold | 500MB | Alle (anpassbar) |

---

## Zeitzonen-Strategie

**Strategie:** Berlin everywhere (Option B)

| Schicht | Verhalten |
|---------|-----------|
| Persistenz (`createdAt`, `updatedAt`, …) | `DateTimeUtils.getBerlinTime()` – ISO-String mit Berlin-Offset |
| API-Response (Entity-Felder) | Keine Konvertierung – Werte werden wie in Firestore gespeichert zurückgegeben |
| API-Envelope (`timestamp` in Response/Errors) | `DateTimeUtils.getBerlinTime()` |

- **Utility:** `src/utils/date-time.utils.ts` – nur `getBerlinTime()`
- **Hinweis:** Ältere Dokumente mit UTC-Timestamps (`…Z`) werden nicht automatisch konvertiert

---

**Letzte Aktualisierung:** 20. Juni 2026

---

## 4. Firebase

### 4.1 Persistenz

- `removeUndefined` aus `src/firebase/firebase-mapper.util.ts` vor jedem Write
- Timestamps: `data.createdAt?.toDate?.() || data.createdAt`
- Firestore-Dokument-ID als `id` im zurückgegebenen Interface

### 4.2 FCM (Server)

Diese Anleitung beschreibt, welche Konfigurationen in der Firebase Console vorgenommen werden müssen, damit Push-Notifications funktionieren.

## Übersicht

Das Backend verwendet Firebase Admin SDK, um Push-Notifications über Firebase Cloud Messaging (FCM) zu senden. Die folgenden Schritte müssen in der Firebase Console durchgeführt werden.

---

## 1. Firebase Cloud Messaging API aktivieren

**Wichtig:** Dieses Backend verwendet das **Firebase Admin SDK**, welches automatisch die moderne **FCM HTTP v1 API** verwendet. Die Legacy API ist nicht erforderlich.

### FCM HTTP v1 API (aktuell verwendet)

Das Backend verwendet bereits die moderne FCM v1 API über das Firebase Admin SDK:

- ✅ **Automatisch aktiviert** durch Verwendung des Admin SDKs
- ✅ **Sicherer:** Verwendet OAuth 2.0 Tokens statt statischer Server Keys
- ✅ **Mehr Features:** Platform-spezifische Felder, bessere Analytics
- ✅ **Keine Migration nötig:** Die Implementierung ist bereits auf dem neuesten Stand

### Legacy API (nicht verwendet)

Die "Legacy API" bezieht sich auf die direkten HTTP/XMPP APIs, die **nicht** von diesem Backend verwendet werden. Diese wurden im Juni 2024 eingestellt, betrifft aber nicht unsere Implementierung.

**Hinweis:** Falls Sie in der Firebase Console "Cloud Messaging API (Legacy)" sehen, können Sie diese ignorieren, da wir das Admin SDK verwenden, das automatisch die v1 API nutzt.

---

## 2. Service Account Berechtigungen prüfen

Das Backend verwendet Service Account Credentials (definiert in `GOOGLE_APPLICATION_CREDENTIALS`) für die **FCM HTTP v1 API**. Stellen Sie sicher, dass der Service Account folgende Berechtigungen hat:

1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
2. Wählen Sie Ihr Firebase-Projekt aus
3. Gehen Sie zu **IAM & Admin** → **Service Accounts**
4. Finden Sie den Service Account, der für Firebase verwendet wird
5. Prüfen Sie, dass folgende Rollen zugewiesen sind:
   - **Firebase Admin SDK Administrator Service Agent** (empfohlen)
   - Oder **Firebase Admin** (für vollständigen Zugriff)

**Wichtig für FCM v1 API:**
- Der Service Account benötigt die Berechtigung, OAuth 2.0 Access Tokens zu generieren
- Die Rolle `roles/firebase.admin` oder `roles/firebase.sdkAdminServiceAgent` enthält alle notwendigen Berechtigungen
- **Kein Server Key erforderlich:** Die v1 API verwendet keine statischen Server Keys mehr

---

## 3. iOS: APNs (Apple Push Notification Service) konfigurieren

Für iOS-Apps müssen APNs-Zertifikate in Firebase hochgeladen werden. Sie haben zwei Optionen:

### 3.1 APNs Authentication Key (.p8) - EMPFOHLEN

**Vorteile:**
- Funktioniert für alle Apps in Ihrem Apple Developer Account
- Muss nicht jährlich erneuert werden
- Einfacher zu verwalten

**Schritte zur Erstellung:**

1. **Gehen Sie zum Apple Developer Portal:**
   - https://developer.apple.com/account/
   - Melden Sie sich mit Ihrem Apple Developer Account an

2. **Navigieren Sie zu Keys:**
   - Klicken Sie auf **Certificates, Identifiers & Profiles** (oder direkt: https://developer.apple.com/account/resources/authkeys/list)
   - Wählen Sie **Keys** in der linken Sidebar
   - Klicken Sie auf das **+** Symbol (neuer Key)

3. **Key erstellen:**
   - Geben Sie einen **Key Name** ein (z.B. "Firebase APNs Key")
   - Aktivieren Sie **Apple Push Notifications service (APNs)**
   - Klicken Sie auf **Continue**
   - Bestätigen Sie die Erstellung

4. **Key herunterladen:**
   - **WICHTIG:** Laden Sie die `.p8` Datei sofort herunter - Sie können sie später nicht mehr herunterladen!
   - Notieren Sie sich die **Key ID** (wird angezeigt)
   - Notieren Sie sich Ihre **Team ID** (finden Sie oben rechts im Apple Developer Portal)

5. **In Firebase hochladen:**
   - Gehen Sie zur Firebase Console → **Project Settings** → **Cloud Messaging**
   - Scrollen Sie zu **Apple app configuration**
   - Klicken Sie auf **Upload** unter **APNs Authentication Key**
   - Laden Sie die `.p8` Datei hoch
   - Geben Sie die **Key ID** und **Team ID** ein
   - Klicken Sie auf **Upload**

### 3.2 APNs Certificate (.p12) - Alternative

**Vorteile:**
- Funktioniert auch, aber muss jährlich erneuert werden
- Pro App erforderlich

**Schritte zur Erstellung:**

1. **Gehen Sie zum Apple Developer Portal:**
   - https://developer.apple.com/account/
   - Melden Sie sich mit Ihrem Apple Developer Account an

2. **Navigieren Sie zu Certificates:**
   - Klicken Sie auf **Certificates, Identifiers & Profiles**
   - Wählen Sie **Certificates** in der linken Sidebar
   - Klicken Sie auf das **+** Symbol (neues Zertifikat)

3. **Zertifikat-Typ wählen:**
   - Wählen Sie **Apple Push Notification service SSL (Sandbox & Production)**
   - Klicken Sie auf **Continue**

4. **App ID auswählen:**
   - Wählen Sie die **App ID** Ihrer iOS-App aus
   - Klicken Sie auf **Continue**

5. **Certificate Signing Request (CSR) erstellen:**
   - Öffnen Sie **Keychain Access** auf Ihrem Mac
   - Gehen Sie zu **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - Geben Sie Ihre E-Mail-Adresse ein
   - Wählen Sie **Saved to disk**
   - Speichern Sie die `.certSigningRequest` Datei

6. **CSR hochladen:**
   - Laden Sie die `.certSigningRequest` Datei im Apple Developer Portal hoch
   - Klicken Sie auf **Continue**

7. **Zertifikat herunterladen:**
   - Laden Sie das `.cer` Zertifikat herunter
   - Doppelklicken Sie darauf, um es in Keychain Access zu importieren

8. **.p12 Datei exportieren:**
   - Öffnen Sie **Keychain Access**
   - Finden Sie das Zertifikat (Name Ihrer App)
   - Erweitern Sie es und wählen Sie sowohl das Zertifikat als auch den privaten Schlüssel aus
   - Rechtsklick → **Export 2 items...**
   - Wählen Sie Format: **Personal Information Exchange (.p12)**
   - Geben Sie ein Passwort ein (wird später benötigt)
   - Speichern Sie die `.p12` Datei

9. **In Firebase hochladen:**
   - Gehen Sie zur Firebase Console → **Project Settings** → **Cloud Messaging**
   - Scrollen Sie zu **Apple app configuration**
   - Klicken Sie auf **Upload** unter **APNs Certificates**
   - Laden Sie die `.p12` Datei hoch
   - Geben Sie das Passwort ein (falls erforderlich)

**Wichtig:** 
- Für Production-Apps benötigen Sie ein Production-Zertifikat
- Development-Zertifikate funktionieren nur für Development-Builds
- Das Zertifikat muss jährlich erneuert werden (Authentication Key nicht!)

---

## 4. Android: Firebase Cloud Messaging konfigurieren

Für Android-Apps ist normalerweise keine zusätzliche Konfiguration erforderlich, da FCM standardmäßig aktiviert ist. Stellen Sie jedoch sicher:

1. Die Android-App ist im Firebase-Projekt registriert
2. Die `google-services.json` Datei ist in der Android-App integriert
3. Die App hat die notwendigen Berechtigungen in der `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   ```

---

## 5. Notification Channels (Android)

Das Backend verwendet den Notification Channel `direct_messages` für Android. Stellen Sie sicher, dass dieser Channel in der Android-App erstellt wird:

```dart
// Flutter/Dart Beispiel
final androidChannel = AndroidNotificationChannel(
  'direct_messages',
  'Direct Messages',
  description: 'Notifications for direct chat messages',
  importance: Importance.high,
);

await flutterLocalNotificationsPlugin
    .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
    ?.createNotificationChannel(androidChannel);
```

---

## 6. Umgebungsvariablen prüfen

Stellen Sie sicher, dass folgende Umgebungsvariablen gesetzt sind:

```bash
# Firebase Konfiguration
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Service Account Credentials
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

Die `FIREBASE_MESSAGING_SENDER_ID` wird hauptsächlich vom Client verwendet. Für das Backend ist sie nicht kritisch, da das Admin SDK die Projekt-ID verwendet. Sie finden sie in der Firebase Console unter **Project Settings** → **General** → **Your apps**.

---

## 7. Testing

### 7.1 Test-Notification senden

Sie können eine Test-Notification direkt aus der Firebase Console senden:

1. Gehen Sie zu **Cloud Messaging** → **Send test message**
2. Geben Sie einen FCM-Token ein (vom Client-App)
3. Geben Sie Titel und Text ein
4. Klicken Sie auf **Test**

### 7.2 Backend-Logs prüfen

Wenn das Backend eine Notification sendet, sollten Sie in den Logs sehen:

```
[FcmNotificationService] Sending notification to user <userId>
[FcmNotificationService] Notification sent successfully to device <deviceId>
```

Bei Fehlern:
```
[FcmNotificationService] Error sending notification to device <deviceId>: <error>
```

---

## 8. Häufige Probleme

### Problem: "messaging/invalid-registration-token"

**Ursache:** Der FCM-Token ist ungültig oder abgelaufen.

**Lösung:** 
- Der Client muss einen neuen Token abrufen und registrieren
- Das Backend entfernt automatisch ungültige Tokens

### Problem: "messaging/registration-token-not-registered"

**Ursache:** Der Token wurde nicht registriert oder wurde bereits entfernt.

**Lösung:**
- Der Client muss den Token erneut registrieren
- Prüfen Sie, ob der Token korrekt im UserProfile gespeichert ist

### Problem: iOS-Notifications funktionieren nicht

**Ursache:** APNs-Zertifikat fehlt oder ist falsch konfiguriert.

**Lösung:**
- Laden Sie das APNs-Zertifikat oder Authentication Key hoch
- Stellen Sie sicher, dass es für die richtige Umgebung (Development/Production) ist
- Prüfen Sie die Key ID und Team ID

### Problem: Android-Notifications funktionieren nicht

**Ursache:** Notification Channel fehlt oder falsche Konfiguration.

**Lösung:**
- Stellen Sie sicher, dass der Channel `direct_messages` in der App erstellt wurde
- Prüfen Sie die Android-Berechtigungen
- Prüfen Sie, ob `google-services.json` korrekt integriert ist

---

## 9. Weitere Ressourcen

- [Firebase Cloud Messaging Dokumentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK für Node.js](https://firebase.google.com/docs/admin/setup)
- [APNs Authentication Key Setup](https://firebase.google.com/docs/cloud-messaging/ios/certs)

---

## Checkliste

- [ ] Service Account hat Firebase Admin SDK Administrator Service Agent Berechtigung
- [ ] Service Account JSON-Datei ist in `GOOGLE_APPLICATION_CREDENTIALS` konfiguriert
- [ ] APNs-Zertifikat/Authentication Key für iOS hochgeladen (falls iOS-App vorhanden)
- [ ] Android-App ist im Firebase-Projekt registriert (falls Android-App vorhanden)
- [ ] Notification Channel `direct_messages` ist in der Android-App erstellt
- [ ] Alle Umgebungsvariablen sind gesetzt (besonders `GOOGLE_APPLICATION_CREDENTIALS`)
- [ ] Test-Notification wurde erfolgreich gesendet

**Hinweis:** Die FCM HTTP v1 API wird automatisch durch das Firebase Admin SDK verwendet - keine zusätzliche Aktivierung erforderlich.

---

## 5. API-Verträge

### 5.1 Bootstrap

Aggregierter Cold-Start-Endpunkt für die Flutter-App. Bündelt mehrere Konfigurations- und Referenzdaten in einer Antwort und reduziert parallele Requests beim App-Start.

## Endpoint

```
GET /bootstrap?version=1.2.3
Authorization: Bearer <firebase-token>
```

- **Authentifizierung:** Erforderlich (globaler `AuthGuard`, inkl. anonyme Firebase-User)
- **Query `version`:** Optional. Wenn gesetzt, enthält die Antwort `appVersion` mit Update-Check und optionalem Changelog (gleiche Logik wie `GET /app-versions/check`)

## Response

```json
{
  "appSettings": [],
  "eventCategories": [],
  "businessCategories": [],
  "keywords": [],
  "downtime": { "isDowntime": false },
  "appVersion": {
    "requiresUpdate": false,
    "changelogContent": "Optional markdown changelog"
  },
  "userProfile": null
}
```

| Feld | Quelle (bisheriger Endpunkt) | Hinweis |
|------|------------------------------|---------|
| `appSettings` | `GET /app-settings` | Feature-Flags und Präferenzen |
| `eventCategories` | `GET /event-categories` | Event-Kategorien |
| `businessCategories` | `GET /business-categories` | Partner-Kategorien |
| `keywords` | `GET /keywords` | Business-Keywords |
| `downtime` | `GET /downtime` | Wartungsmodus-Status |
| `appVersion` | `GET /app-versions/check?version=…` | Nur wenn `version` Query gesetzt |
| `userProfile` | `GET /users/:id/profile` | Aus JWT (`req.user.uid`), nicht aus URL |

`userProfile` ist `null`, wenn noch kein Profil in Firestore existiert (z. B. frisch anonym authentifizierter User).

## Caching

- Öffentlicher Bundle-Teil: Cache-Key `bootstrap:public` bzw. `bootstrap:public:{version}`, TTL **5 Minuten**
- `userProfile` wird **nicht** im Bundle gecacht und bei jedem Request frisch geladen
- Unterliegende Services (Kategorien, Keywords, App-Settings) nutzen weiterhin ihre eigenen Cache-Layer

Siehe [configuration-values.md] (Caching-Tabelle).

## Flutter-Migration (schrittweise)

Bestehende Einzel-Requests können schrittweise ersetzt werden:

1. `GET /bootstrap?version=<appVersion>` beim Cold-Start aufrufen
2. Felder aus der Response an bestehende Provider/Repositories mappen
3. Einzel-Endpoints vorerst als Fallback behalten (kein Breaking Change am Backend)
4. Nach erfolgreichem Rollout redundante parallele Calls entfernen

**Nicht im Bundle:** Events-Liste, Businesses-Liste, Legal Documents, Taxi-Stands, Spot-Keywords – diese bleiben separate Requests (schwere oder kontextspezifische Daten).

## Referenzen

- [brainstorming-performance-und-features.md] §4.1
- [api-app-versions.md] (Version-Check-Details)


### 5.2 App Versions

## Übersicht

Das App Versions Modul ermöglicht es, die Mindestversion der App zu verwalten und Clients zu prüfen, ob ein Update erforderlich ist.

## Endpunkte

### 1. Version Check (Öffentlich)

**Endpoint:** `GET /app-versions/check`

**Beschreibung:** Prüft, ob die übergebene Client-Version ein Update benötigt.

**Authentifizierung:** Erforderlich (mindestens anonym)

**Query Parameter:**
- `version` (string, required): Die aktuelle App-Version im Format `X.Y.Z` oder `X.Y.Z (Build Nummer)`
  - Beispiel: `1.2.3` oder `1.2.3 (123)`
  - Die Build-Nummer wird ignoriert

**Response:**
```typescript
{
  requiresUpdate: boolean
}
```

**Beispiele:**

```http
GET /app-versions/check?version=1.2.3
```

**Response (kein Update erforderlich):**
```json
{
  "requiresUpdate": false
}
```

**Response (Update erforderlich):**
```json
{
  "requiresUpdate": true
}
```

**Fehler:**
- `400 Bad Request`: Wenn der `version` Parameter fehlt oder ungültig ist
  ```json
  {
    "statusCode": 400,
    "message": "Version parameter is required"
  }
  ```

---

### 2. Mindestversion abrufen (Super Admin)

**Endpoint:** `GET /app-versions/admin/minimum-version`

**Beschreibung:** Gibt die aktuell konfigurierte Mindestversion zurück.

**Authentifizierung:** Erforderlich (Super Admin)

**Response:**
```typescript
{
  id: string;
  minimumVersion: string;  // Format: "X.Y.Z"
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

**Beispiel:**

```http
GET /app-versions/admin/minimum-version
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "id": "current",
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Response (keine Version konfiguriert):**
```json
null
```

---

### 3. Mindestversion setzen (Super Admin)

**Endpoint:** `POST /app-versions/admin/minimum-version`

**Beschreibung:** Setzt die Mindestversion für die App. Wenn bereits eine Version existiert, wird sie aktualisiert.

**Authentifizierung:** Erforderlich (Super Admin)

**Request Body:**
```typescript
{
  minimumVersion: string  // Format: "X.Y.Z" (z.B. "1.3.0")
}
```

**Response:**
```typescript
{
  id: string;
  minimumVersion: string;
  createdAt: string;
  updatedAt: string;
}
```

**Beispiel:**

```http
POST /app-versions/admin/minimum-version
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "minimumVersion": "1.3.0"
}
```

**Response:**
```json
{
  "id": "current",
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Fehler:**
- `400 Bad Request`: Wenn `minimumVersion` fehlt oder ungültig ist
  ```json
  {
    "statusCode": 400,
    "message": "minimumVersion is required"
  }
  ```
  
  ```json
  {
    "statusCode": 400,
    "message": "Invalid version format: invalid. Expected format: X.Y.Z"
  }
  ```

---

## DTOs

### CheckVersionResponseDto

```typescript
export interface CheckVersionResponseDto {
  requiresUpdate: boolean;
}
```

### SetMinimumVersionDto

```typescript
export interface SetMinimumVersionDto {
  minimumVersion: string;  // Format: "X.Y.Z"
}
```

### AppVersion Entity

```typescript
export interface AppVersionProps {
  id: string;
  minimumVersion: string;  // Format: "X.Y.Z"
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

---

## Versionsvergleich

Der Versionsvergleich folgt dem Semantic Versioning Format (X.Y.Z):

- **Major Version (X)**: Breaking Changes
- **Minor Version (Y)**: Neue Features (rückwärtskompatibel)
- **Patch Version (Z)**: Bugfixes

**Vergleichslogik:**
- Version `1.2.3` < `1.3.0` → Update erforderlich
- Version `1.2.3` = `1.2.3` → Kein Update erforderlich
- Version `1.3.0` > `1.2.3` → Kein Update erforderlich

**Beispiele:**
- Mindestversion: `1.3.0`
  - Client `1.2.9` → `requiresUpdate: true`
  - Client `1.3.0` → `requiresUpdate: false`
  - Client `1.3.1` → `requiresUpdate: false`
  - Client `2.0.0` → `requiresUpdate: false`

---

## Verwendung in Client-Apps

### iOS/Android App Integration

```typescript
// Beispiel: TypeScript/JavaScript
async function checkAppVersion(): Promise<boolean> {
  const currentVersion = getAppVersion(); // z.B. "1.2.3 (123)"
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/app-versions/check?version=${encodeURIComponent(currentVersion)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`, // Anonym oder authentifiziert
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: CheckVersionResponseDto = await response.json();
    
    if (data.requiresUpdate) {
      // Zeige Update-Dialog an
      showUpdateDialog();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking app version:', error);
    // Bei Fehler: App weiterhin nutzbar
    return false;
  }
}
```

---

## Firebase Storage

Die Mindestversion wird in Firebase Firestore gespeichert:

**Collection:** `app_versions`
**Document ID:** `current`

**Dokumentstruktur:**
```json
{
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

---

## Fehlerbehandlung

### Client-Version Check

| HTTP Status | Beschreibung | Lösung |
|------------|--------------|--------|
| 400 | Ungültiges Versionsformat | Versionsstring im Format `X.Y.Z` oder `X.Y.Z (Build)` senden |
| 400 | Version Parameter fehlt | `version` Query Parameter hinzufügen |
| 401 | Nicht authentifiziert | Firebase Token im Authorization Header senden |

### Admin Endpoints

| HTTP Status | Beschreibung | Lösung |
|------------|--------------|--------|
| 400 | Ungültiges Versionsformat | `minimumVersion` im Format `X.Y.Z` senden |
| 400 | Parameter fehlt | `minimumVersion` im Request Body senden |
| 401 | Nicht authentifiziert | Firebase Token im Authorization Header senden |
| 403 | Keine Berechtigung | Super Admin Token verwenden |

---

## Best Practices

1. **Version Check beim App-Start**: Prüfe die Version beim App-Start oder nach dem Login
2. **Fehlerbehandlung**: Bei Fehlern sollte die App weiterhin nutzbar sein (graceful degradation)
3. **Caching**: Cache das Ergebnis für eine kurze Zeit, um unnötige Requests zu vermeiden
4. **Update-Dialog**: Zeige einen benutzerfreundlichen Dialog, der zum App Store führt
5. **Build-Nummer**: Die Build-Nummer wird automatisch ignoriert, kann aber trotzdem mitgesendet werden



### 5.3 Version Changelog (Admin)

## Übersicht

Changelogs können pro App-Version (Format: X.Y.Z) als Markdown verwaltet werden. Wenn ein Changelog für eine Version existiert, wird er automatisch im Response von `GET /app-versions/check` zurückgegeben.

## Admin-Endpunkte (Super Admin)

### Changelog erstellen

```
POST /app-versions/admin/changelogs
Body: {
  "version": "1.2.3",
  "content": "# Version 1.2.3\n\n- Neue Funktion A\n- Bugfix B"
}
```

### Alle Changelogs abrufen

```
GET /app-versions/admin/changelogs
```

Gibt alle Changelogs sortiert nach Version (absteigend) zurück.

### Changelog für Version abrufen

```
GET /app-versions/admin/changelogs/:version
```

### Changelog aktualisieren

```
PUT /app-versions/admin/changelogs/:version
Body: {
  "content": "# Aktualisierter Inhalt..."
}
```

### Changelog löschen

```
DELETE /app-versions/admin/changelogs/:version
```

## Öffentlicher Endpunkt

```
GET /app-versions/check?version=1.2.3
```

Response enthält optional `changelogContent` (nur Markdown-Text), wenn ein Changelog für diese Version existiert.

## Wichtige Hinweise

- **Version-Format**: X.Y.Z (z.B. 1.2.3)
- **Content**: Markdown
- **Pro Version**: max. 1 Changelog
- Wenn vorhanden, wird der Changelog automatisch bei Version-Checks zurückgegeben


### 5.4 Location (HERE)

Kurzdokumentation der Endpunkte unter **`/location`**. Zugriff erfordert ein gültiges Firebase- **`Authorization: Bearer`**-Token (wie alle Routen).

## Antwort-Envelope

Wie überall im Backend packt der [`ResponseInterceptor`](../src/core/interceptors/response.interceptor.ts) die Nutzdaten ein:

```json
{ "data": <...>, "timestamp": "..." }
```

- **`/location/search`** liefert in `data` ein **JSON-Array** von Adress-Treffern (`LocationResult[]`).
- **`/location/reverse`** liefert in `data` **ein Objekt oder `null`** (ein `LocationResult` bzw. kein deutscher Treffer).

Shape eines Treffers entspricht einem HERE-`items[]`-Eintrag (u. a. `title`, `id`, `resultType`, `address`, `position` mit `lat`/`lng`) und ist damit mit `HereLocationResult.fromJson` auf der Flutter-Seite kompatibel.

## GET /location/search

| Query | Typ | Beschreibung |
|--------|-----|----------------|
| `query` | string (Pflicht) | Freitext-Adresssuchbegriff |

- Backend: HERE Geocode (`geocode.search.hereapi.com/v1/geocode`).
- Treffer sind auf Deutschland beschränkt (`in=countryCode:DEU` und Filter auf `countryCode` DE/DEU).

## GET /location/reverse

| Query | Typ | Beschreibung |
|--------|-----|----------------|
| `latitude` | number (Pflicht) | Breitengrad WGS84, −90 … 90 |
| `longitude` | number (Pflicht) | Längengrad WGS84, −180 … 180 |

- Backend: HERE Reverse Geocode (`revgeocode.search.hereapi.com/v1/revgeocode`), nur `at=latitude,longitude` und `apiKey` (gleiche Credentials wie Vorwärtssuche). **Kein** `in=countryCode:DEU` in diesem Request – HERE lässt `at` nicht mit diesem räumlichen Filter kombinieren und antwortet sonst mit **400**.
- In der HERE-Antwort wird der **beste** deutschlandkonforme Treffer gewählt (Filter auf `countryCode` DE/DEU); sonst ist `data` **`null`**.

### Hinweis für Clients (Pins vs. HERE)

Koordinaten, die ihr z. B. durch **Long-Press auf der Karte** setzt, sollten die **authoritative Quelle** für Persistenz bleiben (z. B. `CuratedSpotAddress.latitude` / `longitude` beim Spot-Anlegen). Nutzt Reverse-Geocoding vor allem zur **Vorbefüllung von Textfeldern** (Straße, PLZ, Stadt). Dadurch verschiebt sich die Kartenposition nicht, wenn HERE gegenüber dem gewählten Pin leicht abweicht.


### 5.5 Direct Chats

## Basis-URL
`/direct-chats`

## Feature Toggle
Das Direct Chat Feature kann vom Admin aktiviert/deaktiviert werden. Bei deaktiviertem Feature geben alle Endpoints (außer Settings) `503 Service Unavailable` zurück.

---

## Request DTOs (vom Client gesendet)

### 1. CreateDirectChatDto
**Endpoint:** `POST /direct-chats`

```typescript
{
  invitedUserId: string;  // Pflicht - ID des eingeladenen Users
}
```

**Beispiel:**
```json
{
  "invitedUserId": "user-123"
}
```

---

### 2. CreateDirectMessageDto
**Endpoint:** `POST /direct-chats/:chatId/messages`

```typescript
{
  content: string;      // Pflicht - Nachrichteninhalt (max. 5000 Zeichen)
  imageUrl?: string;    // Optional - URL des Bildes (max. 1 MB)
}
```

**Beispiel:**
```json
{
  "content": "Hello, how are you?",
  "imageUrl": "https://storage.example.com/images/photo.jpg"
}
```

---

### 3. UpdateDirectMessageDto
**Endpoint:** `PATCH /direct-chats/:chatId/messages/:messageId`

```typescript
{
  content: string;      // Pflicht - Aktualisierter Nachrichteninhalt (max. 5000 Zeichen)
  imageUrl?: string;    // Optional - URL des Bildes (max. 1 MB)
}
```

**Beispiel:**
```json
{
  "content": "Updated message content"
}
```

---

### 4. UpdateDirectMessageReactionDto
**Endpoint:** `PATCH /direct-chats/:chatId/messages/:messageId/reactions`

```typescript
{
  type: string;  // Pflicht - Emoji als Reaktion
}
```

**Beispiel:**
```json
{
  "type": "👍"
}
```

**Hinweis:** Gleiches Emoji erneut senden entfernt die Reaktion (Toggle-Verhalten).

---

### 5. UpdateDirectChatSettingsDto (nur Admin)
**Endpoint:** `PATCH /direct-chats/settings`

```typescript
{
  isEnabled: boolean;  // Pflicht - Feature aktiviert/deaktiviert
}
```

**Beispiel:**
```json
{
  "isEnabled": false
}
```

---

## Response DTOs (vom Server zurückgegeben)

### DirectChat Response

```typescript
{
  id: string;                    // Chat-ID
  creatorId: string;             // ID des Chat-Erstellers
  invitedUserId: string;         // ID des eingeladenen Users
  creatorConfirmed: boolean;     // Immer true
  invitedConfirmed: boolean;     // true wenn Einladung angenommen
  status: "pending" | "active";  // Chat-Status
  lastMessage?: {                // Letzte Nachricht (optional)
    content: string;
    senderId: string;
    sentAt: string;              // ISO 8601 Timestamp
  };
  createdAt: string;             // ISO 8601 Timestamp
  updatedAt: string;             // ISO 8601 Timestamp
  
  // Zusätzliche Felder bei GET-Anfragen:
  otherParticipantName?: string;              // Name des anderen Teilnehmers
  otherParticipantProfilePictureUrl?: string; // Profilbild-URL
}
```

---

### DirectMessage Response

```typescript
{
  id: string;           // Nachrichten-ID
  chatId: string;       // Zugehörige Chat-ID
  senderId: string;     // ID des Absenders
  senderName: string;   // Name des Absenders
  content: string;      // Nachrichteninhalt
  imageUrl?: string;    // Bild-URL (optional)
  isEditable: boolean;  // true wenn eigene Nachricht
  reactions?: [         // Reaktionen (optional)
    {
      userId: string;   // User der reagiert hat
      type: string;     // Emoji
    }
  ];
  createdAt: string;    // ISO 8601 Timestamp
  updatedAt: string;    // ISO 8601 Timestamp
  editedAt?: string;    // ISO 8601 Timestamp (wenn bearbeitet)
}
```

---

### DirectChatSettings Response

```typescript
{
  id: string;           // Immer "direct_chat_settings"
  isEnabled: boolean;   // Feature aktiviert/deaktiviert
  updatedAt: string;    // ISO 8601 Timestamp
  updatedBy?: string;   // User-ID des letzten Änderers
}
```

---

## API Endpoints Übersicht

| Methode | Endpoint | Beschreibung | Body |
|---------|----------|--------------|------|
| `GET` | `/direct-chats/settings` | Feature-Status abrufen | - |
| `PATCH` | `/direct-chats/settings` | Feature Toggle (Admin) | `UpdateDirectChatSettingsDto` |
| `POST` | `/direct-chats` | Chat-Anfrage erstellen | `CreateDirectChatDto` |
| `GET` | `/direct-chats` | Alle eigenen Chats abrufen | - |
| `GET` | `/direct-chats/pending` | Ausstehende Anfragen | - |
| `GET` | `/direct-chats/:id` | Einzelnen Chat abrufen | - |
| `PATCH` | `/direct-chats/:id/confirm` | Anfrage annehmen | - |
| `DELETE` | `/direct-chats/:id` | Chat löschen/ablehnen | - |
| `POST` | `/direct-chats/:chatId/messages` | Nachricht senden | `CreateDirectMessageDto` |
| `GET` | `/direct-chats/:chatId/messages` | Nachrichten abrufen | - |
| `PATCH` | `/direct-chats/:chatId/messages/:messageId` | Nachricht bearbeiten | `UpdateDirectMessageDto` |
| `DELETE` | `/direct-chats/:chatId/messages/:messageId` | Nachricht löschen | - |
| `PATCH` | `/direct-chats/:chatId/messages/:messageId/reactions` | Reaktion toggle | `UpdateDirectMessageReactionDto` |

---

## User Blocking Endpoints

| Methode | Endpoint | Beschreibung | Body |
|---------|----------|--------------|------|
| `POST` | `/users/:id/blocked-users` | User blockieren | `{ "userIdToBlock": "user-123" }` |
| `DELETE` | `/users/:id/blocked-users/:blockedUserId` | User entblockieren | - |
| `GET` | `/users/:id/blocked-users` | Blockierte User abrufen | - |

---

## HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| `200` | Erfolg |
| `201` | Erfolgreich erstellt |
| `204` | Erfolgreich gelöscht (kein Body) |
| `400` | Ungültige Anfrage / User bereits blockiert / Chat existiert bereits |
| `403` | Keine Berechtigung / Von User blockiert |
| `404` | Nicht gefunden |
| `503` | Feature deaktiviert |

---

## Chat-Flow

1. **User A** erstellt Chat-Anfrage an **User B** → Status: `pending`
2. **User B** sieht Anfrage unter `/direct-chats/pending`
3. **User B** kann:
   - Annehmen: `PATCH /direct-chats/:id/confirm` → Status: `active`
   - Ablehnen: `DELETE /direct-chats/:id` → Chat wird gelöscht
4. Bei `active` Status können beide User Nachrichten senden
5. Jeder Teilnehmer kann den Chat jederzeit löschen (`DELETE`)
6. Bei Löschung werden alle Nachrichten mit gelöscht


### 5.6 Events

Diese Dokumentation ergänzt die bestehenden Hinweise in [notification-suggestions.md] zu `NEW_EVENT` und `FAV_EVENT_UPDATE`.

## Authentifizierung

Alle Routen unter `/events` setzen wie im restlichen Backend ein gültiges Firebase-ID-Token voraus (inkl. anonymer Konten mit Token).

## Event-Status (`status`)

| Wert | Bedeutung |
|------|-----------|
| `ACTIVE` | Öffentlich in Listen (`GET /events`, `GET /events/by-ids`) und per `GET /events/:id` lesbar (sofern nicht eingeschränkt). |
| `PENDING` | Erstellt, aber noch nicht freigegeben; erscheint **nicht** in der öffentlichen Eventliste. |

**Abwärtskompatibilität:** Fehlt das Feld `status` in Firestore, wird das Event wie `ACTIVE` behandelt.

## Erstellung

- **Super Admin / Admin** (`userType` im User-Profil): neu erstellte Events sind **sofort** `ACTIVE`; `NEW_EVENT` wird gesendet (siehe Präferenzen in `.cursorrules`).
- **Alle anderen registrierten Nutzer** (inkl. Business- und normale User-Profile): neuer Status **`PENDING`**; **keine** `NEW_EVENT`-Push beim Erstellen.
- **Anonyme Firebase-Nutzer** (`sign_in_provider === 'anonymous'`): **keine** Erstellung oder Änderung von Events (`403`).

Erstellung erfolgt u. a. über:

- `POST /events`
- `POST /events/users/:id` – Ziel-ID muss der aufrufenden UID entsprechen oder der Aufrufer ist Admin; Zuordnung über `business_users.eventIds` **oder** `users.createdEventIds`.
- `POST /events/businesses/:id` – Aufrufer muss zu diesem Business berechtigt sein (Business-User mit `businessIds` oder Admin).

## Öffentliche Lesbarkeit

- `GET /events` – nur `ACTIVE` (und Legacy ohne `status`).
- `GET /events/by-ids?ids=…` – nur öffentlich sichtbare Events (keine `PENDING`).
- `GET /events/:id` – `PENDING` liefert **404** für Nicht-Admins; **Admin/Super Admin** darf Pending-Events lesen (intern `includePendingInResult`).

## „Meine“ Events (inkl. Pending)

- `GET /events/users/:id` – nur eigene UID oder Admin; liefert Events aus `business_users.eventIds` und `users.createdEventIds` mit **`includeAllStatuses: true`** (also inkl. Pending).

## Business-Events

- `GET /events/businesses/:id` – wenn der Aufrufer das Business verwalten darf (gleiche Logik wie bei Erstellung) oder Admin ist, werden alle Status geliefert; sonst nur öffentlich sichtbare.

## Freigabe (Admin)

- `GET /events/pending` – nur `admin` / `super_admin`: Liste aller `PENDING`-Events.
- `PATCH /events/:id/approve` – nur `admin` / `super_admin`: setzt `PENDING` → `ACTIVE` und löst **einmalig** `NEW_EVENT` aus (analog Freigabe bei Businesses).

Ablehnung ohne eigenen Status: Ein Admin kann ein unerwünschtes Event per `DELETE /events/:id` entfernen (siehe Berechtigung: Pending nur Ersteller/Admin).

## Bulk-Kategorie-Update (Admin)

- `PATCH /events/bulk/category` – nur `admin` / `super_admin`: weist mehreren Events dieselbe Kategorie zu.
- Es darf **nur** `categoryId` geändert werden; andere Event-Felder sind in diesem Endpunkt nicht erlaubt.

**Request-Body:**

```json
{
  "eventIds": ["event-1", "event-2"],
  "categoryId": "konzerte-id"
}
```

- `eventIds`: 1–100 eindeutige Event-IDs (Duplikate werden serverseitig entfernt).
- `categoryId`: muss eine gültige Event-Kategorie aus `event_categories` sein (Validierung wie bei `POST /events`).

**Response (Teilerfolg):**

```json
{
  "total": 2,
  "successful": 1,
  "failed": 1,
  "results": [
    { "eventId": "event-1", "success": true, "event": { "...": "..." } },
    { "eventId": "event-2", "success": false, "message": "Event not found" }
  ]
}
```

- Ungültige `categoryId` → gesamter Request schlägt fehl (`400`).
- Nicht gefundene Event-IDs werden pro Eintrag als `success: false` gemeldet; gültige Events werden trotzdem aktualisiert.
- Events, die bereits die Ziel-`categoryId` haben, werden übersprungen (Erfolg ohne erneutes Firestore-Update).
- Bei öffentlich sichtbaren Events (`ACTIVE` bzw. ohne `status`) kann eine Kategorieänderung `FAV_EVENT_UPDATE` mit `updateType: OTHER` auslösen (siehe Benachrichtigungen).

**Admin-Frontend:** Siehe [events-bulk-category-admin-integration.md].

## CSV-Import

`POST /events/import/csv` legt Events als **`ACTIVE`** an (Admin-/Importpfad). Anonyme Aufrufer erhalten `403`.

## Benachrichtigungen

- **NEW_EVENT:** nur bei `ACTIVE`-Erstellung oder nach **`PATCH /events/:id/approve`** (nicht bei Erstellung mit `PENDING`).
- **FAV_EVENT_UPDATE:** nur wenn **alt und neu** öffentlich sichtbar sind (`ACTIVE` bzw. fehlendes `status`); nicht bei reinen Pending-Änderungen.

Siehe [notification-suggestions.md] Abschnitte *NEW_EVENT* und *FAV_EVENT_UPDATE*.


### 5.7 Curated Spots (HTTP)

Dieses Dokument beschreibt die **HTTP-API**, die das Admin-Frontend ansprechen muss, um **kuratierte Spots** und das **eigene Keyword-Vokabular** (`spotKeywords`, getrennt von den globalen Partner-`keywords`) zu verwalten. Es ist so geschrieben, dass ein anderer Entwickler oder ein Agent **ohne Raten** Clients (z. B. React/Vue) implementieren kann.

## Globale Voraussetzungen (gilt für alle Endpunkte)

### Authentifizierung

- Jede Anfrage braucht einen **Firebase-ID-Token** im Header: `Authorization: Bearer <idToken>`.
- Ohne gültigen Token antwortet das Backend mit **401** (globales `AuthGuard`).

### Rollen (`RolesGuard`)

- Schreibende Admin-Routen sind mit `@Roles('admin', 'super_admin')` geschützt.
- Nutzer mit Rolle **Admin** oder **Super-Admin** (`userType` im Firestore-Profil) dürfen diese Routen aufrufen.
- Technische Details zum Guard: siehe [.cursorrules](../.cursorrules) und [`src/core/guards/roles.guard.ts`](../src/core/guards/roles.guard.ts) (Business-User werden separat behandelt).

### Response-Format (wichtig für den Client)

Das Backend nutzt einen **globalen Response-Interceptor**. Antworten sind **nicht** das nackte JSON-Objekt, sondern immer eingepackt:

```json
{
  "data": <Rückgabewert des Controllers>,
  "timestamp": "<ISO-Zeit Berlin>"
}
```

**Beispiel:** `GET /curated-spots/admin` liefert ein Array von Spots im Feld `data`:

```json
{
  "data": [
    {
      "id": "…",
      "name": "…",
      "nameLower": "…",
      "descriptionMarkdown": "…",
      "imageUrls": [],
      "keywordIds": [],
      "address": {
        "street": "Hauptstraße",
        "houseNumber": "1",
        "postalCode": "90403",
        "city": "Nürnberg",
        "latitude": 49.45,
        "longitude": 11.08
      },
      "videoUrl": null,
      "instagramUrl": null,
      "status": "PENDING",
      "isDeleted": false,
      "createdAt": "…",
      "updatedAt": "…",
      "createdByUserId": "…",
      "adminRating": null,
      "adminRatedAt": null,
      "userRatingAverage": null,
      "userRatingCount": 0
    }
  ],
  "timestamp": "…"
}
```

Der Admin-Client sollte überall **`response.data`** (oder eure HTTP-Client-Abstraktion darauf) verwenden.

### OpenAPI / Swagger

Interaktive Doku: **`GET /api`** (Swagger UI), Tag-Gruppen u. a. `curated-spots`, `spot-keywords`.

### Firestore-Collections (nur zur Einordnung)

| Collection (Firestore) | Inhalt |
|------------------------|--------|
| `curatedSpots` | Spot-Dokumente (inkl. `adminRating` / Nutzer-Aggregate `userRatingAverage`, `userRatingCount`) |
| `curatedSpots/{spotId}/userRatings/{userId}` | Einmalige Endnutzer-Bewertung pro User (`score`, `ratedAt`) – nur wenn Feature aktiv |
| `settings/curated_spots_user_ratings_settings` | Feature-Toggle `isEnabled` für Endnutzer-Bewertungen (Default **false**) |
| `spotKeywords` | Tag-Keywords nur für Spots (nicht `keywords` für Businesses) |

Bei neuen zusammengesetzten Firestore-Queries können in der **Firebase Console** **Composite Indexes** nötig werden (Fehlermeldung mit Link kommt von Firebase).

---

## Basis-Pfade

| Ressource | Base-Pfad |
|-----------|-----------|
| Spots | `/curated-spots` |
| Spot-Keywords | `/spot-keywords` |

Präfix wie `/dev` oder `/prd` hängt von eurer Deployment-Konfiguration ab (siehe [README.md](../README.md) zu `BASE_URL`).

| Hilfs-Endpunkt | Pfad |
|----------------|------|
| Adress-/HERE-Hilfen | `/location` (siehe unten) |

### Location API (Autocomplete & Reverse für Adresseingaben)

Für **„Adresse beim Spot anlegen“** (Autocomplete aus Text oder Vorbefüllung nach Karten-Pin) stellt das Backend HERE-basierte Routen bereit:

| Zweck | HTTP | Feld `data` im Envelope |
|-------|------|--------------------------|
| Text → Liste von Treffern | `GET /location/search?query=…` | JSON-Array (`LocationResult[]`) |
| Koordinaten → ein Treffer | `GET /location/reverse?latitude=…&longitude=…` | ein Objekt (`LocationResult`) oder **`null`** |

- **Auth:** wie überall gültiges Firebase-Bearer-Token (**keine** Admin-Rolle nötig für `/location`).
- **Reverse:** Bei `null` existiert kein passender deutscher Treffer; Clients sollen Pins/Koordinaten trotzdem speichern können und Textfelder ggf. manuell ergänzen.
- **Flutter-Admin-Implementierung:** Schrittfolge, Dart-Hinweise (Envelope, Null-Check) und Pin-vs.-Koordinaten-Verhalten: [flutter-curated-spots-create-integration.md](./flutter-curated-spots-create-integration.md) („Adresse einpflegen: `/location/search` und `/location/reverse`“).
- **Technische Detail-Doku:** [location-api.md](./location-api.md).

---

## 1. Spot-Keywords (Autocomplete + manuelles Anlegen)

### GET `/spot-keywords/suggest`

**Zweck:** Vorschläge für die Tag-Eingabe (Prefix-Suche auf `nameLower`).

**Auth:** Jeder authentifizierte User (keine Admin-Rolle nötig).

**Query-Parameter:**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|--------------|
| `q` | **Ja** | Prefix; leer oder nur Whitespace → **400** `Bad Request` |
| `limit` | Nein | Standard `20`; Backend clamped auf **1–50** |

**Beispiel:** `GET /spot-keywords/suggest?q=bier&limit=15`

**Response `data`:** `SpotKeyword[]`

```json
{
  "id": "firestore-doc-id",
  "name": "Biergarten",
  "nameLower": "biergarten",
  "createdAt": "…",
  "updatedAt": "…"
}
```

**UI-Hinweis:** Nutzer wählt Einträge nach **`name`**; für Spots speichert ihr die **`id`** in der Liste `keywordIds`.

---

### GET `/spot-keywords/:id`

**Zweck:** Ein einzelnes Spot-Keyword per **Firestore-Dokument-ID** laden – z. B. um beim **Bearbeiten** eines Spots aus `keywordIds[]` die **Anzeigenamen** für Chips aufzulösen (die Spot-API liefert nur IDs, keine eingebetteten Keyword-Objekte).

**Auth:** Jeder authentifizierte User (**keine** Admin-Rolle nötig).

**Pfad:** Die ID URL-sicher übergeben: `encodeURIComponent(id)` in den Pfad einfügen (Sonderzeichen in IDs sind selten, aber konsistent).

**Routen-Reihenfolge im Backend:** `GET …/suggest` ist **vor** `GET …/:id` registriert, damit der Literal-Pfad `suggest` nicht als ID interpretiert wird.

**Response `data`:** ein `SpotKeyword`-Objekt wie bei Suggest.

**Fehler:** **404**, wenn kein Dokument mit dieser ID existiert (Admin-UI kann dann z. B. „Unbekannt“ anzeigen, Chip aber mit gespeicherter `id` für `PATCH` beibehalten).

---

**Zweck:** Keyword explizit anlegen (z. B. „Import“ oder Admin-Pflege).

**Auth:** **admin** oder **super_admin**

**Body (`application/json`):**

```json
{
  "name": "Klimaanlage"
}
```

- `name`: string, nicht leer, max. **120** Zeichen.

**Verhalten:** Existiert bereits ein Keyword mit gleichem `nameLower` (trim + lowercase), liefert das Backend das **bestehende** Dokument (kein Duplikat).

**Response `data`:** ein `SpotKeyword`-Objekt wie oben.

---

## 2. Kuratierte Spots – Admin-Listen und Detail

### GET `/curated-spots/admin`

**Zweck:** Liste **aller nicht gelöschten** Spots (`isDeleted === false`), **alle Status** (`PENDING`, `ACTIVE`).

**Auth:** **admin** oder **super_admin**

**Response `data`:** `CuratedSpot[]`

---

### GET `/curated-spots/admin/:id`

**Zweck:** Einzelabruf inkl. **PENDING** (z. B. Bearbeiten-Formular).

**Auth:** **admin** oder **super_admin**

**Response `data`:** ein `CuratedSpot`

**Fehler:** **404**, wenn ID nicht existiert.

---

## 3. Kuratierte Spots – Anlegen und Bearbeiten

### Datenmodell `CuratedSpot` (Response / Patch-Logik)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | string | Firestore-Dokument-ID |
| `name` | string | Anzeigename |
| `nameLower` | string | vom Server gesetzt (normalisiert), nicht im Create-Body |
| `descriptionMarkdown` | string | Markdown-Rohstring; **Rendering** nur im Client |
| `imageUrls` | string[] | URLs (u. a. nach Upload) |
| `keywordIds` | string[] | Referenzen auf `spotKeywords` |
| `address` | Objekt | **Pflicht** in API-Responses; gleiche Struktur wie bei **Partnern** (`BusinessAddressDto`): `street`, `houseNumber`, `postalCode`, `city`, `latitude`, `longitude` (siehe [`business-address.dto.ts`](../src/businesses/dto/business-address.dto.ts)). Beim **Lesen** sehr alter Firestore-Dokumente ohne `address`-Feld füllt das Backend Platzhalter (leere Strings, `0` für Koordinaten); solche Einträge sollten per `PATCH` mit einer echten Adresse nachgezogen werden. |
| `videoUrl` | string \| null | z. B. nach Upload oder manuell per PATCH |
| `instagramUrl` | string \| null | gültige URL (`class-validator` `@IsUrl`) |
| `status` | `"PENDING"` \| `"ACTIVE"` | Sichtbarkeit in der öffentlichen App |
| `isDeleted` | boolean | Soft-Delete |
| `createdAt` / `updatedAt` | string (ISO) | vom Server gesetzt |
| `createdByUserId` | string \| null | Firebase-UID des Erstellers bei `POST` |
| `adminRating` | number \| null | Redaktionsbewertung **1–5**; **admin**/**super_admin** dürfen sie per `PATCH` jederzeit ändern oder mit `null` entfernen |
| `adminRatedAt` | string \| null | ISO-Zeitpunkt der **letzten** Änderung an `adminRating` (bei Wert `null` ebenfalls `null`); **nur serverseitig**, nie im Request-Body |
| `userRatingAverage` | number \| null | Durchschnitt aller abgegebenen Nutzerbewertungen (nur lesen; wird bei Nutzer-`POST` aktualisiert) |
| `userRatingCount` | number | Anzahl abgegebener Nutzerbewertungen (Start **0**) |

---

## Bewertungen und Feature-Toggle (Endnutzer)

> **Web-Admin-UI** (Redaktionssterne + Toggle im Browser): [curated-spots-ratings-web-integration.md](./curated-spots-ratings-web-integration.md) · **Flutter** (Anzeige + Nutzerbewertung): [curated-spots-ratings-flutter-integration.md](./curated-spots-ratings-flutter-integration.md)

### GET `/curated-spots/settings/user-ratings`

**Zweck:** Status des Features **Endnutzer-Bewertungen** lesen (`isEnabled`).

**Auth:** jeder authentifizierte User.

**Response `data`:** `{ "id": "curated_spots_user_ratings_settings", "isEnabled": boolean, "updatedAt": string, "updatedBy"?: string }`

---

### PATCH `/curated-spots/settings/user-ratings`

**Zweck:** Feature ein- oder ausschalten.

**Auth:** **admin** oder **super_admin**

**Body:**

```json
{ "isEnabled": true }
```

---

### POST `/curated-spots/:id/my-user-rating` / GET `/curated-spots/:id/my-user-rating`

**Zweck:** Endnutzer legt **einmalig** Sterne **1–5** ab bzw. liest die eigene Abgabe. Nur wenn `isEnabled === true`; sonst **503**.

**Auth:** jeder authentifizierte User.

**POST Body:** `{ "score": 3 }` (Ganzzahl 1–5).

**Fehler:** **409**, wenn dieser User den Spot bereits bewertet hat. **404**, wenn Spot für die App nicht sichtbar (nicht aktiv oder gelöscht).

Details zur App-Integration: [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md).

---

### POST `/curated-spots`

**Zweck:** Neuen Spot anlegen.

**Auth:** **admin** oder **super_admin**

**Body (`application/json`):**

```json
{
  "name": "Café Sonnendeck",
  "descriptionMarkdown": "## Lage\n…",
  "address": {
    "street": "Königstraße",
    "houseNumber": "10",
    "postalCode": "90402",
    "city": "Nürnberg",
    "latitude": 49.4489,
    "longitude": 11.0788
  },
  "keywordIds": ["id-aus-suggest", "andere-id"],
  "newKeywordNames": ["Rooftop", "Frühstück"],
  "videoUrl": "https://…",
  "instagramUrl": "https://www.instagram.com/reel/…",
  "status": "PENDING"
}
```

| Feld | Pflicht | Hinweis |
|------|---------|---------|
| `name` | Ja | max. 200 Zeichen |
| `descriptionMarkdown` | Ja | max. 20000 Zeichen |
| `address` | **Ja** | verschachteltes Objekt: `street`, `houseNumber`, `postalCode`, `city` (jeweils nicht-leerer String), `latitude` / `longitude` als Zahl (wie Partner-Adresse) |
| `keywordIds` | Nein | bestehende `spotKeywords`-IDs |
| `newKeywordNames` | Nein | Strings max. 120 Zeichen; Server legt fehlende Keywords an und **merged** die IDs in `keywordIds` |
| `videoUrl` / `instagramUrl` | Nein | müssen gültige URLs sein, wenn gesetzt |
| `status` | Nein | Default **`PENDING`**, wenn weggelassen |
| `adminRating` | Nein | optional **1–5**; setzt gleichzeitig `adminRatedAt` (wie bei PATCH, später per `PATCH` änderbar) |

**Response `data`:** angelegter `CuratedSpot` (inkl. `id`).

**Empfohlener Admin-Workflow:**

1. `POST /curated-spots` mit Text + Keywords (und optional URLs).
2. Mit zurückgegebener `id`: Bilder per `POST …/images` hochladen (siehe unten).
3. Optional: Video per `POST …/video` hochladen **oder** `videoUrl`/`instagramUrl` per `PATCH` setzen.
4. Wenn inhaltlich fertig: `PATCH /curated-spots/:id` mit `{ "status": "ACTIVE" }`.

---

### PATCH `/curated-spots/:id`

**Zweck:** Spot teilweise aktualisieren.

**Auth:** **admin** oder **super_admin**

**Body:** alle Felder optional; nur gesendete Felder ändern sich logisch. **`address`:** wenn gesetzt, wird das komplette Adressobjekt ersetzt (gleiche Pflichtfelder wie bei `POST`).

**Admin-Bewertung (`adminRating`):** optional **1–5** oder **`null`** (Bewertung entfernen). Jede **inhaltliche** Änderung setzt **`adminRatedAt`** neu auf die aktuelle Serverzeit; derselbe Wert wie bereits gespeichert ändert nichts (idempotent). **`adminRatedAt`** kommt nicht in den Request.

**Keywords – Semantik:**

- `keywordIds`: wenn gesetzt, **ersetzt** das die komplette Liste der Keyword-Referenzen auf dem Spot.
- `newKeywordNames`: wenn gesetzt (nicht-leeres Array), werden die Namen aufgelöst/angelegt und die neuen IDs **zur aktuellen Liste hinzugefügt** (nach ggf. gesetztem `keywordIds` im selben Request).

**Beispiele:**

Adresse ändern:

```json
{
  "address": {
    "street": "Neue Straße",
    "houseNumber": "2",
    "postalCode": "90403",
    "city": "Nürnberg",
    "latitude": 49.45,
    "longitude": 11.08
  }
}
```

Nur Freigabe:

```json
{ "status": "ACTIVE" }
```

Nur Instagram setzen:

```json
{ "instagramUrl": "https://www.instagram.com/p/…" }
```

Keyword-Liste komplett ersetzen:

```json
{ "keywordIds": ["kw1", "kw2"] }
```

**Response `data`:** aktualisierter `CuratedSpot`.

---

### DELETE `/curated-spots/:id`

**Zweck:** **Soft-Delete** (`isDeleted: true`). Datensatz bleibt in Firestore.

**Auth:** **admin** oder **super_admin**

**Response `data`:** der aktualisierte `CuratedSpot` (mit `isDeleted: true`) – **kein** HTTP 204.

---

## 4. Medien-Uploads (multipart)

### POST `/curated-spots/:id/images`

**Zweck:** Bis zu **20** Bilder auf einmal hochladen; URLs werden an `imageUrls` **angehängt**.

**Auth:** **admin** oder **super_admin**

**Content-Type:** `multipart/form-data`

**Form-Feldname:** `images` (mehrere Teile mit gleichem Namen – wie Browser/File-API bei Multi-Select).

**Response `data`:** aktualisierter `CuratedSpot` mit erweitertem `imageUrls`.

**Fehler:** **400**, wenn keine Dateien mitgeschickt wurden.

**Hinweis:** Erlaubte MIME-Typen/Größen folgen dem globalen [`FileValidationPipe`](../src/core/pipes/file-validation.pipe.ts) (wie bei anderen Uploads im Projekt).

---

### POST `/curated-spots/:id/video`

**Zweck:** **Eine** Videodatei hochladen; die resultierende Storage-URL wird in **`videoUrl`** geschrieben (überschreibt vorherigen Wert aus Sicht des Feldes).

**Auth:** **admin** oder **super_admin**

**Content-Type:** `multipart/form-data`

**Form-Feldname:** `file` (genau eine Datei).

**Response `data`:** aktualisierter `CuratedSpot`.

**Validierung:** [`VideoFileValidationPipe`](../src/core/pipes/video-file-validation.pipe.ts) – erlaubte Typen: **MP4** (`video/mp4`), **WebM** (`video/webm`), **QuickTime/MOV** (`video/quicktime`), **M4V** (`video/x-m4v`); maximale Dateigröße **10 MB** pro Upload.

---

## 5. Öffentliche Lese-Endpunkte (Referenz für Admin-Vorschau / QA)

Diese Routen brauchen **keine** Admin-Rolle, nur Auth.

### GET `/curated-spots`

Nur Spots mit `status === "ACTIVE"` und `isDeleted === false`.

### GET `/curated-spots/search`

**Query:**

| Parameter | Beschreibung |
|-----------|--------------|
| `namePrefix` | optional; Präfix auf `nameLower` |
| `keywordIds` | optional; **mehrfach** erlaubt |

**`keywordIds` encodieren:**

- wiederholter Query-Key: `?keywordIds=id1&keywordIds=id2`
- oder komma-separiert in einem Wert: `?keywordIds=id1,id2`
- Mischform wird vom Backend zu einer deduplizierten ID-Liste zusammengeführt.

**Semantik:** **UND** – es erscheinen nur Spots, die **alle** angegebenen Keyword-IDs in `keywordIds` haben. Zusätzlich muss der Name das Präfix erfüllen, wenn `namePrefix` gesetzt ist.

### GET `/curated-spots/:id`

Nur **ACTIVE** und nicht gelöscht; sonst **404** (gleiches Verhalten wie in der App).

---

## 6. Typische Fehlerbilder

| HTTP | Situation |
|------|-----------|
| 400 | Validation (`class-validator`), z. B. ungültige URL, leeres `name`, fehlendes **`address`** bei `POST`, fehlendes `q` bei Suggest |
| 401 | Token fehlt/ungültig |
| 403 | Rolle nicht `admin` / `super_admin` auf geschützter Route |
| 404 | Spot-ID unbekannt; oder Spot nicht `ACTIVE` auf `GET /curated-spots/:id` |

---

## 7. Checkliste für die Admin-UI-Implementierung

- [ ] HTTP-Client liest immer **`response.data`** (Interceptor).
- [ ] Admin-Routen nur für Nutzer mit Admin/Super-Admin anzeigen.
- [ ] Formular „Neuer Spot“: Pflichtfelder **`name`**, **`descriptionMarkdown`**, **`address`** (Straße, Hausnummer, PLZ, Stadt, Koordinaten) → `POST /curated-spots` → dann optional `images` / `video` Uploads.
- [ ] Optional **Adresseingabe:** Textsuche **`GET /location/search`**, aus Karte/Pin zusätzlich **`GET /location/reverse`** (`data` kann `null` sein); Detail-Doku: [location-api.md](./location-api.md), Flutter-Anleitung: [flutter-curated-spots-create-integration.md](./flutter-curated-spots-create-integration.md).
- [ ] Keyword-Auswahl: `GET /spot-keywords/suggest?q=…` → gespeicherte Werte sind **`id`**, nicht der Anzeigename.
- [ ] Spot bearbeiten: Nach `GET /curated-spots/admin/:id` die **`keywordIds`** per **`GET /spot-keywords/:id`** (parallel, `encodeURIComponent`) in Namen auflösen; bei **404** z. B. Chip-Label „Unbekannt“, **`id`** für Speichern beibehalten.
- [ ] Zusätzliche freie Tags: `newKeywordNames` im Create/Patch mitschicken, wenn der User Text eintippt, der noch kein Keyword ist.
- [ ] Freigabe: `PATCH` mit `{ "status": "ACTIVE" }`.
- [ ] Löschen: `DELETE` = Soft-Delete; Liste ggf. clientseitig ausblenden oder `GET /curated-spots/admin` erneut laden.

---

## 8. Verwandte Projekt-Dokumentation

- **Flutter-App:** getrennte Integrationsguides – zuerst Anzeige testen, dann Schreibzugriff:
  - [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md) (nur Lesen)
  - [flutter-curated-spots-create-integration.md](./flutter-curated-spots-create-integration.md) (Spots anlegen/pflegen, Admin-Rolle; inkl. `GET /location/reverse` neben Vorwärtssuche für Adresseingaben)
- **Adresse / HERE (`/location/search`, `/location/reverse`):** [location-api.md](./location-api.md)
- Architektur & Firebase-Konventionen: [architecture.md](./architecture.md)
- Projektweite Regeln (Tests, Guards, Notifications): [.cursorrules](../.cursorrules)
- Vergleichbares Admin-Pattern (CRUD + Auth): [taxi-stands-admin-integration.md](./taxi-stands-admin-integration.md)


### 5.8 Special Polls (HTTP)

Dieses Dokument beschreibt die **HTTP-API** für **Special Polls** (`/special-polls`), damit das **Admin-Frontend** (Super-Admin) Umfragen anlegen, status setzen, hervorheben, Antworten moderieren und löschen kann. Endnutzer-Flows (Liste, Antwort, Upvote) sind dieselben Routen wie in der App; hier der Fokus auf **Super-Admin**.

**Backend-Code:** [`src/special-polls/`](../src/special-polls/)  
**Rollen & Auth:** [.cursorrules](../.cursorrules), [`src/core/guards/roles.guard.ts`](../src/core/guards/roles.guard.ts)  
**Push bei neuer Umfrage:** [notification-suggestions.md](./notification-suggestions.md) (Abschnitt `NEW_SURVEY`, Präferenz `notificationPreferences.newSurveys`)

---

## Globale Voraussetzungen

### Authentifizierung

- Jede Anfrage: `Authorization: Bearer <FirebaseIdToken>`.
- Ohne gültigen Token: **401** (globales `AuthGuard`).

### Response-Envelope

Antworten sind eingepackt (globaler Interceptor):

```json
{
  "data": <Rückgabewert>,
  "timestamp": "<ISO-Zeit Berlin>"
}
```

Der Client arbeitet mit **`response.data`** (bzw. eurer HTTP-Abstraktion darauf).

### OpenAPI

Swagger UI: **`GET /api`**, Tag **`special-polls`**.

### Firestore (Einordnung)

| Collection        | Inhalt              |
|-------------------|---------------------|
| `special_polls`   | Umfrage-Dokumente   |

---

## Basis-Pfad

| Ressource      | Base-Pfad        |
|----------------|------------------|
| Special Polls  | `/special-polls` |

Präfixe wie `/dev` oder `/prd` hängen von der Deployment-Konfiguration ab ([README.md](../README.md), `BASE_URL`).

---

## Rollen-Matrix

| Methode | Pfad | Erlaubte Rollen |
|---------|------|------------------|
| `POST` | `/special-polls` | `super_admin` |
| `GET` | `/special-polls` | `user`, `admin`, `super_admin`, `anonymous_firebase_user`¹ |
| `GET` | `/special-polls/:id` | `user`, `admin`, `super_admin` |

¹ **Anonym:** Firebase `sign_in_provider === anonymous` und **kein** `users`-Dokument – nur **Liste**, kein `GET …/:id` (dort **403**).
| `PATCH` | `/special-polls/:id/status` | `super_admin` |
| `PATCH` | `/special-polls/:id/highlight` | `super_admin` |
| `POST` | `/special-polls/:id/responses/:responseId/upvote` | `user`, `admin`, `super_admin` |
| `POST` | `/special-polls/:id/responses` | `user`, `admin`, `super_admin` |
| `DELETE` | `/special-polls/:id/responses/me` | `user`, `admin`, `super_admin` |
| `PATCH` | `/special-polls/:id/responses` | `super_admin` |
| `DELETE` | `/special-polls/:id` | `super_admin` |

**Hinweis:** `SpecialPollsModule` importiert `UsersModule`, damit der `RolesGuard` funktioniert (siehe [.cursorrules](../.cursorrules)).

---

## Datenmodell (`SpecialPoll`)

Die API liefert nach Normalisierung immer dieses Schema im Feld `data` (ein Objekt oder Array von Objekten):

```json
{
  "id": "firestore-doc-id",
  "title": "Fragestellung / Titel",
  "status": "ACTIVE",
  "isHighlighted": false,
  "responses": [
    {
      "id": "stabile-antwort-uuid",
      "userId": "…",
      "userName": "…",
      "response": "Text der Antwort",
      "createdAt": "…",
      "upvotedUserIds": ["userA", "userB"]
    }
  ],
  "createdAt": "…",
  "updatedAt": "…"
}
```

### Status (`status`)

- **`ACTIVE`** – Umfrage ist für normale App-Nutzer **sichtbar** (Listen + Detail); neue Umfragen werden standardmäßig so angelegt.
- **`INACTIVE`** – Umfrage ist für Nutzer mit Rolle **`user`** in **Listen und Detail ausgeblendet** (**404** beim Einzelabruf, kein Eintrag in `GET /special-polls`). **`admin`** und **`super_admin`** sehen **alle** Umfragen inkl. `INACTIVE` (kein zusätzlicher Query-Parameter nötig).
- **`PATCH …/status`** darf nur **`ACTIVE`** oder **`INACTIVE`** setzen.
- **Legacy in Firestore (nur Lesen, nie als API-Antwort):** gespeichertes **`PENDING`** oder **`CLOSED`** wird beim Lesen wie **`ACTIVE`** behandelt (Rückwärtskompatibilität). Die API liefert dafür **`ACTIVE`**, nie `PENDING` oder `CLOSED`.

### Hervorhebung (`isHighlighted`)

- Steuert, ob eine Umfrage in der App **prominent** dargestellt werden soll (z. B. Widget „Hervorgehobene Frage“).
- Standard bei Erstellung: **`false`**, sofern nicht im Create-Body gesetzt.
- Änderung nur per **`PATCH /special-polls/:id/highlight`** (Super-Admin).

### Antworten (`responses`)

- Jede Antwort hat eine **stabile `id`** (UUID). Für Upvotes und Anzeige zwingend verwenden, **nicht** den Array-Index.
- **`upvotedUserIds`:** Liste der Firebase-User-IDs, die zugestimmt haben (Toggle über Upvote-Endpoint).

---

## Super-Admin: Umfrage anlegen

### `POST /special-polls`

**Body (JSON):**

| Feld | Pflicht | Typ | Beschreibung |
|------|---------|-----|--------------|
| `title` | Ja | string | Titel / Frage |
| `isHighlighted` | Nein | boolean | Standard `false` |

**Beispiel:**

```json
{
  "title": "Wohin soll der nächste Stadtausflug gehen?",
  "isHighlighted": true
}
```

**Response `data`:** angelegte `SpecialPoll` (u. a. `status: "ACTIVE"`, `responses: []`).

**Nebenwirkung:** Push an Nutzer mit `notificationPreferences.newSurveys === true` (Details: [notification-suggestions.md](./notification-suggestions.md)).

---

## Super-Admin: Status setzen

### `PATCH /special-polls/:id/status`

**Body:**

```json
{
  "status": "INACTIVE"
}
```

Erlaubte Werte: **`ACTIVE`**, **`INACTIVE`** (kein `PENDING` / `CLOSED` als neuer Schreibwert).

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Hervorhebung setzen

### `PATCH /special-polls/:id/highlight`

**Body:**

```json
{
  "isHighlighted": true
}
```

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Antworten ersetzen / moderieren

### `PATCH /special-polls/:id/responses`

**Zweck:** Gesamte Liste `responses` schreiben (Moderation, Korrekturen). Nur Super-Admin.

**Body:**

```json
{
  "responses": [
    {
      "id": "optional-oder-wird-normalisiert",
      "userId": "…",
      "userName": "…",
      "response": "…",
      "createdAt": "…",
      "upvotedUserIds": ["…"]
    }
  ]
}
```

| Feld pro Eintrag | Pflicht | Hinweis |
|------------------|---------|---------|
| `userId`, `userName`, `response`, `createdAt` | Ja | |
| `id` | Empfohlen | Fehlt oder leer → Backend vergibt UUID beim Speichern |
| `upvotedUserIds` | Nein | Fehlt → wird als leeres Array behandelt |

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Umfrage löschen

### `DELETE /special-polls/:id`

**Response `data`:** typischerweise `null` / leer je nach Interceptor-Konvention bei `void` – Status **200** bei Erfolg.

---

## Lesen (für Admin-UI & Vorschau)

### `GET /special-polls`

**Query (optional):**

| Parameter | Wert | Effekt |
|-----------|------|--------|
| `highlighted` | `true` | Nur Umfragen mit `isHighlighted === true` |

**Sichtbarkeit:** Nutzer mit **`admin`** oder **`super_admin`** erhalten **alle** Einträge inkl. **`INACTIVE`**. Reine **`user`**-Konten erhalten **keine** `INACTIVE`-Umfragen in dieser Liste. **Firebase-Anonymous ohne Profil** dürfen nur diese Liste (ohne Antwortinhalte in `responses`); kein Einzelabruf `GET …/:id`.

**Response `data`:** `SpecialPoll[]`, sortiert absteigend nach `createdAt` (Backend).

### `GET /special-polls/:id`

**Sichtbarkeit:** Für **`user`** liefert das Backend **404**, wenn die Umfrage (nach Normalisierung) **`INACTIVE`** ist. **`admin`** / **`super_admin`** erhalten die Ressource. **Firebase-Anonymous ohne `users`-Dokument:** **403** (kein Zugriff auf Einzel-Umfrage).

**Response `data`:** eine `SpecialPoll`.

---

## Fehler (Auswahl)

| Code | Typische Ursache |
|------|------------------|
| **401** | Token fehlt/ungültig |
| **403** | Rolle passt nicht (`RolesGuard`) |
| **404** | Umfrage oder Antwort (`responseId`) nicht gefunden; oder Umfrage **`INACTIVE`** für normale Nutzer (`user`) |
| **400** | Validierung (DTO / class-validator) |

---

## UI-Empfehlungen (Kurz)

- **Highlight:** Schalter oder Stern-Icon, gebunden an `PATCH …/highlight`.
- **Status:** Dropdown **`ACTIVE`** / **`INACTIVE`**. Hinweis: historische Firestore-Werte `PENDING` / `CLOSED` erscheinen in der API als **`ACTIVE`**.
- **Moderation:** Bei `PATCH …/responses` immer vollständige Liste senden; `id` und `upvotedUserIds` aus der letzten `GET`-Antwort übernehmen, um Upvotes nicht zu verlieren.

---

## Verwandte Dokumentation

- Flutter-App (Lesen, Antworten, Upvotes): [flutter-special-polls-integration.md](./flutter-special-polls-integration.md)
- Benachrichtigungen: [notification-suggestions.md](./notification-suggestions.md)

---

## 6. Notifications

### 6.1 Präferenzen

## Übersicht

Diese Dokumentation beschreibt alle verfügbaren Notification-Präferenzen, die vom Client gesetzt werden können. Die Präferenzen steuern, welche Push-Notifications ein User erhält.

**Wichtig:** Alle Präferenzen sind standardmäßig `false` (wenn `undefined`). Notifications werden nur gesendet, wenn die Präferenz explizit auf `true` gesetzt ist.

---

## API Endpoint

### Notification-Präferenzen aktualisieren

**Endpoint:** `PATCH /users/:id/profile`

**Authorization:** Erforderlich (Firebase Auth Token)

**Request Body:**
```json
{
  "notificationPreferences": {
    "directMessages": true,
    "newBusinesses": false,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "newEvents": true,
    "eventUpdates": true,
    "newJobOffers": false,
    "newNews": false,
    "newSurveys": false
  }
}
```

**Response:** Aktualisiertes `UserProfile` Objekt

**Beispiel Request:**
```http
PATCH /users/{userId}/profile
Authorization: Bearer {firebaseToken}
Content-Type: application/json

{
  "notificationPreferences": {
    "directMessages": true,
    "newEvents": true
  }
}
```

**Hinweis:** Es können einzelne Präferenzen aktualisiert werden. Nicht gesendete Felder bleiben unverändert.

---

## Verfügbare Notification-Präferenzen

### 1. `directMessages`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Nachrichten in Direct Chats erhält.

**Notification-Typ:** `DIRECT_CHAT_MESSAGE`

**Wann wird die Notification gesendet:**
- Wenn eine neue Nachricht in einem Direct Chat empfangen wird
- Nur wenn der Chat nicht stummgeschaltet ist (`muted: false`)

**Beispiel:**
```json
{
  "notificationPreferences": {
    "directMessages": true
  }
}
```

---

### 2. `newBusinesses`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue aktive Businesses erhält.

**Notification-Typ:** `NEW_BUSINESS`

**Wann wird die Notification gesendet:**
- Wenn ein neues Business mit Status `ACTIVE` erstellt wird
- Wenn ein Business von `PENDING` zu `ACTIVE` geändert wird

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newBusinesses": true
  }
}
```

---

### 3. `directChatRequests`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Direct Chat-Anfragen erhält.

**Notification-Typ:** `DIRECT_CHAT_REQUEST`

**Wann wird die Notification gesendet:**
- Wenn ein anderer User eine Chat-Anfrage sendet (Status: `pending`)
- Nicht gesendet, wenn der User blockiert ist
- Nicht gesendet, wenn bereits ein Chat existiert

**Beispiel:**
```json
{
  "notificationPreferences": {
    "directChatRequests": true
  }
}
```

---

### 4. `contactRequestResponses`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications erhält, wenn ein Admin auf eine Contact Request antwortet.

**Notification-Typ:** `CONTACT_REQUEST_RESPONSE`

**Wann wird die Notification gesendet:**
- Wenn ein Admin eine Nachricht zu einer Contact Request hinzufügt
- Nur wenn der `responded` Status von `false` zu `true` wechselt
- Nicht für eigene Nachrichten des Users

**Beispiel:**
```json
{
  "notificationPreferences": {
    "contactRequestResponses": true
  }
}
```

---

### 5. `newEvents`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Events erhält.

**Notification-Typ:** `NEW_EVENT`

**Wann wird die Notification gesendet:**
- Wenn ein neues Event erstellt wird
- Optional: Gefiltert nach Stadt (`currentCityId`)
- Optional: Gefiltert nach Event-Kategorie basierend auf User-Präferenzen

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newEvents": true
  }
}
```

---

### 6. `eventUpdates`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications erhält, wenn ein favorisiertes Event aktualisiert wird.

**Notification-Typ:** `FAV_EVENT_UPDATE`

**Wann wird die Notification gesendet:**
- Wenn ein Event aktualisiert wird, das der User favorisiert hat (`favoriteEventIds`)
- Unterscheidung nach Update-Typ: `TIME`, `LOCATION`, `DESCRIPTION`, `OTHER`

**Beispiel:**
```json
{
  "notificationPreferences": {
    "eventUpdates": true
  }
}
```

---

### 7. `newJobOffers`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Job-Angebote erhält.

**Notification-Typ:** `NEW_JOB_OFFER`

**Wann wird die Notification gesendet:**
- Wenn ein neues Job-Angebot erstellt wird
- Optional: Gefiltert nach Job-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newJobOffers": true
  }
}
```

---

### 8. `newNews`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue News-Artikel erhält.

**Notification-Typ:** `NEW_NEWS`

**Wann wird die Notification gesendet:**
- Wenn ein neuer News-Artikel erstellt wird
- Optional: Gefiltert nach News-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newNews": true
  }
}
```

---

### 9. `newSurveys`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Umfragen (Special Polls) erhält.

**Notification-Typ:** `NEW_SURVEY`

**Wann wird die Notification gesendet:**
- Wenn eine neue Umfrage erstellt wird
- Optional: Gefiltert nach Umfrage-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newSurveys": true
  }
}
```

---

## TypeScript Interface

Für TypeScript-Clients kann folgendes Interface verwendet werden:

```typescript
export interface NotificationPreferences {
  directMessages?: boolean;
  newBusinesses?: boolean;
  directChatRequests?: boolean;
  contactRequestResponses?: boolean;
  newEvents?: boolean;
  eventUpdates?: boolean;
  newJobOffers?: boolean;
  newNews?: boolean;
  newSurveys?: boolean;
}
```

---

## Vollständiges Beispiel

### Alle Präferenzen aktivieren

```json
{
  "notificationPreferences": {
    "directMessages": true,
    "newBusinesses": true,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "newEvents": true,
    "eventUpdates": true,
    "newJobOffers": true,
    "newNews": true,
    "newSurveys": true
  }
}
```

### Alle Präferenzen deaktivieren

```json
{
  "notificationPreferences": {
    "directMessages": false,
    "newBusinesses": false,
    "directChatRequests": false,
    "contactRequestResponses": false,
    "newEvents": false,
    "eventUpdates": false,
    "newJobOffers": false,
    "newNews": false,
    "newSurveys": false
  }
}
```

### Nur wichtige Präferenzen aktivieren

```json
{
  "notificationPreferences": {
    "directMessages": true,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "eventUpdates": true
  }
}
```

---

## Wichtige Hinweise

### Default-Verhalten

- **Alle Präferenzen sind standardmäßig `false`** (wenn `undefined`)
- Notifications werden **nur gesendet**, wenn die Präferenz explizit auf `true` gesetzt ist
- Wenn eine Präferenz nicht gesetzt ist (`undefined`), wird keine Notification gesendet

### Teilweise Updates

- Es können einzelne Präferenzen aktualisiert werden
- Nicht gesendete Felder bleiben unverändert
- Beispiel: Nur `directMessages` aktualisieren, ohne andere Präferenzen zu ändern

### FCM Token Management

Damit Notifications empfangen werden können, muss der Client:

1. **FCM Token registrieren:**
   ```
   POST /users/:id/fcm-token
   Body: { "token": "...", "deviceId": "...", "platform": "ios" | "android" | "web" }
   ```

2. **FCM Token entfernen** (bei Logout oder App-Deinstallation):
   ```
   DELETE /users/:id/fcm-token/:deviceId
   ```

Siehe CONSTITUTION §6.2

---

## Notification Payload Struktur

Jede Notification enthält folgende Struktur:

```typescript
{
  title: string;        // Titel der Notification
  body: string;         // Text der Notification
  data: {
    type: string;       // Notification-Typ (z.B. "DIRECT_CHAT_MESSAGE")
    // ... type-specific fields
  }
}
```

Die `data`-Felder variieren je nach Notification-Typ. Siehe CONSTITUTION §6.2 für Details zu jedem Typ.

---

## Implementierungsstatus

| Präferenz | Status | Notification-Typ |
|-----------|--------|------------------|
| `directMessages` | ✅ Implementiert | `DIRECT_CHAT_MESSAGE` |
| `newBusinesses` | ✅ Implementiert | `NEW_BUSINESS` |
| `directChatRequests` | ✅ Implementiert | `DIRECT_CHAT_REQUEST` |
| `contactRequestResponses` | ✅ Implementiert | `CONTACT_REQUEST_RESPONSE` |
| `newEvents` | ✅ Implementiert | `NEW_EVENT` |
| `eventUpdates` | ✅ Implementiert | `FAV_EVENT_UPDATE` |
| `newJobOffers` | ✅ Implementiert | `NEW_JOB_OFFER` |
| `newNews` | ✅ Implementiert | `NEW_NEWS` |
| `newSurveys` | ✅ Implementiert | `NEW_SURVEY` |

---

## Fehlerbehandlung

### Mögliche Fehler

**400 Bad Request:**
- Ungültige Präferenz-Werte (nicht `boolean`)
- Validierungsfehler im Request Body

**401 Unauthorized:**
- Fehlender oder ungültiger Authorization Header
- Ungültiges Firebase Token

**404 Not Found:**
- User mit angegebener ID existiert nicht

**Beispiel Error Response:**
```json
{
  "statusCode": 400,
  "message": ["notificationPreferences.directMessages must be a boolean value"],
  "error": "Bad Request"
}
```

---

## Best Practices für Clients

1. **Initiale Einstellungen:** Beim ersten App-Start alle Präferenzen explizit setzen (nicht `undefined` lassen)

2. **UI-Feedback:** Nach dem Update die aktualisierten Präferenzen vom Server abrufen und in der UI anzeigen

3. **Offline-Support:** Änderungen lokal speichern und beim nächsten Online-Status synchronisieren

4. **User Experience:** 
   - Klare Beschreibungen für jede Präferenz in der UI
   - Gruppierung nach Kategorien (z.B. "Chats", "Events", "News")
   - Möglichkeit, alle Präferenzen auf einmal zu aktivieren/deaktivieren

5. **FCM Token:** 
   - Token bei App-Start registrieren
   - Token bei Logout entfernen
   - Token-Refresh behandeln

---

**Erstellt:** 2024  
**Zuletzt aktualisiert:** 2024  
**Version:** 1.0


### 6.2 Katalog & Business-User

## Übersicht

Dieses Dokument beschreibt vorgeschlagene Notification-Typen, die noch implementiert werden können. Die Notifications sind unterteilt in **Aktive Updates** (sofortige Notifications bei Events) und **Scheduled Jobs** (zeitbasierte Notifications).

**Aktuell implementiert:**
- `DIRECT_CHAT_MESSAGE`: Sent when a new message is received in a direct chat
- `NEW_BUSINESS`: Sent when a new business becomes active
- `DIRECT_CHAT_REQUEST`: Sent when a user receives a direct chat request
- `CONTACT_REQUEST_RESPONSE`: Sent when an admin responds to a contact request
- `NEW_EVENT`: Sent when a new event is created
- `FAV_EVENT_UPDATE`: Sent when a favorited event is updated

---

## 📱 Aktive Updates (Event-basiert)

Diese Notifications werden sofort gesendet, wenn ein bestimmtes Event eintritt.

### 1. DIRECT_CHAT_REQUEST

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn User A eine Chat-Anfrage an User B sendet (Status: `pending`).

**Trigger:**  
- `POST /direct-chats` wird aufgerufen
- Chat wird mit Status `pending` erstellt

**Empfänger:**  
- Der eingeladene User (`invitedUserId`)

**Notification Payload:**
```typescript
{
  title: "Neue Chat-Anfrage",
  body: "{senderName} möchte mit dir chatten",
  data: {
    type: "DIRECT_CHAT_REQUEST",
    chatId: string,
    senderId: string,
    senderName: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.directChatRequests?: boolean`
- Default: `false` (wenn `undefined`)

**Implementierung:**
- ✅ Service: `DirectChatsService.createChat()`
- ✅ Notification Interface: `DirectChatRequestNotificationData`
- ✅ Module: `DirectChatsModule` importiert bereits `NotificationsModule`

**Besonderheiten:**
- Nicht senden, wenn User blockiert ist
- Nicht senden, wenn Chat bereits existiert
- Notification wird nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

---

### 2. CONTACT_REQUEST_RESPONSE

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein Admin auf eine Contact Request antwortet.

**Trigger:**  
- Admin fügt eine Nachricht zu einer Contact Request hinzu
- `responded` Status ändert sich von `false` zu `true`

**Empfänger:**  
- Der User, der die Contact Request erstellt hat (`userId`)

**Notification Payload:**
```typescript
{
  title: "Antwort auf deine Anfrage",
  body: "Du hast eine Antwort auf deine {requestType} Anfrage erhalten",
  data: {
    type: "CONTACT_REQUEST_RESPONSE",
    contactRequestId: string,
    requestType: "GENERAL" | "FEEDBACK" | "BUSINESS_CLAIM" | "BUSINESS_REQUEST"
  }
}
```

**Präferenz:**  
- `notificationPreferences.contactRequestResponses?: boolean`
- Default: `true`

**Implementierung:**
- ✅ Service: `ContactService.addAdminResponse()` und `ContactService.addMessage()`
- ✅ Notification Interface: `ContactRequestResponseNotificationData`
- ✅ Module: `ContactModule` importiert `NotificationsModule`

**Besonderheiten:**
- ✅ Nur senden, wenn Admin antwortet (`isAdminResponse: true`)
- ✅ Nicht senden für eigene Nachrichten des Users
- ✅ Notification wird nur gesendet, wenn `responded` Status von `false` zu `true` wechselt
- ✅ Default: `true` (wenn `undefined`)

---

### 3. NEW_EVENT

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein neues Event erstellt wird (analog zu `NEW_BUSINESS`).

**Trigger:**  
- Event wird mit Status `ACTIVE` erstellt (z. B. durch Admin/Super Admin oder CSV-Import), **oder**
- Ein zuvor `PENDING`-Event wird per `PATCH /events/:id/approve` freigegeben

**Nicht ausgelöst bei:**  
- Erstellung mit Status `PENDING` (reguläre Nutzer / Businesses)

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Nur User in der gleichen Stadt (`currentCityId`)

**Notification Payload:**
```typescript
{
  title: "Neues Event verfügbar",
  body: "{eventTitle} - {eventCategory}",
  data: {
    type: "NEW_EVENT",
    eventId: string,
    eventTitle: string,
    categoryId: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newEvents?: boolean`
- Default: `true`

**Implementierung:**
- ✅ Service: `EventsService.create()` (nur wenn `initialStatus === ACTIVE`), `EventsService.approveEvent()`
- ✅ Notification Interface: `EventNotificationData`
- ✅ Module: `EventsModule` importiert bereits `NotificationsModule`

**Besonderheiten:**
- Kein Push, wenn das Event nur mit Status `PENDING` erstellt wurde; nach Freigabe (`PATCH /events/:id/approve`) wird `NEW_EVENT` gesendet
- Optional: Filterung nach Stadt
- Optional: Filterung nach Event-Kategorie basierend auf User-Präferenzen

---

### 4. FAV_EVENT_UPDATE

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn ein favorisiertes Event aktualisiert wird.

**Trigger:**  
- `PATCH /events/:id` wird aufgerufen
- Event wird aktualisiert und User hat Event in `favoriteEventIds`

**Empfänger:**  
- Alle User, die das Event favorisiert haben (`favoriteEventIds`)

**Notification Payload:**
```typescript
{
  title: "Event wurde aktualisiert",
  body: "{eventTitle} wurde aktualisiert",
  data: {
    type: "FAV_EVENT_UPDATE",
    eventId: string,
    eventTitle: string,
    updateType: "TIME" | "LOCATION" | "DESCRIPTION" | "OTHER"
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventUpdates?: boolean`
- Default: `true`

**Implementierung:**
- ✅ Service: `EventsService.update()`
- ✅ Notification Interface: `FavEventUpdateNotificationData`
- ✅ Module: `EventsModule` importiert bereits `NotificationsModule`

**Besonderheiten:**
- ✅ Nur für favorisierte Events
- ✅ Unterscheidung nach Update-Typ (TIME, LOCATION, DESCRIPTION, OTHER)
- Keine Benachrichtigung, wenn vor oder nach dem Update das Event nicht öffentlich sichtbar ist (z. B. `status: PENDING`)

---

### 5. NEW_JOB_OFFER

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein neues Job-Angebot erstellt wird.

**Trigger:**  
- `POST /job-offers` wird aufgerufen
- Job Offer wird erfolgreich erstellt

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Gefiltert nach Job-Kategorie oder Stadt

**Notification Payload:**
```typescript
{
  title: "Neues Job-Angebot",
  body: "{jobTitle} - {jobCategory}",
  data: {
    type: "NEW_JOB_OFFER",
    jobOfferId: string,
    jobTitle: string,
    jobOfferCategoryId: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newJobOffers?: boolean`
- Default: `false` (wenn `undefined`)

**Implementierung:**
- Service: `JobOffersService.create()`
- Notification Interface: `JobOfferNotificationData`
- Module: `JobOffersModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Optional: Filterung nach Job-Kategorie
- Optional: Filterung nach Stadt/Location

---

### 6. NEW_NEWS

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn neue News gepostet werden.

**Trigger:**  
- `POST /news` wird aufgerufen
- News wird erfolgreich erstellt

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Gefiltert nach News-Kategorie oder Stadt

**Notification Payload:**
```typescript
{
  title: "Neue Nachricht verfügbar",
  body: "{newsTitle}",
  data: {
    type: "NEW_NEWS",
    newsId: string,
    newsTitle: string,
    categoryId?: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newNews?: boolean`
- Default: `false` (wenn `undefined`)

**Implementierung:**
- Service: `NewsService.create()`
- Notification Interface: `NewsNotificationData`
- Module: `NewsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Optional: Filterung nach News-Kategorie
- Optional: Filterung nach Stadt/Location

---

### 7. NEW_SURVEY

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn eine neue Umfrage erstellt wird.

**Trigger:**  
- `POST /special-polls` wird aufgerufen
- Umfrage wird erfolgreich erstellt

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Gefiltert nach Umfrage-Kategorie oder Stadt

**Notification Payload:**
```typescript
{
  title: "Neue Umfrage verfügbar",
  body: "{surveyTitle}",
  data: {
    type: "NEW_SURVEY",
    surveyId: string,
    surveyTitle: string,
    categoryId?: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newSurveys?: boolean`
- Default: `false` (wenn `undefined`)

**Implementierung:**
- Service: `SpecialPollsService.create()`
- Notification Interface: `SurveyNotificationData`
- Module: `SpecialPollsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Optional: Filterung nach Umfrage-Kategorie
- Optional: Filterung nach Stadt/Location

---

## ⏰ Scheduled Jobs (Zeit-basiert)

Diese Notifications erfordern einen Scheduled Job/Cron Service, der regelmäßig ausgeführt wird.

### 8. EVENT_REMINDER

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet als Erinnerung vor einem favorisierten Event.

**Trigger:**  
- Scheduled Job läuft täglich (z.B. um 8:00 Uhr)
- Prüft alle Events mit `dailyTimeSlots` oder `startDate` in den nächsten 24 Stunden
- Prüft alle Events mit `dailyTimeSlots` oder `startDate` in der nächsten Stunde

**Empfänger:**  
- Alle User, die das Event favorisiert haben (`favoriteEventIds`)

**Notification Payload:**
```typescript
{
  title: "Event-Erinnerung",
  body: "{eventTitle} startet {timeframe}",
  data: {
    type: "EVENT_REMINDER",
    eventId: string,
    eventTitle: string,
    startTime: string,
    reminderType: "24H" | "1H"
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventReminders?: boolean`
- Default: `true`

**Implementierung:**
- Neuer Scheduled Service: `EventReminderSchedulerService`
- Cron Job: Täglich um 8:00 Uhr (24h Reminder) und stündlich (1h Reminder)
- Notification Interface: `EventReminderNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Technische Anforderungen:**
- NestJS `@nestjs/schedule` Package
- Cron Job für regelmäßige Ausführung
- Effiziente Query für Events mit bevorstehenden Zeitpunkten
- Berücksichtigung von `dailyTimeSlots` (mehrere Zeitpunkte pro Event)

**Besonderheiten:**
- Zwei Reminder-Typen: 24h vorher und 1h vorher
- Nicht senden, wenn Event bereits vorbei ist
- Nicht senden, wenn bereits eine Reminder-Notification für diesen Zeitpunkt gesendet wurde

---

## 📊 Implementierungs-Priorität

### Phase 1 (Sofort umsetzbar)
1. ✅ **DIRECT_CHAT_REQUEST** - Hoher Nutzen, einfache Implementierung
2. ✅ **NEW_EVENT** - Analog zu NEW_BUSINESS, konsistentes Pattern
3. ✅ **CONTACT_REQUEST_RESPONSE** - Wichtig für Support-Erlebnis

### Phase 2 (Mittelfristig)
4. ✅ **NEW_JOB_OFFER** - Ähnlich wie NEW_EVENT/NEW_BUSINESS
5. ✅ **FAV_EVENT_UPDATE** - Für bessere User-Experience
6. ⏳ **NEW_NEWS** - Analog zu NEW_EVENT/NEW_BUSINESS
7. ⏳ **NEW_SURVEY** - Analog zu NEW_EVENT/NEW_BUSINESS

### Phase 3 (Optional)
8. ⏰ **EVENT_REMINDER** - Erfordert Scheduled Jobs Setup

---

## 🔧 Technische Implementierungs-Hinweise

### Für Aktive Updates:
1. **Notification Interface erstellen:**
   ```typescript
   // src/notifications/domain/interfaces/notification-payload.interface.ts
   export interface [Type]NotificationData {
     type: '[NOTIFICATION_TYPE]';
     // ... type-specific fields
   }
   ```

2. **Service erweitern:**
   - `NotificationService` und `UsersService` injizieren
   - Präferenz-Prüfung implementieren
   - Notification senden nach erfolgreicher Operation

3. **Module erweitern:**
   - `NotificationsModule` importieren
   - Bei circular dependencies: `forwardRef()` verwenden

### Für Scheduled Jobs:
1. **NestJS Schedule Setup:**
   ```typescript
   // app.module.ts
   import { ScheduleModule } from '@nestjs/schedule';
   
   @Module({
     imports: [
       ScheduleModule.forRoot(),
       // ...
     ],
   })
   ```

2. **Scheduler Service erstellen:**
   ```typescript
   @Injectable()
   export class EventReminderSchedulerService {
     @Cron('0 8 * * *') // Täglich um 8:00 Uhr
     async send24HourReminders() {
       // Implementation
     }
     
     @Cron('0 * * * *') // Stündlich
     async send1HourReminders() {
       // Implementation
     }
   }
   ```

---

## 📝 Notification Preferences Schema

```typescript
export interface NotificationPreferences {
  directMessages?: boolean;           // ✅ Implementiert
  newBusinesses?: boolean;            // ✅ Implementiert
  directChatRequests?: boolean;       // ✅ Implementiert
  contactRequestResponses?: boolean;   // ✅ Implementiert
  newEvents?: boolean;                // ✅ Implementiert
  eventReminders?: boolean;           // 🟡 Phase 3
  eventUpdates?: boolean;             // ✅ Implementiert
  newJobOffers?: boolean;             // 🟡 Phase 2
  newNews?: boolean;                  // 🟡 Phase 2
  newSurveys?: boolean;               // 🟡 Phase 2
}
```

**Default-Verhalten:**  
Alle Präferenzen sind standardmäßig `false` (wenn `undefined`). Notifications werden nur gesendet, wenn die Präferenz explizit auf `true` gesetzt ist.

---

## 🎯 Nächste Schritte

1. **Review dieses Dokuments** mit dem Team
2. **Prioritäten festlegen** basierend auf Business-Requirements
3. **Phase 1 umsetzen** (DIRECT_CHAT_REQUEST, NEW_EVENT, CONTACT_REQUEST_RESPONSE)
4. **Scheduled Jobs Setup** für Phase 2 vorbereiten
5. **Monitoring & Analytics** für Notification-Delivery implementieren

---

**Erstellt:** 2024  
**Status:** Vorschlag  
**Zuletzt aktualisiert:** 2024


## Übersicht

Dieses Dokument beschreibt Notification-Typen, die speziell für **Business User** relevant sind. Business User haben andere Bedürfnisse als normale User:

- **Nicht relevant:** Generelle neue Businesses in der Stadt
- **Relevant:** Status-Änderungen der eigenen Businesses (z.B. PENDING → ACTIVE)
- **Relevant:** Antworten auf Business-bezogene Contact Requests (BUSINESS_CLAIM, BUSINESS_REQUEST)
- **Relevant:** Interaktionen mit eigenen Events und Businesses

**Business User Identifikation:**
- Business User haben `businessIds[]` Array in ihrem Profil
- User-Typ: `BUSINESS` oder `PREMIUM_BUSINESS`
- Können mehrere Businesses besitzen

**Aktuell implementiert:**
- ✅ `BUSINESS_ACTIVATED`: Sent when a business owned by the business user changes from PENDING to ACTIVE
- ✅ `BUSINESS_CONTACT_REQUEST_RESPONSE`: Sent when an admin responds to a BUSINESS_CLAIM or BUSINESS_REQUEST contact request

---

## 📱 Aktive Updates (Event-basiert)

Diese Notifications werden sofort gesendet, wenn ein bestimmtes Event eintritt.

### 1. BUSINESS_ACTIVATED

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn ein Business des Business Users von `PENDING` zu `ACTIVE` geschaltet wird. Dies ist für Business User von höchster Priorität, da sie wissen müssen, wann ihr Business live geht.

**Trigger:**  
- `PATCH /businesses/:id/status` wird aufgerufen
- Business Status ändert sich von `PENDING` zu `ACTIVE`
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Dein Business ist jetzt aktiv",
  body: "{businessName} wurde freigeschaltet und ist jetzt sichtbar",
  data: {
    type: "BUSINESS_ACTIVATED",
    businessId: string,
    businessName: string,
    previousStatus: "PENDING",
    newStatus: "ACTIVE"
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessActivated?: boolean`
- Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Implementierung:**
- ✅ Service: `BusinessesService.updateStatus()` und `BusinessesService.sendBusinessActivatedNotification()`
- ✅ Notification Interface: `BusinessActivatedNotificationData`
- ✅ Module: `BusinessesModule` importiert bereits `NotificationsModule`
- ✅ Prüfung: Nur senden, wenn Business User existiert und Business in `businessIds` enthalten ist
- ✅ Tests: Vollständige Test-Suite in `businesses.service.spec.ts`

**Besonderheiten:**
- Nur für Business User (nicht für normale User)
- Nur bei Status-Änderung PENDING → ACTIVE
- Nicht senden, wenn Business bereits ACTIVE war
- Wichtig: Business User sollten sofort informiert werden, wenn ihr Business freigeschaltet wird

---

### 2. BUSINESS_CONTACT_REQUEST_RESPONSE

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn ein Admin auf eine Business-bezogene Contact Request antwortet. Besonders wichtig für `BUSINESS_CLAIM` und `BUSINESS_REQUEST` Anfragen.

**Trigger:**  
- Admin fügt eine Nachricht zu einer Contact Request hinzu
- Contact Request Typ ist `BUSINESS_CLAIM` oder `BUSINESS_REQUEST`
- `responded` Status ändert sich von `false` zu `true`
- Contact Request gehört zu einem Business User (`contactRequestIds`)

**Empfänger:**  
- Der Business User, der die Contact Request erstellt hat (`userId`)

**Notification Payload:**
```typescript
{
  title: "Antwort auf deine Business-Anfrage",
  body: "Du hast eine Antwort auf deine {requestType} Anfrage erhalten",
  data: {
    type: "BUSINESS_CONTACT_REQUEST_RESPONSE",
    contactRequestId: string,
    requestType: "BUSINESS_CLAIM" | "BUSINESS_REQUEST",
    businessId?: string, // Falls vorhanden
    businessName?: string // Falls vorhanden
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessContactRequestResponses?: boolean`
- Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Implementierung:**
- ✅ Service: `ContactService.addAdminResponse()`, `ContactService.addMessage()` und `ContactService.sendBusinessContactRequestResponseNotification()`
- ✅ Notification Interface: `BusinessContactRequestResponseNotificationData`
- ✅ Module: `ContactModule` importiert bereits `NotificationsModule`
- ✅ Prüfung: Nur senden für `BUSINESS_CLAIM` und `BUSINESS_REQUEST` Typen
- ✅ Prüfung: Nur für Business User (nicht für normale User)
- ✅ Tests: Vollständige Test-Suite in `contact.service.spec.ts`

**Besonderheiten:**
- ✅ Nur senden, wenn Admin antwortet (`isAdminResponse: true`)
- ✅ Nur für Business-bezogene Request-Typen
- ✅ Nicht senden für eigene Nachrichten des Business Users
- ✅ Notification wird nur gesendet, wenn `responded` Status von `false` zu `true` wechselt
- ✅ Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Unterschied zu normalen User:**
- Normale User erhalten `CONTACT_REQUEST_RESPONSE` für GENERAL und FEEDBACK
- Business User erhalten `BUSINESS_CONTACT_REQUEST_RESPONSE` für BUSINESS_CLAIM und BUSINESS_REQUEST
- Separate Notification-Typen für bessere Filterung und Personalisierung

---

### 3. BUSINESS_STATUS_CHANGED

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn der Status eines eigenen Businesses geändert wird (z.B. ACTIVE → INACTIVE oder INACTIVE → ACTIVE). Wichtig für Business User, um über Status-Änderungen informiert zu bleiben.

**Trigger:**  
- `PATCH /businesses/:id/status` wird aufgerufen
- Business Status ändert sich (außer PENDING → ACTIVE, das wird von BUSINESS_ACTIVATED abgedeckt)
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Business-Status geändert",
  body: "{businessName} Status wurde von {previousStatus} zu {newStatus} geändert",
  data: {
    type: "BUSINESS_STATUS_CHANGED",
    businessId: string,
    businessName: string,
    previousStatus: "ACTIVE" | "INACTIVE" | "PENDING",
    newStatus: "ACTIVE" | "INACTIVE" | "PENDING"
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessStatusChanged?: boolean`
- Default: `true` (wenn `undefined`)

**Implementierung:**
- Service: `BusinessesService.updateStatus()`
- Notification Interface: `BusinessStatusChangedNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren
- Prüfung: Nur senden, wenn Status sich ändert (nicht bei erstmaliger Erstellung)
- Prüfung: Nicht senden für PENDING → ACTIVE (wird von BUSINESS_ACTIVATED abgedeckt)

**Besonderheiten:**
- Nur für Business User
- Alle Status-Änderungen außer PENDING → ACTIVE
- Wichtig für Transparenz über Admin-Aktionen

---

### 4. EVENT_INTERACTION (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn jemand mit einem Event des Business Users interagiert (z.B. favorisiert, kommentiert, teilnimmt). **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- User favorisiert ein Event (`favoriteEventIds`)
- User kommentiert ein Event (falls Kommentar-Feature existiert)
- User nimmt an einem Event teil (falls Teilnahme-Feature existiert)
- Event gehört zu einem Business User (`eventIds`)

**Empfänger:**  
- Der Business User, der das Event erstellt hat (`eventIds` enthält die Event-ID)

**Notification Payload:**
```typescript
{
  title: "Neue Interaktion mit deinem Event",
  body: "{interactionType} für {eventTitle}",
  data: {
    type: "EVENT_INTERACTION",
    eventId: string,
    eventTitle: string,
    interactionType: "FAVORITE" | "COMMENT" | "PARTICIPATION",
    userId?: string, // Optional: User, der interagiert hat
    userName?: string // Optional: Name des Users
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventInteractions?: boolean`
- Default: `false` (wenn `undefined`) - Optional, nicht alle Business User wollen diese Notifications

**Implementierung:**
- Service: TBD (abhängig von Event-Interaktions-Features)
- Notification Interface: `EventInteractionNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur für Business User
- Optional - Business User können diese Notifications deaktivieren
- Für zukünftige Features

---

### 5. BUSINESS_REVIEW (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn jemand eine Review/Bewertung für ein Business des Business Users schreibt. **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- User schreibt eine Review für ein Business
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Neue Bewertung erhalten",
  body: "{businessName} hat eine neue Bewertung erhalten",
  data: {
    type: "BUSINESS_REVIEW",
    businessId: string,
    businessName: string,
    reviewId: string,
    rating?: number, // Falls Bewertungssystem existiert
    userId?: string // Optional: User, der die Review geschrieben hat
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessReviews?: boolean`
- Default: `true` (wenn `undefined`) - Business User sollten über Reviews informiert werden

**Implementierung:**
- Service: TBD (abhängig von Review-Feature)
- Notification Interface: `BusinessReviewNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur für Business User
- Für zukünftige Features
- Wichtig für Reputation-Management

---

## ⏰ Scheduled Jobs (Zeit-basiert)

Diese Notifications erfordern einen Scheduled Job/Cron Service, der regelmäßig ausgeführt wird.

### 6. BUSINESS_PERFORMANCE_SUMMARY (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Wöchentliche oder monatliche Zusammenfassung der Business-Performance (z.B. Anzahl Scans, Event-Teilnahmen, etc.). **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- Scheduled Job läuft wöchentlich (z.B. Montag 8:00 Uhr) oder monatlich
- Sammelt Metriken für alle Businesses eines Business Users

**Empfänger:**  
- Alle Business User mit aktiven Businesses

**Notification Payload:**
```typescript
{
  title: "Deine Business-Zusammenfassung",
  body: "Diese Woche: {scanCount} Scans, {eventParticipations} Event-Teilnahmen",
  data: {
    type: "BUSINESS_PERFORMANCE_SUMMARY",
    period: "WEEKLY" | "MONTHLY",
    businessIds: string[],
    metrics: {
      scanCount: number,
      eventParticipations?: number,
      // ... weitere Metriken
    }
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessPerformanceSummary?: boolean`
- Default: `false` (wenn `undefined`) - Optional

**Implementierung:**
- Neuer Scheduled Service: `BusinessPerformanceSummarySchedulerService`
- Cron Job: Wöchentlich oder monatlich
- Notification Interface: `BusinessPerformanceSummaryNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren

**Technische Anforderungen:**
- NestJS `@nestjs/schedule` Package
- Cron Job für regelmäßige Ausführung
- Aggregation von Business-Metriken
- Effiziente Query für alle Business User

**Besonderheiten:**
- Nur für Business User
- Optional - Business User können diese Notifications deaktivieren
- Für zukünftige Features

---

## 📊 Implementierungs-Priorität

### Phase 1 (Sofort umsetzbar - Hoch)
1. ✅ **BUSINESS_ACTIVATED** - Kritisch für Business User, einfache Implementierung
2. ✅ **BUSINESS_CONTACT_REQUEST_RESPONSE** - Wichtig für Support-Erlebnis, ähnlich zu CONTACT_REQUEST_RESPONSE

### Phase 2 (Mittelfristig)
3. 🟡 **BUSINESS_STATUS_CHANGED** - Für Transparenz über Admin-Aktionen

### Phase 3 (Optional / Zukünftig)
4. 🟢 **EVENT_INTERACTION** - Abhängig von Event-Interaktions-Features
5. 🟢 **BUSINESS_REVIEW** - Abhängig von Review-Feature
6. 🟢 **BUSINESS_PERFORMANCE_SUMMARY** - Erfordert Metriken-System und Scheduled Jobs

---

## 🔧 Technische Implementierungs-Hinweise

### Business User Identifikation

```typescript
// Prüfung, ob User ein Business User ist
const businessUser = await this.usersService.getBusinessUser(userId);
if (businessUser && businessUser.businessIds.includes(businessId)) {
  // Business gehört zu diesem Business User
  // Notification senden
}
```

### Notification Interface erstellen

```typescript
// src/notifications/domain/interfaces/notification-payload.interface.ts
export interface BusinessActivatedNotificationData {
  type: 'BUSINESS_ACTIVATED';
  businessId: string;
  businessName: string;
  previousStatus: 'PENDING';
  newStatus: 'ACTIVE';
}
```

### Service erweitern

```typescript
// Beispiel: BusinessesService.updateStatus()
public async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
  const existingBusiness = await this.businessRepository.findById(id);
  if (!existingBusiness) {
    throw new NotFoundException('Business not found');
  }

  const previousStatus = existingBusiness.status;
  const updatedBusiness = existingBusiness.updateStatus(status);
  const savedBusiness = await this.businessRepository.update(id, updatedBusiness);

  // Business User Notification für Status-Änderung
  if (previousStatus === BusinessStatus.PENDING && status === BusinessStatus.ACTIVE) {
    await this.sendBusinessActivatedNotification(savedBusiness);
  } else if (previousStatus !== status) {
    await this.sendBusinessStatusChangedNotification(savedBusiness, previousStatus);
  }

  return savedBusiness;
}

private async sendBusinessActivatedNotification(business: Business): Promise<void> {
  // Finde alle Business User, die dieses Business besitzen
  const allBusinessUsers = await this.usersService.getAllBusinessUsers();
  const relevantBusinessUsers = allBusinessUsers.filter(
    (user) => user.businessIds.includes(business.id)
  );

  for (const businessUser of relevantBusinessUsers) {
    // Prüfe Präferenz
    const preferences = businessUser.notificationPreferences || {};
    const enabled = preferences.businessActivated !== undefined 
      ? preferences.businessActivated 
      : false; // Default: false - Notifications werden nur gesendet, wenn Präferenz explizit auf true gesetzt ist

    if (enabled) {
      await this.notificationService.sendToUser(businessUser.id, {
        title: 'Dein Business ist jetzt aktiv',
        body: `${business.name} wurde freigeschaltet und ist jetzt sichtbar`,
        data: {
          type: 'BUSINESS_ACTIVATED',
          businessId: business.id,
          businessName: business.name,
          previousStatus: 'PENDING',
          newStatus: 'ACTIVE',
        },
      });
    }
  }
}
```

### Module erweitern

```typescript
// businesses.module.ts
@Module({
  imports: [
    // ... andere Imports
    NotificationsModule, // Für Business Notifications
    forwardRef(() => UsersModule), // Für Business User Lookup
  ],
  // ...
})
export class BusinessesModule {}
```

---

## 📝 Business User Notification Preferences Schema

```typescript
export interface BusinessUserNotificationPreferences {
  // Business-spezifische Präferenzen
  businessActivated?: boolean;              // 🔴 Phase 1
  businessContactRequestResponses?: boolean; // 🔴 Phase 1
  businessStatusChanged?: boolean;          // 🟡 Phase 2
  eventInteractions?: boolean;              // 🟢 Phase 3
  businessReviews?: boolean;                // 🟢 Phase 3
  businessPerformanceSummary?: boolean;     // 🟢 Phase 3
  
  // Normale User Präferenzen (falls Business User auch normale User-Features nutzen)
  directMessages?: boolean;
  directChatRequests?: boolean;
  newEvents?: boolean; // Für Events anderer Businesses
  eventUpdates?: boolean;
}
```

**Default-Verhalten:**  
- `businessActivated`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- `businessContactRequestResponses`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- `businessStatusChanged`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- Alle anderen: `false` (wenn `undefined`)

---

## 🎯 Unterschiede zu normalen User Notifications

| Aspekt | Normale User | Business User |
|--------|--------------|---------------|
| **NEW_BUSINESS** | ✅ Erhalten Notifications für alle neuen Businesses | ❌ Nicht relevant |
| **BUSINESS_ACTIVATED** | ❌ Nicht relevant | ✅ Erhalten Notifications für eigene Businesses |
| **CONTACT_REQUEST_RESPONSE** | ✅ Für GENERAL, FEEDBACK | ❌ Nicht relevant |
| **BUSINESS_CONTACT_REQUEST_RESPONSE** | ❌ Nicht relevant | ✅ Für BUSINESS_CLAIM, BUSINESS_REQUEST |
| **NEW_EVENT** | ✅ Für alle Events | ⚠️ Optional: Nur für Events anderer Businesses |
| **EVENT_INTERACTION** | ❌ Nicht relevant | ✅ Für eigene Events (zukünftig) |

---

## 🎯 Nächste Schritte

1. **Review dieses Dokuments** mit dem Team
2. **Prioritäten festlegen** basierend auf Business-Requirements
3. **Phase 1 umsetzen** (BUSINESS_ACTIVATED, BUSINESS_CONTACT_REQUEST_RESPONSE)
4. **Business User Notification Preferences** erweitern
5. **Testing** für Business User Notification-Flows
6. **Monitoring & Analytics** für Business User Notification-Delivery implementieren

---

**Erstellt:** 2024  
**Status:** Vorschlag  
**Zuletzt aktualisiert:** 2024  
**Zielgruppe:** Business User (`BUSINESS`, `PREMIUM_BUSINESS`)


---

**Letzte Konsolidierung:** August 2026
