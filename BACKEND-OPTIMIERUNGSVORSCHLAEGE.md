# Backend: Analyse und Optimierungsvorschläge

Stand der Prüfung: lokaler Lauf im Verzeichnis `backend/` (ESLint ohne `--fix`, Prettier-Check, `tsc --noEmit`, `npm test`, `npm run build`).  
Als Projektrichtlinien wurden **`backend/.cursorrules`**, **`eslint.config.js`** und **`tsconfig.json`** einbezogen.

**Bereits umgesetzt (nachfolgend im Text verankert):** NPM-Skripte `lint` / `lint:fix` (Abschnitt 3); ungenutzte Dependency **`lint-staged`** entfernt (Abschnitt 4); **`baseUrl`** entfernt und **`paths`** + explizite **`types`** gemäß TS 6 (Abschnitt 2.1); **`crypto` für IDs** über `import { randomUUID } from 'node:crypto'` (Abschnitt 1.1); **ungenutzte Imports** in mehreren Services/Controllern bereinigt (Abschnitt 1, Punkt 4); **`fetch`** als globale ESLint-Lese-Referenz im Haupt-TS-Block von **`eslint.config.js`** (Abschnitt 1.2); **Debug-Ingest-`fetch`** aus dem Quellcode entfernt (Abschnitt 1.2, Tabelle).

---

## Kurzfassung

| Bereich | Befund |
|--------|--------|
| **ESLint** | **0 Fehler, ~244 Warnungen** (Stand: inkl. `eslint.config.js` für `fetch`/`document`; bei `--max-warnings 0` schlägt die Pipeline fehl) |
| **Prettier** | `format:check` **bestanden** |
| **`tsc --noEmit`** | **ohne Fehler** (nach Entfernung von `baseUrl`, siehe Abschnitt 2.1) |
| **`nest build`** | **erfolgreich** |
| **Tests (`npm test`)** | **63 Suites, 738 bestanden**, 2 übersprungen |

---

## 1. ESLint-Warnungen (Haupthebel)

Gesamt: **~244 Warnungen** (lokaler Lauf `npx eslint "src/**/*.ts"`; nach **`randomUUID`**, Import-Cleanup und **`eslint.config.js`** für `fetch`/`document`; ursprünglich ~337), gruppiert nach Regel (ungefähre Verteilung):

| Regel | Anzahl (ca.) | Inhalt |
|-------|----------------|--------|
| `@typescript-eslint/no-explicit-any` | ~172 | Viele `any`-Stellen, v. a. in Firebase-Repositories und Services |
| `no-undef` | **0** | Zuletzt behoben: **`fetch`** im Haupt-TS-Block von **`eslint.config.js`** (u. a. HERE-Clients) |
| `@typescript-eslint/no-unused-vars` | ~27 | v. a. unbenannte Parameter (`context`, `metadata`, …) und lokale Variablen |
| `@typescript-eslint/explicit-function-return-type` | ~44 | Fehlende explizite Rückgabetypen (Controller-Methoden, Decorators u. a.) |
| `@typescript-eslint/no-require-imports` | ~1 | `require` in Konfigurations-/Randdateien |

**Konkrete, risikoarme ESLint-Verbesserungen:**

1. **~~`crypto` / `node:crypto`~~** – **erledigt** (siehe Einleitung).

2. **`fetch` (`no-undef`) – Punkt 1.2:**

   **Ist-Zustand im Code (Hintergrund):**

   - **`fetch`:** u. a. **`location.service.ts`** (HERE-Geocoding). Zuvor im Projekt existierte Debug-Telemetrie per **`fetch`** zu lokaler Ingest-URL; die zugehörigen Blöcke wurden entfernt (u. a. **`events.controller.ts`**, **`fcm-notification.service.ts`**, **`special-polls.service.ts`**).

   **Umsetzung in `eslint.config.js`:**

   - Im Haupt-TS-Block `languageOptions.globals`: **`fetch: 'readonly'`**.

   | Priorität | Maßnahme | Status |
   |-----------|-----------|--------|
   | **1** | `fetch: 'readonly'` im Haupt-TS-Block | **umgesetzt** |
   | **2** | (ehemals: zusätzlicher ESLint-Block für Browser-Globals in entferntem Code) | **entfallen** |
   | **3** (optional, Produkt/Noise) | Debug-**`fetch`** zur Ingest-URL nicht wieder einführen bzw. nur hinter Feature-Flag | **Code entfernt** (Ingest-Blöcke gelöscht; legitimes **`fetch`** z. B. HERE bleibt) |

   **Hinweis:** Die Zeilen **Priorität 1–3** in dieser Tabelle beziehen sich nur auf **Unterpunkt 1.2** (`fetch` / `no-undef`). Sie sind nicht identisch mit den **nummerierten Listenpunkten 3 und 4** weiter unten (**Listenpunkt 3** = `any` in Repositories, **Listenpunkt 4** = ungenutzte Imports).

   **Nicht empfohlen:** Browser-Globals wie **`document`** global für **`src/**/*.ts`** – würde echte Fehler (fälschliche DOM-Nutzung im Nest-Kern) verschleiern.

3. **`any` in Repositories:** Schrittweise durch **`Firestore`-typisierte** Hilfstypen oder generische `Record<string, unknown>` + schmale Mapper ersetzen; das deckt sich mit den Firebase-/Repository-Hinweisen in **`backend/.cursorrules`**.
4. **~~Ungenutzte Imports~~** – **teilweise umgesetzt** (Firestore-Modul-Imports in `chat-messages.service` / `users.service`, Swagger/Nest-Reste, `DateTimeUtils` u. a., `Query`, `Messaging` u. a.); verbleibend: **`no-unused-vars`** an Parametern und lokalen Variablen (siehe Tabelle).
5. **Rückgabetypen** an öffentlichen Controller-/Service-Methoden – direkte Umsetzung von `@typescript-eslint/explicit-function-return-type` und der **`backend/.cursorrules`**-Vorgabe zu expliziten Typen.

---

## 2. TypeScript-Konfiguration und Striktheit

### 2.1 Deprecation: `baseUrl` (umgesetzt)

**Frühere Ausgangslage:** `npx tsc --noEmit` meldete **TS5101** zu **`baseUrl`** (deprecated, vgl. [TypeScript 6 – Migration / `baseUrl`](https://aka.ms/ts6)).

**Umsetzung in `tsconfig.json`:**

- **`baseUrl`** entfernt.
- **`paths`:** `"src/*": ["./src/*"]` – weiterhin gültige Auflösung für bestehende Imports der Form `src/...` (ohne `baseUrl`, wie in der TS-6-Doku beschrieben).
- **`types`:** `["node", "jest"]` – nötig ab TypeScript 6, weil die automatische Einbindung aller `@types` entfällt; sonst schlagen u. a. `describe` / `it` / `expect` in `*.spec.ts` fehl.

In **`tsconfig.build.json`** wurde die Option **`ignoreDeprecations`: `"6.0"`** entfernt, sobald `baseUrl` nicht mehr nötig war.

### 2.2 `strict`-Optionen größtenteils aus

In **`tsconfig.json`** sind u. a. **`strictNullChecks`**, **`noImplicitAny`**, **`strictBindCallApply`**, **`forceConsistentCasingInFileNames`** auf `false` – das erleichtert kurzfristig die Entwicklung, steht aber im **Spannungsfeld zu `backend/.cursorrules`** (explizite Typen, saubere Domain).

**Vorschlag (mittelfristig):** Strikte Optionen schrittweise aktivieren (z. B. zuerst `strictNullChecks`, dann `noImplicitAny`), pro Modul refaktorieren – das reduziert Laufzeitfehler und ergänzt die ESLint-Ziele sinnvoll.

---

## 3. NPM-Skripte und Pre-Commit

**Umsetzung:** In **`package.json`** gilt jetzt:

- **`lint`:** `eslint "src/**/*.ts"` **ohne** `--fix` (reine Prüfung für CI und klare Fehlerlisten).
- **`lint:fix`:** `eslint "src/**/*.ts" --fix` (lokal für automatische Korrekturen).

**`.husky/pre-commit`** ruft `npm run lint` und `npm run format:check` auf – damit wird beim Commit **nicht** mehr per ESLint auto-gefixt; Fixes erfolgen bewusst über `npm run lint:fix` (und ggf. `npm run format`).

---

## 4. Husky / lint-staged

**Ausgangslage (Analyse):** **`lint-staged`** war als devDependency in **`package.json`** eingetragen, ohne Konfiguration (z. B. kein `.lintstagedrc*`) und ohne Nutzung im Hook.

**Umsetzung:** Die Dependency **`lint-staged`** wurde entfernt (`npm uninstall lint-staged`, Eintrag in **`package-lock.json`** bereinigt). **Husky** bleibt bestehen; bei Bedarf kann **lint-staged** später wieder hinzugefügt und mit `pre-commit` verdrahtet werden, um nur geänderte Dateien zu prüfen.

---

## 5. Abgleich mit `backend/.cursorrules`

Die Regeln fordern u. a. **explizite Typen**, **wenig `any`**, **Tests pro Feature** und klare **NestJS-Modul-/Guard-Abhängigkeiten**. Die aktuellen ESLint-Warnungen und die lockere `tsconfig` sind die größten strukturellen Abweichungen.

**Positiv:** Tests laufen grün; **Prettier** ist konsistent – das passt zur Qualitätslinie in den Regeln.

---

## 6. Weitere sinnvolle Optimierungen (ohne sofortigen Code)

- **CI:** ESLLint mit festem `--max-warnings 0` erst nach schrittweiser Warnungs-Reduktion, sonst dauernd rot.
- **Sicherheit/Dependencies:** Regelmäßig `npm audit` (und ggf. Renovate/Dependabot) – nicht im Lauf verifiziert, aber üblich für Firebase-/axios-lastige Stacks.
- **Schwere Dependencies:** Große Runtime-Pakete prüfen, ob sie wirklich gebraucht werden (Bundle/Deploy-Größe, Cold Start).

---

## 7. Empfohlene Reihenfolge

1. ~~**`crypto` / `randomUUID` aus `node:crypto`**~~ – **erledigt** (Abschnitt 1.1 / Einleitung).  
1b. ~~**`fetch` (`no-undef`)**~~ – **erledigt** (Abschnitt 1.2, `fetch: 'readonly'` im Haupt-TS-Block von `eslint.config.js`).  
2. ~~**Ungenutzte Imports (großer Teil)**~~ – **erledigt**; verbleibend: **Parameter/Lokale** (`_`-Präfix, tote Zuweisungen).  
3. ~~**`lint` vs. `lint:fix` + Husky**~~ – **erledigt** (siehe Abschnitt 3).  
4. ~~**`lint-staged`**~~ – **erledigt** (Entfernung; siehe Abschnitt 4).  
5. ~~**`baseUrl` / TS6-Migration**~~ – **erledigt** (siehe Abschnitt 2.1).  
6. **`any`** und **Rückgabetypen** iterativ verbessern (Repositories → Services → Controller).  
7. **`strict*`-Compiler-Flags** schrittweise schärfen, passend zu **`backend/.cursorrules`**.

---

*Analyse- und Maßnahmenliste; umgesetzte Punkte betreffen u. a. `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, **`eslint.config.js`** sowie mehrere Dateien unter `src/` (u. a. `randomUUID`/`node:crypto`, bereinigte Imports). **`fetch` / `no-undef`:** Abschnitt **1.2**.*
