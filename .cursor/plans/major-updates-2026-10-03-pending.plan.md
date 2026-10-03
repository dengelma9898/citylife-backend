---
name: Major Dependency Updates 2026-10-03
overview: Schrittweise Major-Updates für backend npm-Abhängigkeiten
status: pending
created: 2026-10-03
updated: 2026-10-03
todos:
  - id: pkg-nestjs-12
    content: "@nestjs/* (Framework-Gruppe) 11.x → 12.x (Major, inkl. config 4→12, cache-manager 3→12, swagger 11→12, terminus 11→12, cli 11→12, schematics 11→12)"
    package: "@nestjs/*"
    from: "^11.x"
    to: "^12.x"
    status: completed
  - id: pkg-typescript
    content: "typescript ^6.0.3 → ^7.0.2 (Major)"
    package: "typescript"
    from: "^6.0.3"
    to: "^7.0.2"
    status: pending
isProject: true
---

# Major Dependency Updates 2026-10-03

## @nestjs/* (Framework-Gruppe) 11.x → 12.x

Die @nestjs-Pakete sind über Peer-Dependencies (`@nestjs/core|common ^12`) gekoppelt und werden daher als **eine** Gruppe aktualisiert (explizite Ausnahme laut Skill).

Pakete: `common`, `core`, `platform-express`, `testing`, `cli`, `schematics`, `config`, `cache-manager`, `swagger`, `terminus`. (`@nestjs/throttler` 6.7.1 unterstützt bereits ^12, bleibt unverändert.)

**Breaking Changes (NestJS 12.0.0 Release Notes):**
- Pakete werden als ESM ausgeliefert; CommonJS-Apps funktionieren via `require(esm)` weiter (Node ≥ 20.19 / 22.12; Projekt: Node 24 ✓)
- Lifecycle-Hooks werden nach Komponenten-Hierarchie-Ebene aufgerufen → Reihenfolge-Annahmen in Init/Teardown/Tests prüfen
- `@nestjs/config`: Validierung über Standard Schema (Joi nur ab v18 mit `validationOptions.libraryOptions`) → Projekt nutzt vermutlich kein Joi, prüfen
- Pipe-`transform`-Signaturen verfeinert, `ArgumentMetadata` generisch → eigene Pipes prüfen
- `ConsoleLogger`: `structuredParams` standardmäßig an → ggf. Log-Ausgabe/Tests betroffen
- Webpack-CLI-Workflows deprecated; `angular`-Schematic entfernt
- `@nestjs/schematics` 12 verlangt Node `^22.22.3 || ^24.15.0 || >=26` (lokal: v24.1.0 → Engine-Warnung möglich)

**Betroffene Bereiche:** `src/main.ts`, Custom Pipes/Guards/Interceptors, `ConfigModule`-Setup, `CacheModule`, Swagger-Setup, Health (Terminus), Tests mit `@nestjs/testing`, `nest-cli.json`.

**Notizen (abgeschlossen):**
- Versionen: common/core/platform-express/testing `^12.1.2`, cli `^12.0.8`, schematics `^12.0.6`, config `^12.0.1`, cache-manager `^12.0.0`, swagger `^12.0.2`, terminus `^12.1.0`.
- Keine Code-Änderungen in `src/` nötig; lint (0 Errors), format, tsc, build:dev/prd, npm ci grün.
- **Jest-Fix:** NestJS 12 ist ESM-only → Jest muss `require(esm)` nutzen: `package.json` Scripts `test`, `test:watch`, `test:cov`, `test:debug` laufen jetzt mit `node --experimental-vm-modules node_modules/jest/bin/jest.js`. `transformIgnorePatterns` (Ausnahmen für `jose` etc.) entfernt, da ESM-Pakete nun nativ geladen werden (mit der Ausnahme-Liste: `exports is not defined` bei `jose`).
- **Node-Voraussetzung:** Node ≥ 24.9 (Jest `require(esm)`). Lokales nvm-Node 24.1.0 ist zu alt → Tests schlagen dort fehl; CI (`node-version: '24'`) und Dockerfile (`node:24-slim`) sind unkritisch. Validierung erfolgte mit Node 24.21.0.
- `README.md`: Abschnitt „Voraussetzungen“ ergänzt.
- Offen/Beobachten: Hinweis „worker process has failed to exit gracefully“ am Testende (kein Fehler).

## typescript ^6.0.3 → ^7.0.2

**Vorheriger Stand (Plan 2026-08-10):** blockiert – `nest build`, `ts-jest` und `typescript-eslint` unterstützten TS 7 (keine programmatische Compiler-API) nicht.

**Hinweis:** `@nestjs/swagger` 12 deklariert Peer `typescript ^5.5 || ^6`. Wird nach dem NestJS-Update erneut geprüft (voraussichtlich weiterhin blockiert).

**Notizen:** _(nach Abschluss ergänzen)_
