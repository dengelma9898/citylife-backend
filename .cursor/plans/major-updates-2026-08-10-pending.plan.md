---
name: Major Dependency Updates 2026-08-10
overview: Schrittweise Major-Updates für backend npm-Abhängigkeiten
status: pending
created: 2026-08-10
updated: 2026-08-10
todos:
  - id: pkg-types-node
    content: "@types/node ^25.9.5 → ^26.2.0 (Major)"
    package: "@types/node"
    from: "^25.9.5"
    to: "^26.2.0"
    status: completed
  - id: pkg-csv-parse
    content: "csv-parse ^6.2.1 → ^7.0.2 (Major)"
    package: "csv-parse"
    from: "^6.2.1"
    to: "^7.0.2"
    status: completed
  - id: pkg-firebase-admin
    content: "firebase-admin ^13.10.0 → ^14.2.0 (Major)"
    package: "firebase-admin"
    from: "^13.10.0"
    to: "^14.2.0"
    status: completed
  - id: pkg-sonarqube-scanner
    content: "sonarqube-scanner ^4.4.0 → ^5.0.0 (Major)"
    package: "sonarqube-scanner"
    from: "^4.4.0"
    to: "^5.0.0"
    status: completed
  - id: pkg-typescript
    content: "typescript ^6.0.3 → ^7.0.2 (Major)"
    package: "typescript"
    from: "^6.0.3"
    to: "^7.0.2"
    status: pending
isProject: true
---

# Major Dependency Updates 2026-08-10

## @types/node ^25.9.5 → ^26.2.0

**Breaking Changes (DefinitelyTyped v26):**
- Erfordert TypeScript 5.6+ (Projekt: TS 6.0.3 ✓)
- Entfernte verwaiste Interfaces in buffer, fs, perf_hooks, util, worker_threads
- Crypto-Typen bereinigt (`CipherKey` → `KeyLike`, Buffer-Input-Typen korrigiert)
- `child_process.exec`/`execFile` Exception-Interfaces angepasst (stdout/stderr ggf. Cast nötig)
- `undici-types` Major-Bump auf v8.x

**Betroffene Bereiche:** Alle `src/`-Dateien mit Node.js-APIs (crypto, fs, child_process, streams)

**Notizen:** Update ohne Code-Anpassungen. Alle Validierungen (lint, format, tsc, test, build:dev/prd, npm ci) grün.

## csv-parse ^6.2.1 → ^7.0.2

**Breaking Changes (Changelog v7.0.0):**
- Laut Maintainer: v7.0.0 versehentlich als Major veröffentlicht — **keine API-Breaking-Changes**
- Bugfix: Sync-Parse modifiziert Prototyp nicht mehr (#479)
- Trim aligned mit ECMAScript-Whitespace (#482)

**Betroffene Bereiche:** `src/events/application/services/csv-import.service.ts` (nutzt `csv-parse/sync`)

**Notizen:** Update ohne Code-Anpassungen. Alle Validierungen (lint, format, tsc, test, build:dev/prd, npm ci) grün.

## firebase-admin ^13.10.0 → ^14.2.0

**Breaking Changes (v14.0.0):**
- Node.js 22+ erforderlich (Projekt: v24.1.0 ✓)
- Legacy-Namespace-API entfernt (`admin.auth()` etc.) — Projekt nutzt bereits modulare Imports (`firebase-admin/app`, `/auth`, `/firestore`, `/messaging`, `/storage`) ✓
- Instance-ID-API entfernt — nicht im Projekt genutzt ✓
- Legacy-FCM-Typen entfernt (`MessagingPayload` etc.) — `NotificationService` nutzt `getMessaging().send()` mit modernem Payload ✓
- SDK-weites Error-Handling überarbeitet (neue Error-Typen/Codes)

**Betroffene Bereiche:** `src/firebase/`, `src/notifications/`, `src/account-management/`, `src/core/guards/`, Tests mit `jest.mock('firebase-admin/*')`

**Notizen:** Update ohne Code-Anpassungen an Firebase-Imports (bereits modular). Jest-Fix: `jose` (ESM-Transitive-Dep von firebase-admin v14 via jwks-rsa) zu `transformIgnorePatterns` in `package.json` hinzugefügt. Alle Validierungen (lint, format, tsc, test, build:dev/prd, npm ci) grün.

## sonarqube-scanner ^4.4.0 → ^5.0.0

**Breaking Changes (v5.0.0):**
- Node.js 22.12+ erforderlich (Projekt: v24.1.0 ✓)
- Paket als ES Module veröffentlicht (kein programmatischer `require()`-Import im Projekt)
- Deprecated Executables `sonar` und `sonar-scanner` entfernt → nur noch `sonar-scanner-npm`

**Betroffene Bereiche:** `package.json` Script `sonar`

**Notizen:** npm-Script `sonar` von `sonar-scanner` auf `sonar-scanner-npm` migriert (v5 entfernt alte Aliase). Alle Validierungen (lint, format, tsc, test, build:dev/prd, npm ci) grün.

## typescript ^6.0.3 → ^7.0.2

**Notizen:** (ausstehend)
