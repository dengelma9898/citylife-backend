---
name: Ponytail Audit 01 – Tote Dependencies
overview: Ungenutzte npm-Pakete entfernen (axios, date-fns, uuid, firebase client, adm-zip)
status: pending
created: 2026-06-20
phase: 1
effort: S
impact: "-6 dependencies"
isProject: true
---

# Phase 01 – Tote Dependencies entfernen

## Ziel

Sechs Direct-Dependencies entfernen, die im Code nicht (oder nicht mehr) genutzt werden.

## Betroffene Pakete

| Paket | Befund | Ersatz |
|-------|--------|--------|
| `axios` | 0 Imports im Repo | `fetch` (bereits in `location.service.ts`) |
| `date-fns` | 0 Imports | `luxon` (bereits für Pass-Stats & `DateTimeUtils`) |
| `uuid` | 1× `uuidv4()` in `users.service.ts` | `crypto.randomUUID()` |
| `firebase` (Client SDK) | Nur für `getClientFirestore()`, nie in Prod aufgerufen | `firebase-admin` allein |
| `adm-zip` | 0 Direct-Imports | transitiv via `passkit-generator` |
| `@types/adm-zip` | nur für ungenutztes `adm-zip` | entfällt |

## Schritte

### 1. `uuid` → `crypto.randomUUID()`

- [ ] `src/users/users.service.ts`: `import { v4 as uuidv4 } from 'uuid'` entfernen
- [ ] `managementId: uuidv4()` → `managementId: randomUUID()` (`node:crypto`)
- [ ] `package.json`: `uuid` aus `dependencies` entfernen
- [ ] `jest.transformIgnorePatterns`: `uuid`-Eintrag entfernen (falls nur dafür vorhanden)

### 2. `firebase` Client SDK entfernen

- [ ] `src/firebase/firebase.service.ts`:
  - Imports `firebase/app`, `firebase/firestore` entfernen
  - `initializeApp(firebaseConfig)` (Client) entfernen
  - Methode `getClientFirestore()` entfernen
  - Client-Config-Felder (`apiKey`, `authDomain`, …) prüfen – nur behalten, wenn woanders gebraucht
- [ ] Specs: `getClientFirestore: jest.fn()` Mocks entfernen
- [ ] `package.json`: `firebase` entfernen (`firebase-admin` bleibt)

### 3. `axios`, `date-fns`, `adm-zip`, `@types/adm-zip`

- [ ] Aus `package.json` `dependencies` entfernen
- [ ] `npm install` / Lockfile aktualisieren
- [ ] Verifizieren: `passkit-generator` bringt `adm-zip` transitiv mit (Wallet-Feature unangetastet)

## Validierung

```bash
rg "from 'axios'|from 'date-fns'|from 'uuid'|from 'firebase'|adm-zip" src
npm test
npm run build:dev
```

## Risiken

- **Niedrig:** `uuid`-Jest-Workaround entfällt
- **Mittel:** Falls Client-Firestore doch geplant war – vorher mit Team klären (aktuell: dead code)
- **Wallet:** `passkit-generator` nach `npm ls adm-zip` prüfen

## Erwarteter Impact

−6 Direct-Dependencies, ~20 LOC weniger in `firebase.service.ts`
