---
name: Version Changelog Feature
overview: Implementierung eines Version Changelog Features, das in das bestehende app-versions Modul integriert wird. Changelogs werden versioniert (0-1 Dokument pro Version) und als Markdown gespeichert. Der Changelog wird im Response von GET /app-versions/check zurückgegeben, wenn vorhanden.
todos:
  - id: "1"
    content: Domain Entity VersionChangelog erstellen (src/app-versions/domain/entities/version-changelog.entity.ts)
    status: completed
  - id: "2"
    content: Repository Interface erweitern um Changelog-Methoden (src/app-versions/domain/repositories/app-version.repository.ts)
    status: completed
  - id: "3"
    content: Firebase Repository Implementierung für Changelogs (src/app-versions/infrastructure/persistence/firebase-app-version.repository.ts)
    status: completed
  - id: "4"
    content: "DTOs erstellen: CreateVersionChangelogDto und VersionChangelogResponseDto"
    status: completed
  - id: "5"
    content: CheckVersionResponseDto erweitern um optionales changelog Feld
    status: completed
  - id: "6"
    content: "Service-Methoden hinzufügen: getChangelogForVersion, createChangelog, getAllChangelogs"
    status: completed
  - id: "7"
    content: GET /app-versions/check erweitern um Changelog im Response
    status: completed
  - id: "8"
    content: "Admin-Endpunkte hinzufügen: POST, GET, GET/:version, PUT/:version, DELETE/:version"
    status: completed
  - id: "9"
    content: Unit Tests für Entity und Service-Methoden
    status: completed
  - id: "10"
    content: Integration Tests für Controller-Endpunkte
    status: completed
isProject: false
---

# Version Changelog Feature Implementierung

## Übersicht

Das Version Changelog Feature wird in das bestehende `app-versions` Modul integriert. Changelogs werden pro App-Version (Format: "X.Y.Z") gespeichert und als Markdown-Inhalt verwaltet. Wenn ein Client die Version prüft und ein Changelog für diese Version existiert, wird dieser im Response zurückgegeben.

## Architektur

### Domain Layer

**Neue Entity: `VersionChangelog**`

- Datei: `src/app-versions/domain/entities/version-changelog.entity.ts`
- Properties:
  - `id: string`
  - `version: string` (Format: "X.Y.Z", entspricht App-Version)
  - `content: string` (Markdown-Inhalt)
  - `createdAt: string`
  - `updatedAt: string`
  - `createdBy: string`
- Factory-Methoden: `create()`, `fromProps()`, `update()`
- Pattern: Folgt dem Domain Entity Pattern wie `LegalDocument`

**Repository Interface erweitern**

- Datei: `src/app-versions/domain/repositories/app-version.repository.ts`
- Neue Methoden:
  - `findChangelogByVersion(version: string): Promise<VersionChangelog | null>`
  - `saveChangelog(changelog: VersionChangelog): Promise<VersionChangelog>`
  - `findAllChangelogs(): Promise<VersionChangelog[]>` (für Admin)

### Infrastructure Layer

**Firebase Repository erweitern**

- Datei: `src/app-versions/infrastructure/persistence/firebase-app-version.repository.ts`
- Neue Collection: `version_changelogs`
- Implementierung der neuen Repository-Methoden
- Pattern: Folgt dem Pattern von `FirebaseLegalDocumentRepository`
- Query-Strategie: Index auf `version` Feld für schnelle Lookups

### Application Layer

**Service erweitern**

- Datei: `src/app-versions/application/services/app-versions.service.ts`
- Neue Methoden:
  - `getChangelogForVersion(version: string): Promise<VersionChangelog | null>`
  - `createChangelog(version: string, content: string, createdBy: string): Promise<VersionChangelog>`
  - `getAllChangelogs(): Promise<VersionChangelog[]>`
  - `getChangelogForVersionOrNull(version: string): Promise<VersionChangelog | null>` (für Check-Endpoint)
- Validierung: Version-Format prüfen (X.Y.Z)

**DTOs**

- Datei: `src/app-versions/dto/create-version-changelog.dto.ts` (neu)
  - `version: string`
  - `content: string`
- Datei: `src/app-versions/dto/version-changelog-response.dto.ts` (neu)
  - Response-DTO für Changelog
- Datei: `src/app-versions/dto/check-version.dto.ts` (erweitern)
  - `changelogContent?: string` hinzufügen (nur der Markdown-Content, nicht das ganze Objekt)

**Controller erweitern**

- Datei: `src/app-versions/application/controllers/app-versions.controller.ts`
  - `GET /app-versions/check` erweitern:
    - Changelog für die übergebene Version abrufen
    - Wenn vorhanden, nur den `content` im Response zurückgeben
    - Response-Struktur: `{ requiresUpdate: boolean, changelogContent?: string }`
- Datei: `src/app-versions/application/controllers/app-versions-admin.controller.ts`
  - Neue Endpunkte:
    - `POST /app-versions/admin/changelogs` - Changelog erstellen
    - `GET /app-versions/admin/changelogs` - Alle Changelogs abrufen
    - `GET /app-versions/admin/changelogs/:version` - Changelog für Version abrufen
    - `PUT /app-versions/admin/changelogs/:version` - Changelog aktualisieren
    - `DELETE /app-versions/admin/changelogs/:version` - Changelog löschen

## Datenmodell

### Firebase Collection: `version_changelogs`

Dokument-Struktur:

```typescript
{
  id: string (auto-generiert),
  version: string, // "X.Y.Z"
  content: string, // Markdown
  createdAt: string, // ISO 8601
  updatedAt: string, // ISO 8601
  createdBy: string // userId
}
```

Index: `version` (unique constraint - max. 1 Dokument pro Version)

## API-Endpunkte

### Öffentlich

**GET /app-versions/check?version=X.Y.Z**

- Erweitert um optionales `changelogContent` Feld im Response
- Response:
  ```typescript
  {
    requiresUpdate: boolean,
    changelogContent?: string // Nur der Markdown-Content, wenn Changelog für diese Version existiert
  }
  ```
- Hinweis: Version wird nicht zurückgegeben (ist bereits bekannt), createdAt ebenfalls nicht

### Admin (Super Admin)

**POST /app-versions/admin/changelogs**

- Erstellt neuen Changelog für eine Version
- Body: `{ version: string, content: string }`
- Validierung: Version-Format prüfen, Version darf nicht bereits existieren

**GET /app-versions/admin/changelogs**

- Gibt alle Changelogs zurück (sortiert nach Version, absteigend)

**GET /app-versions/admin/changelogs/:version**

- Gibt Changelog für spezifische Version zurück

**PUT /app-versions/admin/changelogs/:version**

- Aktualisiert Changelog für Version
- Body: `{ content: string }`

**DELETE /app-versions/admin/changelogs/:version**

- Löscht Changelog für Version

## Implementierungsreihenfolge

1. Domain Entity `VersionChangelog` erstellen
2. Repository Interface erweitern
3. Firebase Repository Implementierung
4. DTOs erstellen/erweitern
5. Service-Methoden hinzufügen
6. Controller erweitern (öffentlich + Admin)
7. Tests hinzufügen
8. Module-Registrierung prüfen (sollte bereits vorhanden sein)

## Tests

- Unit Tests für `VersionChangelog` Entity
- Unit Tests für Service-Methoden
- Integration Tests für Controller-Endpunkte
- Tests für Version-Format-Validierung
- Tests für Edge Cases (kein Changelog vorhanden, ungültige Version, etc.)

## Abhängigkeiten

- Bestehendes `app-versions` Modul
- `FirebaseModule` (bereits importiert)
- `UsersModule` (bereits importiert für RolesGuard)

