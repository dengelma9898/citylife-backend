---
name: Ponytail Audit 06 – Timezone-Strategie
overview: Doppelte Zeitzonen-Logik (Schreiben + Interceptor) auf eine Strategie vereinheitlichen
status: pending
created: 2026-06-20
phase: 6
effort: M
impact: Konsistenz
isProject: true
---

# Phase 06 – Timezone-Strategie vereinheitlichen

## Ziel

Aktuell existieren **zwei** parallele Mechanismen:

1. **Schreiben:** Services setzen `createdAt`/`updatedAt` via `DateTimeUtils.getBerlinTime()`
2. **Lesen:** `TimezoneInterceptor` konvertiert `createdAt`, `updatedAt`, `visitedAt`, `scannedAt` von UTC → Berlin in Responses

Das führt zu inkonsistenten Daten in Firestore und unnötiger Komplexität.

## Entscheidung (vor Umsetzung treffen)

### Option A – UTC everywhere (empfohlen)

| Schicht | Verhalten |
|---------|-----------|
| Speichern | `new Date().toISOString()` (UTC) |
| API-Response | `TimezoneInterceptor` konvertiert nach Berlin |
| Client | Erhält Berlin-Zeiten |

**Vorteil:** Standard-Praxis, Sortierung/Queries einfacher.

### Option B – Berlin everywhere

| Schicht | Verhalten |
|---------|-----------|
| Speichern | `DateTimeUtils.getBerlinTime()` |
| API-Response | Interceptor **entfernen** oder nur für Legacy-Daten |

**Nachteil:** Mixed data wenn alte Dokumente UTC haben.

## Betroffene Dateien (bei Option A)

Services mit `DateTimeUtils.getBerlinTime()` beim Schreiben (~15 Dateien):

- `users.service.ts`, `events.service.ts`, `news.service.ts`
- `keywords.service.ts`, `blog-posts.service.ts`, `special-polls.service.ts`
- `event-categories.service.ts`, `businesses.service.ts`
- `chat-messages.service.ts`, …

## Schritte (Option A)

### 1. Vorbereitung

- [ ] Stichprobe in Firestore: sind Timestamps UTC oder Berlin?
- [ ] `TimezoneInterceptor.dateFields` erweitern falls nötig

### 2. Schreib-Pfade umstellen

- [ ] `DateTimeUtils.getUTCTime()` oder `new Date().toISOString()` beim Erstellen/Aktualisieren
- [ ] Modul für Modul migrieren + Tests

### 3. `DateTimeUtils` verschlanken

- [ ] `getBerlinTime()` nur noch für Response-Interceptor/Filter behalten
- [ ] Oder durch Luxon/`Intl` ersetzen falls Luxon später entfernt wird

### 4. Tests

- [ ] Service-Specs: erwartete Timestamps auf UTC anpassen
- [ ] E2E/Controller-Specs: Response-Zeiten weiter Berlin (via Interceptor)

## Validierung

```bash
rg "getBerlinTime\(\)" src --glob "*.service.ts"  # Ziel: 0 Schreib-Aufrufe
npm test
```

## Risiken

- **Hoch ohne Migration:** Bestehende Berlin-Timestamps in DB + UTC-Interceptor = falsche Anzeige
- **Empfehlung:** Option A nur mit Daten-Audit oder Migrations-Script für kritische Collections

## Erwarteter Impact

Konsistente Architektur; weniger manuelle Timestamp-Aufrufe in Services

## Referenzen

- `src/core/interceptors/timezone.interceptor.ts`
- `src/utils/date-time.utils.ts`
- `docs/configuration-values.md` (falls TTL/Zeit-Doku)
