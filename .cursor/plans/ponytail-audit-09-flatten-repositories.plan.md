---
name: Ponytail Audit 09 – Repositories flatten
overview: Firebase Repository-Layer entfernen und Firestore-Zugriff in Services konsolidieren
status: pending
created: 2026-06-20
phase: 9
effort: XL
impact: "~-2800 LOC"
isProject: true
requires: ponytail-audit-08-architecture-decision
---

# Phase 09 – Repository-Layer flatten

## Voraussetzung

**Nur bei Architektur-Entscheidung Option A oder C (teilweise)** aus Phase 08.

## Ziel

21 `Firebase*Repository`-Klassen + 16 Repository-Interfaces + DI-Tokens entfernen. Firestore-Logik wandert in Application-Services (wie `events.service.ts`).

## Scope

~2.802 LOC in `src/**/infrastructure/persistence/firebase-*.ts`  
~247 LOC in `src/**/domain/repositories/*.ts`

### Module (priorisiert, klein zuerst)

| Priorität | Modul | Repos |
|-----------|-------|-------|
| 1 | `taxi-stands` | 1 |
| 2 | `easter-egg-hunt` | 1 |
| 3 | `advent-calendar` | 1 |
| 4 | `job-offers` | 1 |
| 5 | `job-offer-categories` | 1 |
| 6 | `feature-requests` | 1 |
| 7 | `legal-documents` | 1 |
| 8 | `app-settings` | 1 |
| 9 | `app-versions` | 1 |
| 10 | `contact` | 1 |
| 11 | `business-categories` | 1 |
| 12 | `chatrooms` | 2 |
| 13 | `curated-spots` | 4 |
| 14 | `direct-chats` | 4 |
| 15 | `businesses` | 2 |

## Migrations-Template pro Modul

### 1. Service erweitern

- [ ] Firestore-Collection-Konstante in Service
- [ ] Methoden aus Repository kopieren (findAll, findById, create, update, delete)
- [ ] `firebase-mapper.util.ts` aus Phase 03 nutzen

### 2. Module vereinfachen

- [ ] `{MODULE}_REPOSITORY` Provider entfernen
- [ ] `Firebase*Repository` aus providers entfernen
- [ ] `infrastructure/persistence/` Ordner löschen

### 3. Domain

- [ ] `domain/repositories/*.ts` löschen (Interfaces + Tokens)
- [ ] Entity-Typen vorerst behalten (Phase 10)

### 4. Tests

- [ ] Service-Specs: Repository-Mocks → `FirebaseService`-Mock mit Firestore-Stub
- [ ] Controller-Specs unverändert grün
- [ ] Cache-Tests beibehalten (`.cursorrules`)

## Beispiel-Zielstruktur (taxi-stands)

```
src/taxi-stands/
├── taxi-stands.module.ts
├── application/
│   ├── controllers/
│   └── services/
│       └── taxi-stands.service.ts   ← enthält Firestore-Zugriff
├── domain/
│   └── entities/
└── dto/
```

## Validierung pro Modul

```bash
npm test -- taxi-stands
rg "TAXI_STAND_REPOSITORY|FirebaseTaxiStandRepository" src
```

## Risiken

- **Hoch:** Große Diff-Fläche – **ein Modul pro PR**
- **Cache:** Invalidierung in Service nicht vergessen
- **RolesGuard:** `UsersModule`-Import in betroffenen Modulen prüfen

## Erwarteter Impact

~−2.800 LOC, 42 Repository-Dateien weniger

## Rollback-Strategie

Ein Modul pro PR → einfaches Revert einzelner PRs
