---
name: Ponytail Audit 07 – DataLoader entfernen
overview: dataloader-Package durch batch getUserProfiles in UsersService ersetzen
status: pending
created: 2026-06-20
phase: 7
effort: M
impact: "-1 dependency"
isProject: true
---

# Phase 07 – DataLoader durch Batch-Load ersetzen

## Ziel

Das `dataloader`-Package wird nur für `UserProfileLoader` genutzt. Einfaches Batching in `UsersService` reicht.

## Ist-Zustand

```
src/core/loaders/user-profile.loader.ts   → DataLoader<string, UserProfile | null>
src/core/loaders/loaders.module.ts
```

Verwendet in:

- `direct-chats.service.ts`
- `direct-messages.service.ts`

## Soll-Zustand

```typescript
// users.service.ts
async getUserProfilesByIds(ids: string[]): Promise<Map<string, UserProfile | null>>
```

Request-scoped Cache optional via Nest `Scope.REQUEST` auf einem kleinen `UserProfileCache`-Service.

## Schritte

### 1. Batch-Methode in UsersService

- [ ] `getUserProfilesByIds(ids: string[])` implementieren
  - Deduplizieren
  - Firestore `where documentId in` (Chunks à 10/30 je nach Limit)
  - `Map<userId, profile>` zurückgeben
- [ ] Unit-Tests für Batch, leere Liste, unbekannte IDs

### 2. Caller migrieren

- [ ] `direct-chats.service.ts`: `UserProfileLoader` → `UsersService.getUserProfilesByIds`
- [ ] `direct-messages.service.ts`: analog
- [ ] Specs anpassen

### 3. Aufräumen

- [ ] `user-profile.loader.ts` löschen
- [ ] `loaders.module.ts` löschen (siehe auch Phase 04)
- [ ] `dataloader` aus `package.json` entfernen
- [ ] `CoreModule` / `DirectChatsModule` Imports bereinigen

## Validierung

```bash
rg "dataloader|UserProfileLoader" src
npm test -- direct-chats
npm run build
npm run start:dev   # Nest bootstrap ohne DI-Fehler; danach beenden
```

## Risiken

- **Mittel:** N+1 darf nicht zurückkommen – Batch-Methode in Specs mit Call-Count prüfen
- **Firestore Limits:** `in`-Queries auf max. 30 IDs pro Query achten

## Erwarteter Impact

−1 Dependency, ~−80 LOC, ein Loader-Modul weniger

## Referenzen

- `docs/configuration-values.md` – DataLoader-Doku ggf. aktualisieren
- `.cursorrules` – UserProfileLoader-Pattern
