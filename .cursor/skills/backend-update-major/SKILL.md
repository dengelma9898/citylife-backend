---
name: backend-update-major
description: Führt Major-Version-Updates für npm-Dependencies im Citylife-Backend schrittweise durch (ein Paket pro Aufruf), pflegt einen Plan unter .cursor/plans/major-updates-<date>-<status>, prüft Changelogs und Projekt-Validierungen. Use when the user asks for major dependency updates, major bumps, breaking dependency upgrades, or staged major npm updates in backend/.
---

# Backend: Major Dependency Update (schrittweise)

Führt **genau ein** Major-Update pro Skill-Aufruf durch. Alle verfügbaren Major-Updates werden in einem **Plan-Dokument** gesammelt und nacheinander abgearbeitet.

Projekt: `backend/` (NestJS, npm, `package-lock.json`). Richtlinien: `.cursorrules`.

## Kernregeln

1. **Ein Major-Update pro Aufruf** — nie mehrere Pakete in einem Durchlauf
2. **Plan-Pflicht** — Fortschritt wird in `.cursor/plans/major-updates-<YYYY-MM-DD>-<status>.plan.md` dokumentiert
3. **Kein neuer Scan**, solange ein Plan mit Status `pending` existiert und noch offene Einträge hat
4. **Neuer Plan** erst, wenn der aktuelle `pending`-Plan vollständig abgearbeitet ist (→ `completed`)
5. **Kein automatischer Commit** — User committet manuell
6. **Neue Fehler müssen behoben werden** — Rollback nur als letzter Ausweg

## Plan-Dokument

### Speicherort & Benennung

```
.cursor/plans/major-updates-<YYYY-MM-DD>-<status>.plan.md
```

| Status | Bedeutung |
|--------|-----------|
| `pending` | Plan aktiv, mindestens ein Major-Update offen |
| `completed` | Alle Einträge abgeschlossen oder bewusst übersprungen |

**Status-Übergang:** Wenn alle Todos `completed` oder `skipped` sind → Datei umbenennen von `…-pending.plan.md` zu `…-completed.plan.md` und Frontmatter `status: completed` setzen.

### Frontmatter-Vorlage (neuer Plan)

```yaml
---
name: Major Dependency Updates YYYY-MM-DD
overview: Schrittweise Major-Updates für backend npm-Abhängigkeiten
status: pending
created: YYYY-MM-DD
updated: YYYY-MM-DD
todos:
  - id: pkg-<paket-name-normalisiert>
    content: "<paket> <current> → <latest> (Major)"
    package: "<paket-name>"
    from: "<current-version>"
    to: "<latest-version>"
    status: pending
isProject: true
---
```

Todo-Status pro Paket: `pending` | `in_progress` | `completed` | `skipped` | `blocked`

### Plan-Inhalt (Markdown-Body)

Kurz halten — pro Paket:

- Breaking-Change-Hinweise (Changelog/Migration Guide)
- Betroffene Projektbereiche (Module, Config, Tests)
- Notizen nach Abschluss (Fixes, Pins, Blocker)

---

## Workflow (pro Skill-Aufruf)

```
Task Progress:
- [ ] Schritt 1: Plan-Status prüfen
- [ ] Schritt 2: Major-Updates ermitteln ODER nächstes Paket aus Plan wählen
- [ ] Schritt 3: Changelog / Breaking Changes recherchieren
- [ ] Schritt 4: Ein Major-Update durchführen
- [ ] Schritt 5: Lockfile installieren
- [ ] Schritt 6: Validierungen ausführen
- [ ] Schritt 7: Fehler beheben (Fix-Loop)
- [ ] Schritt 8: Plan aktualisieren
```

### Schritt 1: Plan-Status prüfen

```bash
cd backend
ls -1 .cursor/plans/major-updates-*-pending.plan.md 2>/dev/null
```

**Entscheidung:**

| Situation | Aktion |
|-----------|--------|
| `…-pending.plan.md` existiert mit offenen Todos | → Schritt 2b (kein Scan) |
| Kein `pending`-Plan, oder nur `completed`-Pläne | → Schritt 2a (Scan + neuer Plan) |
| `pending`-Plan existiert, alle Todos `completed`/`skipped` | → Plan auf `completed` setzen, dann Schritt 2a |

**Wichtig:** Bei existierendem `pending`-Plan **darf kein neuer Scan** und **kein neuer Plan** erstellt werden.

### Schritt 2a: Major-Updates ermitteln (nur ohne offenen pending-Plan)

```bash
node --version   # Erwartung: v24.x
git status --short package.json package-lock.json
npx --yes npm-check-updates --target latest --format json
```

Aus der JSON-Ausgabe **nur Major-Sprünge** aufnehmen (Major-Version der `to`-Version > Major der `from`-Version).

Neues Plan-Dokument anlegen:

```
.cursor/plans/major-updates-<YYYY-MM-DD>-pending.plan.md
```

Datum = heutiges Datum. Alle gefundenen Major-Updates als Todos mit `status: pending` eintragen.

**Keine Major-Updates gefunden:** Plan trotzdem anlegen mit leerer Todo-Liste und Hinweis im Body; User informieren, kein Update nötig.

### Schritt 2b: Nächstes Paket aus Plan wählen

Im `pending`-Plan das **erste** Todo mit `status: pending` wählen.

- Todo auf `in_progress` setzen
- `updated`-Datum im Frontmatter aktualisieren
- **Nur dieses eine Paket** in diesem Aufruf bearbeiten

### Schritt 3: Changelog / Breaking Changes

Vor dem Update kurz recherchieren:

- GitHub Releases / CHANGELOG des Pakets
- Offizielle Migration Guides (NestJS, TypeScript, Jest, ESLint etc.)
- Welche `src/`-Bereiche, Configs oder Tests betroffen sein könnten

Erkenntnisse im Plan-Body unter dem Paket festhalten.

### Schritt 4: Ein Major-Update durchführen

**Nur das gewählte Paket** updaten:

```bash
npx --yes npm-check-updates -u --target latest --filter <paket-name>
```

Alternativ bei Scoped Packages:

```bash
npx --yes npm-check-updates -u --target latest --filter "@nestjs/*"
```

**Nur wenn explizit ein @nestjs/*-Paket im Plan steht** — ansonsten immer `--filter` auf exakt ein Paket.

Nach dem Update prüfen:

```bash
git diff package.json
```

Es darf **nur** das geplante Paket (plus ggf. direkte Peer-Abhängigkeiten desselben Scopes) geändert sein. Unerwartete Major-Sprünge anderer Pakete → sofort zurücksetzen:

```bash
git checkout -- package.json package-lock.json
```

### Schritt 5: Lockfile installieren

```bash
npm install
git diff --stat package.json package-lock.json
```

### Schritt 6: Projekt-Validierungen (alle müssen grün sein)

Reihenfolge wie im Minor/Patch-Skill und CI:

| # | Check | Befehl |
|---|--------|--------|
| 1 | ESLint | `npm run lint` |
| 2 | Prettier | `npm run format:check` |
| 3 | TypeScript | `npx tsc --noEmit` |
| 4 | Tests | `npm run test` |
| 5 | Build (dev) | `npm run build:dev` |
| 6 | Build (prd) | `npm run build:prd` |
| 7 | Reproduzierbarkeit | `npm ci` |
| 8 | Nach `npm ci` | `npm run lint && npm run test` |

Bei fehlgeschlagenem Check → Schritt 7, danach ab dem fehlgeschlagenen Check wiederholen.

**Nicht** Teil dieses Skills:

- `npm run start` / `npm run start:dev`
- `npm run sonar`
- Docker-Build/Deploy

### Schritt 7: Fehler beheben (Fix-Loop)

**Pflicht:** Breaking-Change-Fehler im selben Aufruf beheben. Der Aufruf gilt erst als abgeschlossen, wenn alle Checks aus Schritt 6 grün sind.

```
Fix-Loop:
- [ ] Fehler analysieren (Log, Changelog, betroffenes Paket)
- [ ] Fix implementieren (Code, Config, Tests — gemäß .cursorrules)
- [ ] Betroffene Checks erneut ausführen
- [ ] Alle Checks aus Schritt 6 erneut durchlaufen
```

**Typische Fix-Strategien (Reihenfolge):**

1. **Migration Guide umsetzen** — API-Änderungen, deprecations, Config
2. **Code/Tests anpassen** — Typen, Mocks, NestJS-Module
3. **Format/Lint auto-fix** — `npm run lint:fix`, `npm run format`
4. **Paket pinnen / Downgrade** — nur wenn Major-Migration unvertretbar; Todo auf `blocked` oder `skipped` setzen und begründen

**Rollback** (nur letzter Ausweg):

```bash
git checkout -- package.json package-lock.json
npm ci
```

Todo auf `blocked` setzen, Begründung im Plan dokumentieren.

### Schritt 8: Plan aktualisieren

**Bei Erfolg:**

- Todo des Pakets → `completed`
- Kurz notieren: durchgeführte Fixes, relevante Dateien
- `updated`-Datum setzen

**Bei Skip/Block:**

- Todo → `skipped` oder `blocked` mit Begründung

**Plan abschließen (wenn alle Todos erledigt):**

1. Frontmatter `status: completed`
2. Datei umbenennen: `major-updates-<date>-pending.plan.md` → `major-updates-<date>-completed.plan.md`

**User-Zusammenfassung** (immer am Ende):

```markdown
## Major Dependency Update

**Plan:** `.cursor/plans/major-updates-<date>-<status>.plan.md`

**Dieser Aufruf:** <paket> <from> → <to>

**Validierung:**
- [x] lint / format / tsc / test / build / npm ci

**Fixes:** …

**Plan-Fortschritt:** X/Y abgeschlossen

**Nächster Schritt:**
- Weitere offene Majors: Skill erneut aufrufen
- Plan vollständig: User soll committen; nächster Scan erst nach erneutem Aufruf (erstellt dann neuen Plan)
```

---

## Fehlerbehandlung

| Situation | Vorgehen |
|-----------|----------|
| `pending`-Plan mit offenen Todos | Kein Scan; nächstes `pending`-Todo bearbeiten |
| Mehrere Pakete im Diff | Rollback; nur `--filter <ein-paket>` |
| Check schlägt fehl | Fix-Loop (Schritt 7) |
| Major-Migration zu aufwendig | Rollback; Todo `blocked`/`skipped`; User informieren |
| Peer-Dependency-Konflikt | `npm install` Log prüfen; ggf. zusammengehörige Pakete **im Plan** als Abhängigkeit vermerken, aber weiterhin **ein** Primary-Paket pro Aufruf |
| Flaky Tests | Einmal wiederholen; persistent → fixen |
| Uncommitted package.json vor Start | User informieren |

---

## Beispiel: Plan-Lebenszyklus

1. **Aufruf 1** — Kein pending-Plan → Scan findet `jest`, `eslint`, `firebase-admin` → Plan `major-updates-2026-05-26-pending.plan.md` → `jest` updaten → Todo `jest` = `completed`
2. **Aufruf 2** — Pending-Plan existiert → kein Scan → `eslint` updaten → Todo `eslint` = `completed`
3. **Aufruf 3** — `firebase-admin` updaten → alle Todos erledigt → Plan → `major-updates-2026-05-26-completed.plan.md`
4. **Aufruf 4** — Kein pending-Plan → neuer Scan → neuer Plan `major-updates-2026-06-15-pending.plan.md`

---

## Referenzen

- Minor/Patch-Skill (Validierungen): [.cursor/skills/backend-update-minor-patch/SKILL.md](../backend-update-minor-patch/SKILL.md)
- CI-Checks: `.github/workflows/deployment.yml`
- Qualitätsmatrix: `BACKEND-OPTIMIERUNGSVORSCHLAEGE.md`
- Coding-Standards: `.cursorrules`
