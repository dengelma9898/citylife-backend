---
name: Ponytail Audit 08 – Architektur-Entscheidung
overview: Einheitliches Modul-Layout festlegen (DDD vs. flache Services) bevor große Refactors starten
status: pending
created: 2026-06-20
phase: 8
effort: S
impact: Richtungsentscheidung
isProject: true
---

# Phase 08 – Architektur-Entscheidung

## Ziel

**Bevor** Phase 09/10 starten: Team-Entscheidung dokumentieren, welches Modul-Pattern gilt.

## Ist-Zustand (Dual Architecture)

| Stil | Beispiel-Module | Merkmale |
|------|-----------------|----------|
| **DDD / Hexagonal** | `businesses`, `direct-chats`, `curated-spots`, `taxi-stands` | `domain/`, `application/`, `infrastructure/`, Repository-Interfaces |
| **Flach / Pragmatisch** | `events`, `news`, `keywords`, `blog-posts`, `special-polls` | `*.service.ts` spricht Firestore direkt, `interfaces/` statt Entities |

`docs/architecture.md` beschreibt hexagonale Architektur als Soll – Realität ist gemischt.

## Optionen

### Option A – Pragmatisch: Alles flach (Ponytail-Empfehlung)

- Services sprechen `FirebaseService.getFirestore()` direkt
- Types als `interface`, kein Entity-Boilerplate
- Repositories und Injection-Tokens entfallen
- **Pro:** ~5.000 LOC weniger, schnellere Features
- **Contra:** `docs/architecture.md` muss aktualisiert werden

### Option B – Strikt hexagonal: Alles DDD

- Legacy-Module (`events`, `news`, …) auf Repository-Pattern migrieren
- **Pro:** Einheitlich, testbar mit Mock-Repos
- **Contra:** Mehr Code, kein zweites Backend geplant

### Option C – Hybrid (Status quo dokumentieren)

- Neue Module: flach
- Bestehende DDD-Module: nicht anfassen
- **Pro:** Kein Big-Bang
- **Contra:** Zwei Patterns dauerhaft pflegen

## Entscheidungs-Checkliste

- [ ] Gibt es einen Plan für ein zweites Persistence-Backend? **Nein** → A oder C
- [ ] Ist Testbarkeit via Repository-Mocks ein harter Anforderung?
- [ ] Akzeptiert das Team `docs/architecture.md`-Update?

## Deliverable

- [ ] ADR oder Abschnitt in `docs/architecture.md` mit gewählter Option
- [ ] Konsequenz für Phase 09/10 festlegen:
  - **Option A:** Phase 09+10 ausführen (Flatten)
  - **Option B:** Phase 09+10 canceln, stattdessen Legacy migrieren
  - **Option C:** Phase 09+10 nur für neue Module, DDD-Module einfrieren

## Abhängigkeit

Phase 09 und 10 **nicht** starten ohne abgeschlossene Entscheidung hier.

## Validierung (Plan abgeschlossen)

```bash
npm test
npm run build
npm run start:dev   # Nest bootstrap ohne DI-Fehler; danach beenden
```

## Referenzen

- `docs/architecture.md`
- Ponytail-Audit Übersicht: `.cursor/plans/ponytail-audit-2026-06-20-overview.plan.md`
