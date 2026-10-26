---
name: Major Dependency Updates 2026-10-23
overview: Schrittweise Major-Updates für backend npm-Abhängigkeiten
status: completed
created: 2026-10-23
updated: 2026-10-23
todos:
  - id: pkg-typescript
    content: "typescript ^6.0.3 → ^7.0.2 (Major)"
    package: "typescript"
    from: "^6.0.3"
    to: "^7.0.2"
    status: blocked
isProject: true
---

# Major Dependency Updates 2026-10-23

Scan 2026-10-23 (`npx npm-check-updates --target latest`): einziges Major-Update ist `typescript`.

## typescript ^6.0.3 → ^7.0.2

**Vorherige Pläne:** 2026-08-10 und 2026-10-03 jeweils `blocked` – `ts-jest`, `typescript-eslint` und `@nestjs/swagger` unterstützten TS 7 nicht (TS 7 ist der native Go-Port ohne programmatische JS-Compiler-API, die erst mit TS 7.1 erwartet wird).

**Prüfung 2026-10-23 (Peer-Ranges der aktuellen Latest-Versionen, `npm view`):**

- `ts-jest` 29.4.15: `typescript >=4.3 <7`
- `@typescript-eslint/parser` 8.72.0: `typescript >=4.8.4 <6.1.0`
- `@nestjs/swagger` 12.0.3: `typescript ^5.5.0 || ^6.0.0`
- `@nestjs/cli` 12.0.10: intern `typescript ~6.0.2` (nutzt die programmatische Compiler-API)

**Betroffene Bereiche (bei künftiger Freigabe):** `nest build` (`@nestjs/cli`), `ts-jest` (Tests), `typescript-eslint` (Lint), `@nestjs/swagger` (Typ-Extraktion), `ts-loader`, `tsconfig*.json`.

**Notizen (2026-10-23, blocked):** Kein Install-Versuch nötig – alle geprüften Peer-Ranges schließen TS 7 weiterhin aus (unverändert gegenüber 2026-10-03): `ts-jest` verlangt `<7`, `@typescript-eslint/parser` verlangt `<6.1.0`, `@nestjs/swagger` verlangt `^5.5 || ^6`, `@nestjs/cli` bündelt intern `~6.0.2`. TS 7 liefert keine programmatische JS-Compiler-API (erst TS 7.1 erwartet), die `ts-jest`, `typescript-eslint` und `nest build` benötigen. `typescript` bleibt auf `^6.0.3`. Kein Rollback nötig, `package.json`/`package-lock.json` unverändert. Erneut prüfen, sobald `ts-jest`, `typescript-eslint`, `@nestjs/swagger` und `@nestjs/cli` TS 7 unterstützen.
