# Konfigurationswerte - Erläuterungen und Begründungen

Dieses Dokument erläutert alle gesetzten Konfigurationswerte für Rate-Limiting, Caching, DataLoader und Health-Checks. Es erklärt die Begründung für jeden Wert und gibt Empfehlungen für Anpassungen.

## Inhaltsverzeichnis

1. [Rate-Limiting](#rate-limiting)
2. [Caching](#caching)
3. [DataLoader](#dataloader)
4. [Health-Checks](#health-checks)
5. [Umgebungsabhängige Konfigurationen](#umgebungsabhängige-konfigurationen)
6. [Performance-Überlegungen](#performance-überlegungen)
7. [Best Practices](#best-practices)

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
  ttl: 300000, // 5 Minuten
  max: process.env.NODE_ENV === 'dev' ? 50 : 100,
}),

// src/event-categories/services/event-categories.service.ts
private readonly CACHE_TTL = 600000; // 10 Minuten für Kategorien
```

---

## DataLoader

DataLoader löst N+1 Query-Probleme durch Request-scoped Batching und Caching.

### Cache

- **Wert:** `true` (aktiviert)
- **Begründung:** 
  - Verhindert mehrfache Abfragen für dieselbe ID innerhalb eines Requests
  - Request-scoped: Cache wird nach jedem Request automatisch geleert
- **Warum dieser Wert:**
  - Reduziert N+1 Query-Probleme erheblich
  - Kein Risiko von veralteten Daten, da Request-scoped
  - Keine zusätzliche Memory-Belastung über Requests hinweg
- **Anpassung:** 
  - Sollte immer `true` sein für optimale Performance
  - Bei speziellen Anforderungen: `false` für immer frische Daten

### Batch

- **Wert:** `true` (aktiviert)
- **Begründung:** 
  - Sammelt alle Anfragen innerhalb eines Request-Zyklus
  - Führt alle gesammelten IDs in einem einzigen Batch aus
- **Warum dieser Wert:**
  - Reduziert Datenbankabfragen von N auf 1 pro Request
  - Optimiert Netzwerk-Latenz
  - Nutzt Firebase `in`-Queries effizient
- **Anpassung:** 
  - Sollte immer `true` sein für optimale Performance

### Max Batch Size

- **Wert:** 100
- **Begründung:** 
  - Begrenzt die maximale Anzahl IDs pro Batch
  - Verhindert zu große Queries
- **Warum dieser Wert:**
  - Firebase unterstützt `in`-Queries bis zu 10 Items
  - UserProfileLoader chunked automatisch in 10er-Gruppen
  - 100 als obere Grenze für Sicherheit
- **Anpassung:** 
  - Bei Bedarf erhöhen für größere Batches
  - Bei Memory-Problemen reduzieren

### Konfiguration im Code

```typescript
// src/core/loaders/user-profile.loader.ts
this.loader = new DataLoader<string, UserProfile | null>(
  async (ids: readonly string[]) => { /* ... */ },
  {
    cache: true,      // Request-scoped Caching
    batch: true,      // Batching aktiviert
    maxBatchSize: 100 // Maximale Batch-Größe
  }
);
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
| Cache Max | 100 | Production |
| Cache Max | 50 | Development |
| DataLoader Cache | true | Alle |
| DataLoader Batch | true | Alle |
| Memory Threshold | 500MB | Alle (anpassbar) |

---

**Letzte Aktualisierung:** 31. Januar 2026
