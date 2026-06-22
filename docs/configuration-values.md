# Konfigurationswerte - Erläuterungen und Begründungen

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
