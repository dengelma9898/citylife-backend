---
name: Weihnachtsmärkte Domäne, Feature-Flag und Citylife-Seed
overview: Neue flache Domäne christmas-markets (Firestore-CRUD + Admin-Schreibrechte), Erweiterung des zentralen Feature-Flags um christmas-markets und ein Seed-Skript, das die 10 Prototyp-Märkte idempotent in die Firestore-Collection christmasMarkets des Citylife-Projekts schreibt.
todos:
  - id: christmas-markets-module
    content: Flaches Modul src/christmas-markets (Module, Controller, Service, DTOs, Interface) analog special-polls; Registrierung in AppModule, UsersModule importieren
    status: completed
  - id: christmas-markets-api
    content: "Endpunkte GET /christmas-markets, GET /:id (authentifiziert) und POST/PATCH/DELETE (admin/super_admin) mit strikter DTO-Validierung, Audit-Feldern und Cache (15 Min, Invalidierung bei Writes)"
    status: completed
  - id: feature-flag-christmas-markets
    content: "FeatureFlag christmas-markets in src/feature-flags (Enum, DEFINITIONS, getAllFlags) ergänzen; Settings-Dokument anlegen; kein Backend-Enforcement (Clients entscheiden)"
    status: completed
  - id: seed-citylife
    content: "scripts/seed-christmas-markets-citylife.js analog seed-kids-spots-citylife (Dry-Run/--write/--delete, Projekt-Guard), 10 Fixtures mit deterministischen Doc-IDs in christmasMarkets schreiben"
    status: completed
  - id: tests-docs
    content: Jest-Specs (Service + Controller, Cache Hit/Miss/Invalidierung), CONSTITUTION §5 API-Block + docs/flutter-christmas-markets-integration.md
    status: completed
isProject: false
---

# Weihnachtsmärkte: Backend-Domäne, Feature-Flag und Seed

## Kontext

- Die App zeigt Weihnachtsmärkte bislang nur als Prototyp mit lokalen
  Fixtures (`app/lib/presentation/features/christmas_markets/
  christmas_market_fixtures.dart`, 10 Märkte der Region, Saison 2026).
  Die Märkte sollen redaktionell pflegbar werden und per Feature-Flag
  ein-/ausblendbar sein – **nicht** als kuratierte Spots (saisonal,
  eigenes Schema).
- Referenzmuster laut `CONSTITUTION.md` §2: neue Module **flach** wie
  `src/special-polls/` / `src/news/` anlegen; Services nutzen direkt
  `FirebaseService.getFirestore()`, kein neues Repository-Interface.
- Feature-Flags existieren zentral in `src/feature-flags/`
  (`FeatureFlagsController`/`Service`, Firestore `settings/{documentId}`,
  Cache 15 Min, `PATCH` nur `admin`/`super_admin`, kein
  Backend-Enforcement – Clients entscheiden über die Anzeige).
- Seed-Vorbild: `npm run seed:kids-spots:citylife`
  (`scripts/seed-kids-spots-citylife.js`, direkt `firebase-admin`,
  Dry-Run/`--write`/`--delete`, Projekt-Guard).

## 1. Datenmodell (Firestore `christmasMarkets`)

Doc-ID = Fixture-ID (Slug, deterministisch für idempotenten Seed).

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `name` | string | ja | z. B. „Nürnberger Christkindlesmarkt“ |
| `city` | string | ja | Ortsfilter/-Gruppierung in der App |
| `place` | string | ja | Platz/Adresse („Hauptmarkt“) |
| `description` | string | ja | Freitext (App rendert Detail-Beschreibung) |
| `periodLabel` | string | ja | Anzeige-String („27.11. – 24.12.2026“) |
| `openingHoursLabel` | string | ja | Anzeige-String („Täglich 10–21 Uhr“) |
| `startDate` | Timestamp | nein | Status-Logik der App („Öffnet in x Tagen“) |
| `endDate` | Timestamp | nein | `endDate >= startDate` (Service-Prüfung → 400) |
| `latitude`/`longitude` | number | ja | –90..90 / –180..180 |
| `imageUrl` | string | nein | Titelbild; ohne Bild Emoji-Fallback in der App |
| `highlights` | string[] | nein | Chips in der App |
| `createdAt`/`updatedAt` | Timestamp | serverseitig | per `firebase-mapper.util` (`removeUndefined`) |
| `createdBy`/`updatedBy` | string | serverseitig | `@CurrentUser()`, analog Curated Spots |

Im Service bei Reads Timestamps → ISO-Strings konvertieren
(§2 „Firebase-Persistenz“), damit der JSON-Vertrag zur App stabil ist.

## 2. API (`src/christmas-markets/`)

Flaches Layout: `christmas-markets.module.ts`,
`christmas-markets.controller.ts`, `christmas-markets.service.ts`,
`interfaces/christmas-market.interface.ts`,
`dto/create-christmas-market.dto.ts`,
`dto/update-christmas-market.dto.ts`.

| Methode | Pfad | Rollen | Beschreibung |
|---|---|---|---|
| GET | `/christmas-markets` | authentifiziert | Alle Märkte, sortiert nach `startDate` (ohne Datum ans Ende) |
| GET | `/christmas-markets/:id` | authentifiziert | Einzelner Markt, 404 wenn fehlt |
| POST | `/christmas-markets` | `admin`, `super_admin` | Anlegen (ID optional als Slug, sonst Auto-ID) |
| PATCH | `/christmas-markets/:id` | `admin`, `super_admin` | Teilupdate |
| DELETE | `/christmas-markets/:id` | `admin`, `super_admin` | Löschen |

- Validierung global über `ValidationPipe` (whitelist,
  forbidNonWhitelisted); DTOs mit `class-validator`
  (`@IsString`, `@IsISO8601`/`@Type(() => Date)`, `@IsLatitude`/
  `@IsLongitude` bzw. `@Min/@Max`, `@IsArray @IsString({each:true})`,
  `@IsOptional @IsUrl` für `imageUrl`).
- Modul importiert `UsersModule` (Governance §1, `RolesGuard`).
- Cache (read-heavy, Pflicht laut `.cursorrules`): `CACHE_MANAGER`,
  Keys `christmas-markets:all` / `christmas-markets:{id}`, TTL 15 Min
  wie Feature-Flags/App-Settings; Invalidierung bei POST/PATCH/DELETE.
- Kein Push/Notification-Typ (reine Anzeige-Domäne).

## 3. Feature-Flag `christmas-markets`

- `FeatureFlag`-Enum und `DEFINITIONS` in `src/feature-flags/` um
  `christmas-markets` erweitern (analog `kids-spots`), in
  `getAllFlags()` aufnehmen.
- Anzeige-Logik bleibt Client-Sache (Backend-Muster): App fragt
  `GET /feature-flags/christmas-markets` ab und blendet Hero/Routen aus.
- Das Markten-CRUD bleibt vom Flag unberührt (Admin kann bei
  deaktiviertem Flag weiter pflegen).
- Default nach Seed: deaktiviert; Aktivierung bewusst über Admin-FE
  (siehe Admin-Plan), damit der Livegang gesteuert erfolgt.

## 4. Seed: Mock-Daten → Firestore (Citylife)

- Neues Skript `scripts/seed-christmas-markets-citylife.js`, npm-Script
  `seed:christmas-markets:citylife`, **analog Kids-Seed**:
  `firebase-admin` direkt, Projekt-Guard (nur Citylife-Projekt),
  Standard = Dry-Run (nur Ausgabe), `--write` schreibt, `--delete`
  entfernt die Seed-Dokumente wieder.
- Datenquelle: die 10 Prototyp-Fixtures der App 1:1 übernehmen
  (Nürnberg Christkindlesmarkt, Fürth, Erlangen, Roth,
  Rothenburg Reiterlesmarkt, Ansbach, Bamberg, Würzburg, Dinkelsbühl,
  Forchheim) inkl. Koordinaten, `startDate`/`endDate` 2026,
  `periodLabel`/`openingHoursLabel`, `highlights`; Nürnberg inkl.
  `imageUrl` (Frankentourismus-Thumbnail).
- Idempotent: `set(..., {merge: true})` mit Doc-IDs = Fixture-IDs;
  erneutes `--write` aktualisiert statt zu duplizieren.
- **Redaktioneller Hinweis (vor Livegang prüfen):** Zeiträume/
  Öffnungszeiten sind Beispielwerte des Prototyps (Quelle:
  frankentourismus.de, Abruf Nov 2026); Bildrechte der `imageUrl`
  klären. Das Skript dokumentiert das im Kopfkommentar.

## 5. Tests & Doku

- Jest (Projekt-Gate `npm test`): `christmas-markets.service.spec.ts`
  (CRUD, Sortierung, Datums-Validierung, Cache Hit/Miss/Invalidierung,
  FirebaseService/CACHE_MANAGER gemockt) und
  `christmas-markets.controller.spec.ts` (Guards per `overrideGuard`,
  Rollen admin/super_admin für Writes). Feature-Flags-Spec um
  `christmas-markets` ergänzen.
- `CONSTITUTION.md`: neuer API-Block in §5 (analog §5.7/§5.8) inkl.
  Firestore-Tabelle und Flag; Cache-TTL in §3-Konvention erwähnen.
- `docs/flutter-christmas-markets-integration.md`: Vertrag für die App
  (Endpunkte, Response-Envelope `{ data }`, Flag-Abfrage, Fehlerfälle).

## Reihenfolge / Abhängigkeiten

1. Dieses Backend (API + Flag) → 2. Admin-FE (Pflege + Toggle) →
3. App (API statt Fixtures). Seed kann nach Schritt 1 jederzeit
laufen; Flag erst nach App-Rollout aktivieren.
