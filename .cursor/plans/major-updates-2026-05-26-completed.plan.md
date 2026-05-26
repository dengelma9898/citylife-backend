---
name: Major Dependency Updates 2026-05-26
overview: Schrittweise Major-Updates für backend npm-Abhängigkeiten
status: completed
created: 2026-05-26
updated: 2026-05-26
todos:
  - id: pkg-uuid
    content: "uuid ^13.0.2 → ^14.0.0 (Major)"
    package: "uuid"
    from: "^13.0.2"
    to: "^14.0.0"
    status: completed
isProject: true
---

# Major Dependency Updates 2026-05-26

Scan vom 2026-05-26 (Node v24.1.0). Ein Major-Update gefunden und abgeschlossen.

## uuid ^13.0.2 → ^14.0.0

### Breaking Changes (Changelog v14.0.0)

- Node.js 18 Support entfernt — Node 20+ erforderlich (Projekt: v24.1.0 ✓)
- `crypto` muss global verfügbar sein (Node 20+ ✓)
- Mindest-TypeScript 5.4.3 (Projekt: 6.0.3 ✓)
- Security: `v3()`, `v5()`, `v6()` werfen `RangeError` bei ungültigem Buffer-Offset

### Betroffene Bereiche

- `src/users/users.service.ts` — Import `v4 as uuidv4`
- `package.json` — Jest `transformIgnorePatterns` enthält `uuid`

### Notizen (abgeschlossen 2026-05-26)

- Keine Code-Anpassungen nötig — API von `v4()` unverändert, nur eine Stelle im Projekt nutzt das Paket
- Alle Validierungen grün: lint, format, tsc, test, build:dev, build:prd, npm ci
