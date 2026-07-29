# Bootstrap API (`GET /bootstrap`)

Aggregierter Cold-Start-Endpunkt für die Flutter-App. Bündelt mehrere Konfigurations- und Referenzdaten in einer Antwort und reduziert parallele Requests beim App-Start.

## Endpoint

```
GET /bootstrap?version=1.2.3
Authorization: Bearer <firebase-token>
```

- **Authentifizierung:** Erforderlich (globaler `AuthGuard`, inkl. anonyme Firebase-User)
- **Query `version`:** Optional. Wenn gesetzt, enthält die Antwort `appVersion` mit Update-Check und optionalem Changelog (gleiche Logik wie `GET /app-versions/check`)

## Response

```json
{
  "appSettings": [],
  "eventCategories": [],
  "businessCategories": [],
  "keywords": [],
  "downtime": { "isDowntime": false },
  "appVersion": {
    "requiresUpdate": false,
    "changelogContent": "Optional markdown changelog"
  },
  "userProfile": null
}
```

| Feld | Quelle (bisheriger Endpunkt) | Hinweis |
|------|------------------------------|---------|
| `appSettings` | `GET /app-settings` | Feature-Flags und Präferenzen |
| `eventCategories` | `GET /event-categories` | Event-Kategorien |
| `businessCategories` | `GET /business-categories` | Partner-Kategorien |
| `keywords` | `GET /keywords` | Business-Keywords |
| `downtime` | `GET /downtime` | Wartungsmodus-Status |
| `appVersion` | `GET /app-versions/check?version=…` | Nur wenn `version` Query gesetzt |
| `userProfile` | `GET /users/:id/profile` | Aus JWT (`req.user.uid`), nicht aus URL |

`userProfile` ist `null`, wenn noch kein Profil in Firestore existiert (z. B. frisch anonym authentifizierter User).

## Caching

- Öffentlicher Bundle-Teil: Cache-Key `bootstrap:public` bzw. `bootstrap:public:{version}`, TTL **5 Minuten**
- `userProfile` wird **nicht** im Bundle gecacht und bei jedem Request frisch geladen
- Unterliegende Services (Kategorien, Keywords, App-Settings) nutzen weiterhin ihre eigenen Cache-Layer

Siehe [configuration-values.md](./configuration-values.md) (Caching-Tabelle).

## Flutter-Migration (schrittweise)

Bestehende Einzel-Requests können schrittweise ersetzt werden:

1. `GET /bootstrap?version=<appVersion>` beim Cold-Start aufrufen
2. Felder aus der Response an bestehende Provider/Repositories mappen
3. Einzel-Endpoints vorerst als Fallback behalten (kein Breaking Change am Backend)
4. Nach erfolgreichem Rollout redundante parallele Calls entfernen

**Nicht im Bundle:** Events-Liste, Businesses-Liste, Legal Documents, Taxi-Stands, Spot-Keywords – diese bleiben separate Requests (schwere oder kontextspezifische Daten).

## Referenzen

- [brainstorming-performance-und-features.md](./brainstorming-performance-und-features.md) §4.1
- [api-app-versions.md](./api-app-versions.md) (Version-Check-Details)
