---
name: Ponytail Audit 11 – Business Value Objects
overview: Nested VO-Klassen in business.entity.ts durch plain Interfaces ersetzen
status: pending
created: 2026-06-20
phase: 11
effort: M
impact: "~-150 LOC"
isProject: true
requires: ponytail-audit-10-flatten-entities
---

# Phase 11 – Business Value Objects vereinfachen

## Ziel

`src/businesses/domain/entities/business.entity.ts` (~280 LOC) enthält nested Klassen:

- `BusinessContact`
- `BusinessAddress`
- `BusinessCustomer`

Jede mit identischem Boilerplate (`create`, `toJSON`, private constructor).

## Soll-Zustand

```typescript
export interface BusinessContact {
  email?: string;
  phoneNumber?: string;
  // ...
}

export interface Business {
  id: string;
  contact: BusinessContact;
  address: BusinessAddress;
  customers: BusinessCustomer[];
  // ...
}
```

## Betroffene Dateien

- `src/businesses/domain/entities/business.entity.ts`
- `src/businesses/application/services/businesses.service.ts`
- `src/businesses/infrastructure/persistence/firebase-business.repository.ts` (falls Phase 09 noch nicht)
- `src/businesses/application/services/businesses.service.spec.ts`
- `src/businesses/application/controllers/businesses.controller.spec.ts`
- `src/pass-stats/application/services/pass-scan.service.ts`
- DTOs: `business-contact.dto.ts`, `business-address.dto.ts`, `business-customer.dto.ts` (bleiben)

## Schritte

### 1. Interfaces extrahieren

- [ ] `business-contact.type.ts`, `business-address.type.ts`, `business-customer.type.ts` (oder eine `business.types.ts`)
- [ ] `Business`-Hauptinterface definieren

### 2. Call-Sites migrieren

- [ ] `BusinessContact.create(dto)` → `{ ...dto }` oder spread
- [ ] `BusinessCustomer.create({...})` → plain object
- [ ] `business.addCustomer(customer)` → Service-Methode mit Spread
- [ ] `business.updateStatus(status)` → Service inline

### 3. Entity-Datei

- [ ] Klassen entfernen, Interfaces exportieren
- [ ] `Business.create()` / `fromProps()` / `update()` analog Phase 10 flatten

### 4. Tests

- [ ] Alle `BusinessContact.create` in Specs durch Literale ersetzen
- [ ] Pass-Scan-Flow testen (`pass-scan.service.spec.ts`)

## Validierung

```bash
rg "BusinessContact\.create|BusinessAddress\.create|BusinessCustomer\.create" src
npm test -- businesses pass-stats
```

## Validierung (Plan abgeschlossen)

```bash
npm test
npm run build
npm run start:dev   # Nest bootstrap ohne DI-Fehler; danach beenden
```

## Risiken

- **Mittel:** `businesses` ist zentral – eigener PR, nach kleineren Modulen in Phase 10 Erfahrung sammeln
- **Notifications:** Business-activated Flow in `businesses.service.ts` testen

## Erwarteter Impact

~−150 LOC in Entity-Datei, klarere Struktur

## Abhängigkeit

Idealerweise nach Phase 09 (kein Repository mehr) und als Teil von Phase 10 für `businesses`-Modul.
