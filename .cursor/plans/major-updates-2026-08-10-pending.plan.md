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
    status: pending
  - id: pkg-firebase-admin
    content: "firebase-admin ^13.10.0 → ^14.2.0 (Major)"
    package: "firebase-admin"
    from: "^13.10.0"
    to: "^14.2.0"
    status: pending
  - id: pkg-sonarqube-scanner
    content: "sonarqube-scanner ^4.4.0 → ^5.0.0 (Major)"
    package: "sonarqube-scanner"
    from: "^4.4.0"
    to: "^5.0.0"
    status: pending
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

**Notizen:** (ausstehend)

## firebase-admin ^13.10.0 → ^14.2.0

**Notizen:** (ausstehend)

## sonarqube-scanner ^4.4.0 → ^5.0.0

**Notizen:** (ausstehend)

## typescript ^6.0.3 → ^7.0.2

**Notizen:** (ausstehend)
