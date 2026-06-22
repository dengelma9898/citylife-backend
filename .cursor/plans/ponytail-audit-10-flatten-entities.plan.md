---
name: Ponytail Audit 10 – Entities flatten
overview: Domain-Entity-Klassen durch plain TypeScript-Interfaces ersetzen
status: pending
created: 2026-06-20
phase: 10
effort: XL
impact: "~-2300 LOC"
isProject: true
requires: ponytail-audit-08-architecture-decision
---

# Phase 10 – Entity-Klassen flatten

## Voraussetzung

- Phase 08 Entscheidung: Option A (oder C mit Modul-Auswahl)
- Phase 09 für betroffenes Modul abgeschlossen (Repositories weg)

## Ziel

23 Entity-Klassen mit `create`/`fromProps`/`update`/`toJSON` (~2.317 LOC) durch einfache `interface`-Types ersetzen – analog zu `events/interfaces/event.interface.ts`.

## Ist vs. Soll

```typescript
// Ist
export class TaxiStand {
  readonly id: string;
  private constructor(props) { ... }
  static create(props) { ... }
  static fromProps(props) { ... }
  update(props) { ... }
  toJSON() { ... }
}

// Soll
export interface TaxiStand {
  id: string;
  title: string;
  // ...
}
```

Business-Logik (`updateStatus`, `addCustomer`) → in Service als Pure Functions oder inline.

## Migrations-Template pro Modul

### 1. Interface definieren

- [ ] `domain/entities/*.entity.ts` → `interfaces/*.interface.ts` oder `types/*.ts`
- [ ] `EntityProps` + `Entity` zusammenführen

### 2. Service anpassen

- [ ] `Entity.create()` → plain object literals
- [ ] `entity.update({...})` → `{ ...entity, ...changes, updatedAt }`
- [ ] `entity.toJSON()` → entity direkt nutzen

### 3. DTOs/Controller

- [ ] Return-Types auf Interface umstellen
- [ ] class-transformer: `@Type()` prüfen

### 4. Tests

- [ ] Factory-Tests durch Objekt-Literale ersetzen
- [ ] Immutability-Tests entfernen falls nur Entity-Tests

## Modul-Reihenfolge

Gleiche Priorität wie Phase 09 (klein → groß). `businesses` zuletzt (komplex, siehe Phase 11).

## Besondere Fälle

| Modul | Hinweis |
|-------|---------|
| `businesses` | Nested VOs – Phase 11 zuerst oder zusammen |
| `legal-documents` | Factory-Methoden für verschiedene Dokumenttypen |
| `direct-chats` | 4 Entities, enge Beziehungen |

## Validierung pro Modul

```bash
rg "static create\(|static fromProps\(|\.toJSON\(\)" src/<modul>
npm test -- <modul>
```

## Validierung (Plan abgeschlossen)

```bash
npm test
npm run build
npm run start:dev   # Nest bootstrap ohne DI-Fehler; danach beenden
```

## Risiken

- **Mittel:** Weniger Compile-Time-Validierung – DTOs + class-validator kompensieren
- **Serialization:** `removeUndefined` vor Firestore-Write weiter nutzen

## Erwarteter Impact

~−2.300 LOC

## Referenzen

- `.cursorrules` – Domain Entity Beispiel (Regel bleibt für komplexe Domains optional)
- `src/events/interfaces/event.interface.ts` – Referenz-Pattern
