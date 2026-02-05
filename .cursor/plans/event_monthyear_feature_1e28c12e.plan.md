---
name: Event MonthYear Feature
overview: "Erweitert die Event-Struktur um ein optionales `monthYear` Feld (Format: MM.YYYY), das es ermöglicht, Events nur mit Monat und Jahr zu spezifizieren, wenn der genaue Tag nicht bekannt ist. Die bestehende Funktionalität mit genauen Daten bleibt erhalten."
todos: []
isProject: false
---

# Event MonthYear Feature Implementierung

## Übersicht

Erweitert die Event-Struktur um ein optionales `monthYear` Feld im Format `MM.YYYY` (z.B. "11.2024" für November 2024). Dies ermöglicht es, Events zu erstellen, bei denen nur der Monat und das Jahr bekannt sind, ohne dass ein genaues Datum gesetzt werden muss.

## Änderungen

### 1. Event Interface erweitern

**Datei:** `src/events/interfaces/event.interface.ts`

- Neues optionales Feld `monthYear?: string` hinzufügen
- JSDoc-Kommentar hinzufügen, der das Format MM.YYYY dokumentiert

### 2. CreateEventDto erweitern

**Datei:** `src/events/dto/create-event.dto.ts`

- Neues optionales Feld `monthYear?: string` hinzufügen
- Validierung mit `@Matches()` Decorator für Format MM.YYYY (Regex: `^\\d{2}\\.\\d{4}$`)
- Validierung: Monat muss zwischen 01-12 sein (Custom Validator oder zusätzliche Validierung)

### 3. Custom Validator erstellen (optional, aber empfohlen)

**Neue Datei:** `src/events/dto/validators/is-valid-month-year.validator.ts`

- Custom Validator für monthYear Format
- Prüft Format MM.YYYY
- Prüft dass Monat zwischen 01-12 liegt
- Prüft dass Jahr sinnvoll ist (z.B. >= aktuelles Jahr - 1, <= aktuelles Jahr + 10)

### 4. EventsService anpassen

**Datei:** `src/events/events.service.ts`

- `create()` Methode: `monthYear` Feld in `eventData` aufnehmen
- `update()` Methode: `monthYear` wird automatisch durch `Partial<Event>` unterstützt
- `getAll()` und `getById()`: `monthYear` wird automatisch aus Firestore geladen

### 5. Tests erweitern

**Datei:** `src/events/events.service.spec.ts`

- Test für Event-Erstellung mit `monthYear`
- Test für Event-Erstellung ohne `monthYear` (Rückwärtskompatibilität)
- Test für Event-Update mit `monthYear`
- Test für Validierung von `monthYear` Format

**Datei:** `src/events/events.controller.spec.ts`

- Test für POST /events mit `monthYear`
- Test für PATCH /events/:id mit `monthYear`

**Neue Datei:** `src/events/dto/validators/is-valid-month-year.validator.spec.ts`

- Unit Tests für den Custom Validator

### 6. LLM-Extraktion Schema erweitern (optional)

**Datei:** `src/events/infrastructure/llm/schemas/event-extraction.schema.ts`

- Optionales `monthYear` Feld zum Schema hinzufügen
- Format-Validierung: `pattern: '^\\d{2}\\.\\d{4}$'`

**Datei:** `src/events/infrastructure/llm/prompts/event-extraction.prompt.ts`

- Dokumentation für `monthYear` Feld hinzufügen
- Beispiel: "Wenn nur Monat/Jahr bekannt: monthYear: '11.2024'"

## Technische Details

### Format-Spezifikation

- Format: `MM.YYYY` (z.B. "11.2024" für November 2024)
- Monat: 01-12 (führende Null erforderlich)
- Jahr: 4-stellig
- Separator: Punkt (.)

### Validierung

- Format-Validierung: Regex `^\\d{2}\\.\\d{4}$`
- Monat-Validierung: 01-12
- Optionales Feld: Kann weggelassen werden

### Rückwärtskompatibilität

- Bestehende Events ohne `monthYear` funktionieren weiterhin
- `dailyTimeSlots` bleiben unverändert
- `startDate`/`endDate` bleiben deprecated, aber funktional

## Feature Branch

- Branch Name: `feature/event-month-year`
- Erstellt vom aktuellen `main` Branch

## Test-Szenarien

1. Event mit genauen Daten erstellen (ohne monthYear) - bestehende Funktionalität
2. Event mit monthYear erstellen (ohne genaue Daten)
3. Event mit monthYear UND genauen Daten erstellen (beides erlaubt)
4. Event-Update: monthYear hinzufügen
5. Event-Update: monthYear entfernen
6. Validierung: Ungültiges Format (z.B. "11-2024", "Nov 2024")
7. Validierung: Ungültiger Monat (z.B. "13.2024", "00.2024")

