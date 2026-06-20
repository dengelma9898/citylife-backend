---
name: Ponytail Audit 04 – DI Cleanup
overview: LoadersModule vereinfachen und FirebaseStorageService nicht in jedem Feature-Modul re-registrieren
status: pending
created: 2026-06-20
phase: 4
effort: S
impact: "weniger Boilerplate"
isProject: true
---

# Phase 04 – Dependency Injection aufräumen

## Ziel

NestJS-Module vereinfachen: Shared Services nur einmal providen.

## Problem 1: `FirebaseStorageService` in 12 Modulen

`FirebaseModule` exportiert `FirebaseStorageService` bereits, aber viele Feature-Module listen ihn erneut unter `providers`:

- `businesses.module.ts`, `events.module.ts`, `news.module.ts`, …

### Schritte

- [ ] Inventar: `rg "FirebaseStorageService" src --glob "*.module.ts"`
- [ ] Pro Modul: `FirebaseStorageService` aus `providers` entfernen
- [ ] Sicherstellen: `FirebaseModule` in `imports` (direkt oder via `CoreModule`/Parent)
- [ ] Specs: ggf. `FirebaseModule` mocken statt einzelnen Service

## Problem 2: `LoadersModule` für einen Loader

`LoadersModule` exportiert nur `UserProfileLoader`.

### Option A (empfohlen)

- [ ] `UserProfileLoader` in `UsersModule` als provider registrieren (request-scoped)
- [ ] `LoadersModule` löschen
- [ ] `CoreModule`: `LoadersModule`-Import durch `UsersModule` ersetzen (falls Loader exportiert)

### Option B

- [ ] `LoadersModule` behalten, aber erst wenn weitere Loader kommen (YAGNI gegen Option A)

## Validierung

```bash
rg "providers:.*FirebaseStorageService" src --glob "*.module.ts"  # Ziel: nur firebase.module.ts
npm test
```

## Risiken

- **Mittel:** Module ohne `FirebaseModule`-Import könnten brechen – Nest DI-Fehler beim Start zeigen das sofort

## Erwarteter Impact

~−50 LOC Modul-Boilerplate, klarere DI-Hierarchie
