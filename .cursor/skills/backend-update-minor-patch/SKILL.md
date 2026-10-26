---
name: backend-update-minor-patch
description: Updates all npm dependencies and devDependencies to latest minor/patch versions (no major bumps) in the Citylife backend, fixes any resulting breakage, then runs lint, format, TypeScript, test, and build checks until all pass. Use when the user asks to update backend dependencies, bump minor/patch packages, refresh npm packages, or run dependency maintenance in backend/.
---

# Backend: Minor & Patch Dependency Update

Aktualisiert **alle** npm-Abhängigkeiten (`dependencies` + `devDependencies`) auf einmal — nur **Minor** und **Patch**, **keine Major-Updates**.

Projekt: `backend/` (NestJS, npm, `package-lock.json`). Richtlinien: `.cursorrules`.

## Voraussetzungen

- Arbeitsverzeichnis: Repository-Root `backend/`
- Node.js 24 (wie CI/Dockerfile)
- Sauberer Git-Status empfohlen (Änderungen nur an `package.json` + `package-lock.json`)
- **Kein automatischer Commit** — User committet manuell
- **Neue Fehler müssen behoben werden** — Rollback nur als letzter Ausweg, wenn ein Fix nicht vertretbar ist

## Workflow

Kopiere und verfolge den Fortschritt:

```
Task Progress:
- [ ] Schritt 1: Backup / Ausgangszustand prüfen
- [ ] Schritt 2: Alle Dependencies minor/patch updaten
- [ ] Schritt 3: Lockfile neu erzeugen
- [ ] Schritt 4: Validierungen ausführen
- [ ] Schritt 5: Fehler beheben (Fix-Loop bis alle Checks grün)
- [ ] Schritt 6: Ergebnis dokumentieren
- [ ] Schritt 7: Ausführung per SubAgent verifizieren + Skill-Optimierungen aufzeigen
```

### Schritt 1: Ausgangszustand

```bash
cd backend
git status --short package.json package-lock.json
node --version   # Erwartung: v24.x
```

Falls `package.json` oder `package-lock.json` bereits uncommitted geändert sind: User informieren, bevor fortgefahren wird.

### Schritt 2: Minor/Patch-Update (alle Pakete)

**Tool:** `npm-check-updates` mit `--target minor` (bleibt innerhalb derselben Major-Version).

```bash
npx --yes npm-check-updates -u --target minor
```

- Aktualisiert **dependencies** und **devDependencies** gleichzeitig
- **Nicht** verwenden: `--target latest`, `--target newest`, manuelles Major-Bumping
- Vor `npm install`: kurz prüfen, ob in der Ausgabe Major-Sprünge vorkommen (sollten nicht)

### Schritt 3: Lockfile installieren

```bash
npm install
```

Danach Diff prüfen:

```bash
git diff --stat package.json package-lock.json
```

### Schritt 4: Projekt-Validierungen (alle müssen grün sein)

Reihenfolge wie in CI und `BACKEND-OPTIMIERUNGSVORSCHLAEGE.md`:

| # | Check | Befehl | Entspricht |
|---|--------|--------|------------|
| 1 | ESLint | `npm run lint` | CI `test`-Job, Husky pre-commit |
| 2 | Prettier | `npm run format:check` | Husky pre-commit |
| 3 | TypeScript | `npx tsc --noEmit` | Lokale Qualitätsprüfung |
| 4 | Tests | `npm run test` | CI `test`-Job |
| 5 | Build (dev) | `npm run build:dev` | Nest-Build wie Docker |
| 6 | Build (prd) | `npm run build:prd` | Produktions-Build |
| 7 | Reproduzierbarkeit | `npm ci` | CI-Installation |

**Ausführung:**

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm run test
npm run build:dev
npm run build:prd
npm ci
npm run lint && npm run test
```

Nach `npm ci` Lint + Test erneut ausführen (Schritt 7 bestätigt sauberes Lockfile).

Bei **jedem** fehlgeschlagenen Check: nicht abbrechen, sondern **Schritt 5** starten und danach die Validierungen ab dem fehlgeschlagenen Check wiederholen.

**Nicht** Teil dieses Skills (fehlende Secrets / schwer reproduzierbar):

- `npm run start` / `npm run start:dev` (Runtime-Env, Firebase, `.env`)
- `npm run sonar` (SonarQube-Server)
- Docker-Build/Deploy (`.github/workflows/deployment.yml`)

### Schritt 5: Fehler beheben (Fix-Loop)

**Pflicht:** Entstehen durch das Dependency-Update neue Fehler (Lint, TypeScript, Tests, Build), müssen diese **im selben Durchlauf behoben** werden. Der Skill gilt erst als abgeschlossen, wenn alle Checks aus Schritt 4 grün sind.

```
Fix-Loop:
- [ ] Fehler analysieren (Log, betroffenes Paket, Breaking Change in Changelog)
- [ ] Fix implementieren (Code, Config, Tests — gemäß .cursorrules)
- [ ] Betroffene Checks erneut ausführen
- [ ] Alle Checks aus Schritt 4 erneut durchlaufen
```

**Typische Fix-Strategien (Reihenfolge):**

1. **Code/Config anpassen** — API-Änderungen, deprecations, strictere Typen (NestJS, TypeScript, ESLint, Jest)
2. **Tests aktualisieren** — nur wenn das Verhalten korrekt und das alte Test-Setup veraltet ist
3. **Format/Lint auto-fix** — `npm run lint:fix`, `npm run format` (danach erneut `format:check`)
4. **Einzelnes Paket pinnen** — nur wenn kein sinnvoller Fix ohne Major-Upgrade möglich ist; Version in `package.json` explizit setzen und kurz begründen

**Regeln für Fixes:**

- `.cursorrules` einhalten (Typisierung, Tests für geändertes Verhalten, keine unrelated Refactors)
- Minimale, zielgerichtete Änderungen — nur was das Update erfordert
- Neue oder angepasste Tests bei Verhaltensänderungen oder Regression-Fixes
- Kein Major-Upgrade als „Fix“ — Major bleibt verboten

**Rollback** (nur letzter Ausweg):

```bash
git checkout -- package.json package-lock.json
npm ci
```

Nur wenn: Fix unvertretbar aufwendig, externes Blocker-Problem, oder User fordert explizit Abbruch. User mit Begründung und betroffenen Paketen informieren.

### Schritt 6: Ergebnis

**Bei Erfolg:**

- Kurze Zusammenfassung: welche Pakete sich geändert haben (`git diff package.json`)
- Liste der **Code-/Config-Fixes** (falls welche nötig waren)
- Hinweis: User soll manuell committen (kein Auto-Commit; Commit kann `package.json`, Lockfile und Fix-Dateien enthalten)

### Schritt 7: Verifikation per SubAgent + Skill-Optimierungen

**Pflicht:** Nach Schritt 6 (und nur wenn alle Checks grün sind oder ein Rollback erfolgt ist) die Ausführung **unabhängig** von einem SubAgent prüfen lassen. Der SubAgent kennt den Verlauf nicht und prüft ausschließlich anhand von Repo-Zustand und dieser `SKILL.md`.

**Start:** `Task`-Tool mit `subagent_type: "generalPurpose"`, `run_in_background: false`. Der SubAgent arbeitet **read-only**: keine Dateiänderungen, kein `git commit`, keine Änderung an `package.json`/Lockfile/Skill.

**Prompt-Vorlage** (Platzhalter in `<…>` füllen):

```
Verifiziere die Ausführung des Skills `.cursor/skills/backend-update-minor-patch/SKILL.md` im Repo `backend/`.
Lies zuerst die SKILL.md. Ändere keine Dateien.

Kontext aus der Ausführung:
- Geänderte Pakete: <Kurzliste oder `git diff package.json`-Ausschnitt>
- Durchgeführte Fixes: <Liste oder "keine">
- Ergebnis laut Agent: <alle Checks grün | Rollback | Pin von <paket>>

Prüfe:
1. Kein Major-Sprung: `git diff package.json` — alle Versionsänderungen bleiben innerhalb derselben Major-Version (Pins mit Begründung sind erlaubt).
2. `package.json` und `package-lock.json` sind konsistent (`npm ls --depth=0` ohne ERR/missing; Lockfile-Diff plausibel).
3. Alle Checks aus Schritt 4 laufen jetzt grün: `npm run lint`, `npm run format:check`, `npx tsc --noEmit`, `npm run test`, `npm run build:dev`, `npm run build:prd`.
4. Fixes sind minimal und zielgerichtet (`git diff --stat` ohne unrelated Änderungen), regelkonform zu `.cursorrules`; bei Verhaltensänderungen existieren Tests.
5. Kein Auto-Commit erfolgt (`git log -1` unverändert gegenüber Ausgangszustand) und keine unerwarteten Dateien (`git status --short`).
6. Wurde jeder Workflow-Schritt der SKILL.md eingehalten bzw. begründet übersprungen?

Optimierungen für den Skill selbst: Nenne nur konkrete, belegte Verbesserungen (veraltete Befehle, fehlende oder überflüssige Checks, Widersprüche, unklare Formulierungen, wiederkehrende Fix-Muster aus dieser Ausführung, Abweichungen zwischen Skill und tatsächlichem `package.json`/CI). Keine spekulativen Vorschläge.

Antwortformat (Markdown, deutsch):
## Verifikation
| Prüfpunkt | Status (✅/⚠️/❌) | Beleg |
## Abweichungen
- … oder "keine"
## Optimierungsvorschläge für den Skill
- [Abschnitt/Schritt] Problem → konkreter Änderungsvorschlag … oder "keine"
```

**Auswertung durch den Haupt-Agent:**

1. Findet der SubAgent ❌/⚠️ am Projektzustand (z. B. Check rot, Major-Sprung): Fix-Loop (Schritt 5) erneut ausführen, danach Schritt 7 wiederholen (max. 2 Wiederholungen, dann User informieren).
2. Optimierungsvorschläge **nicht** automatisch in die `SKILL.md` übernehmen — dem User unter „Skill-Optimierungen" präsentieren und auf Freigabe warten.
3. Keine Vorschläge → ausdrücklich „Keine Skill-Optimierungen identifiziert" melden.

## Fehlerbehandlung

| Situation | Vorgehen |
|-----------|----------|
| Ein Check schlägt fehl | Fix-Loop (Schritt 5): Ursache beheben, Checks wiederholen |
| Lint/Prettier | Zuerst `lint:fix` / `format`; verbleibende Issues manuell fixen |
| TypeScript-Fehler | Typen/API anpassen; `npx tsc --noEmit` erneut |
| Test-Fehler | Test oder Produktionscode fixen; `npm test` erneut |
| Build-Fehler | Nest/TS-Config oder Imports anpassen; Build erneut |
| `npm ci` schlägt fehl | `npm install` wiederholen; bei Lockfile-Konflikt fixen, nicht sofort rollback |
| Major-Update in Diff | Rollback der Dependency-Änderung; nur `--target minor` verwenden |
| Tests flaky | Einmal wiederholen; bei persistentem Fehler als echten Fehler behandeln und fixen |
| Fix nach mehreren Versuchen unmöglich | Einzelnes Paket pinnen oder Rollback + User informieren |

## Beispiel-Ausgabe für den User

```markdown
## Dependency-Update (minor/patch)

**Geänderte Pakete:** @nestjs/common 11.1.19 → 11.2.x, jest 30.3.0 → 30.4.x, …

**Validierung:**
- [x] lint
- [x] format:check
- [x] tsc --noEmit
- [x] test (63 suites)
- [x] build:dev / build:prd
- [x] npm ci

**Fixes:** ESLint-Regel in `users.service.ts` angepasst, Jest-Mock für `@nestjs/config` aktualisiert

**SubAgent-Verifikation:** ✅ alle Prüfpunkte bestanden (bzw. Abweichungen + Nachbesserung)

**Skill-Optimierungen (zur Freigabe):**
- [Schritt 4] `npm ci` doppelt ausgeführt → zusammenfassen … (oder „Keine Skill-Optimierungen identifiziert")

**Nächster Schritt:** Änderungen prüfen und manuell committen.
```

## Referenzen

- CI-Checks: `.github/workflows/deployment.yml` (`npm ci`, `lint`, `test`)
- Lokale Qualitätsmatrix: `BACKEND-OPTIMIERUNGSVORSCHLAEGE.md`
- Coding-Standards: `.cursorrules`
