# Version Changelog Feature - Admin-Zusammenfassung

## Übersicht

Changelogs können pro App-Version (Format: X.Y.Z) als Markdown verwaltet werden. Wenn ein Changelog für eine Version existiert, wird er automatisch im Response von `GET /app-versions/check` zurückgegeben.

## Admin-Endpunkte (Super Admin)

### Changelog erstellen

```
POST /app-versions/admin/changelogs
Body: {
  "version": "1.2.3",
  "content": "# Version 1.2.3\n\n- Neue Funktion A\n- Bugfix B"
}
```

### Alle Changelogs abrufen

```
GET /app-versions/admin/changelogs
```

Gibt alle Changelogs sortiert nach Version (absteigend) zurück.

### Changelog für Version abrufen

```
GET /app-versions/admin/changelogs/:version
```

### Changelog aktualisieren

```
PUT /app-versions/admin/changelogs/:version
Body: {
  "content": "# Aktualisierter Inhalt..."
}
```

### Changelog löschen

```
DELETE /app-versions/admin/changelogs/:version
```

## Öffentlicher Endpunkt

```
GET /app-versions/check?version=1.2.3
```

Response enthält optional `changelogContent` (nur Markdown-Text), wenn ein Changelog für diese Version existiert.

## Wichtige Hinweise

- **Version-Format**: X.Y.Z (z.B. 1.2.3)
- **Content**: Markdown
- **Pro Version**: max. 1 Changelog
- Wenn vorhanden, wird der Changelog automatisch bei Version-Checks zurückgegeben
