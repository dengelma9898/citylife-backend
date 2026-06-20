---
name: Ponytail Audit 03 – Firebase Mapper Util
overview: 29× copy-pasted removeUndefined/toPlainObject in eine Shared-Utility extrahieren
status: pending
created: 2026-06-20
phase: 3
effort: M
impact: "~-300 LOC"
isProject: true
---

# Phase 03 – Firebase Mapper Utility

## Ziel

Das in `.cursorrules` dokumentierte `removeUndefined`-Pattern zentralisieren statt in ~29 Dateien zu duplizieren.

## Ist-Zustand

Jedes `firebase-*.repository.ts` und mehrere Legacy-Services (`events.service.ts`, `news.service.ts`, …) definieren privat:

```typescript
private removeUndefined(obj: any): any { ... }
private toPlainObject(entity) { ... }
private toEntityProps(data, id) { ... }  // teils unterschiedlich
```

## Soll-Zustand

Neue Utility (Vorschlag):

```
src/firebase/firebase-mapper.util.ts
```

Exportiert:

- `removeUndefined(obj: unknown): unknown`
- `toFirestoreData(entity: { toJSON(): object }): Record<string, unknown>` (generisch)
- Optional: `mapTimestampFields(data, fields)` falls wiederholt

## Schritte

### 1. Utility anlegen

- [ ] `src/firebase/firebase-mapper.util.ts` erstellen
- [ ] Unit-Tests: `src/firebase/firebase-mapper.util.spec.ts`
  - nested objects, arrays, `undefined` → `null`
  - Edge cases: `null`, primitives

### 2. Repositories migrieren (modulweise)

Reihenfolge nach Risiko (klein → groß):

1. [ ] `taxi-stands`, `easter-egg-hunt`, `advent-calendar`
2. [ ] `job-offers`, `job-offer-categories`, `feature-requests`
3. [ ] `contact`, `legal-documents`, `app-settings`, `app-versions`
4. [ ] `business-categories`, `curated-spots` (4 Repos)
5. [ ] `direct-chats` (4 Repos)
6. [ ] `chatrooms` (2 Repos)
7. [ ] `businesses` (2 Repos)

Pro Modul:

- [ ] Private `removeUndefined`/`toPlainObject` entfernen
- [ ] Shared-Import nutzen
- [ ] Bestehende Repository-Specs grün halten

### 3. Legacy-Services migrieren

- [ ] `events.service.ts`, `news.service.ts`, `keywords.service.ts`
- [ ] `special-polls.service.ts`, `blog-posts.service.ts`
- [ ] `event-categories.service.ts`, `users.service.ts`

## Validierung

```bash
rg "private removeUndefined" src   # sollte 0 Treffer sein
npm test
```

## Risiken

- **Mittel:** Subtile Unterschiede in `toEntityProps`-Implementierungen – pro Repo diff prüfen
- **Kein Verhalten ändern:** Reine Extraktion, keine Logik-Änderung

## Erwarteter Impact

~−300 LOC, einheitlicheres Firebase-Persistence-Pattern
