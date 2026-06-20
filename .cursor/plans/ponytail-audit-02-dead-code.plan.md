---
name: Ponytail Audit 02 – Toter Code
overview: Ungenutzte Dateien, Services, Methoden und Interface-Duplikate entfernen
status: pending
created: 2026-06-20
phase: 2
effort: S
impact: "~-400 LOC"
isProject: true
---

# Phase 02 – Toten Code entfernen

## Ziel

Code löschen, der exportiert aber nie aufgerufen wird, oder durch neuere Strukturen ersetzt wurde.

## Lösch-Kandidaten

### Services & Interceptors

| Datei | Befund |
|-------|--------|
| `src/core/interceptors/firestore-token.interceptor.ts` | Nie in `CoreModule` registriert |
| `src/users/services/user-adapter.service.ts` | `addBusinessToHistory` hat 0 Caller |
| `src/users/users.module.ts` | `UserAdapterService` aus providers/exports entfernen |

### Interface-Ordner (ersetzt durch Entities)

| Ordner/Datei | Befund |
|--------------|--------|
| `src/businesses/interfaces/*` | Fast komplett tot; nur `BusinessStatus`-Import in `users.service.ts` (falsche Quelle) und `NuernbergspotsReview` in Entity |
| `src/business-categories/interfaces/business-category.interface.ts` | 0 Imports |
| `src/chatrooms/interfaces/*` | 0 Imports (Entities existieren) |

### Methoden in `DateTimeUtils`

Entfernen (nie aufgerufen):

- `getTimezoneOffset()` (private)
- `formatGermanDate()`
- `formatGermanTime()`
- `convertToISO()`

### Sonstiges

| Datei | Aktion |
|-------|--------|
| `src/curated-spots/dto/normalize-http-url-spaces.ts` | Inline an Call-Site oder behalten (optional, ~6 LOC) |
| `src/direct-chats/README.md` | Nach `docs/` verschieben oder löschen wenn redundant |

## Schritte

### 1. `businesses/interfaces/` bereinigen

- [ ] `NuernbergspotsReview` nach `src/businesses/domain/` verschieben (z. B. `nuernbergspots-review.type.ts`)
- [ ] `users.service.ts` + Spec: `BusinessStatus` aus `domain/enums/business-status.enum` importieren
- [ ] `business.entity.ts`: Import auf neuen Typ-Pfad anpassen
- [ ] Gesamten Ordner `src/businesses/interfaces/` löschen

### 2. Weitere Interface-Ordner

- [ ] `src/business-categories/interfaces/` löschen
- [ ] `src/chatrooms/interfaces/` löschen

### 3. Tote Services/Interceptors

- [ ] `FirestoreTokenInterceptor` löschen
- [ ] `UserAdapterService` löschen + Module anpassen

### 4. `DateTimeUtils` aufräumen

- [ ] Ungenutzte Methoden entfernen
- [ ] Specs anpassen falls vorhanden

### 5. Optional: Doku verschieben

- [ ] `direct-chats/README.md` → `docs/direct-chats-api.md` (Inhalt prüfen vs. Swagger)

## Validierung

```bash
rg "businesses/interfaces|UserAdapterService|FirestoreTokenInterceptor|formatGermanDate|convertToISO" src
npm test
```

## Risiken

- **Niedrig:** `NuernbergspotsReview`-Verschiebung – Import-Pfade in Entity/DTO prüfen
- **Doku:** `direct-chats/README.md` vor Löschen auf Unique Content prüfen

## Erwarteter Impact

~−400 LOC (inkl. Interface-Dateien)
