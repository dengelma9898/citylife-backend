# Weihnachtsmärkte – Integration in der Flutter-App

**Stand:** 07.11.2026
**Geltungsbereich:** Nürnbergspots Flutter-App (Weihnachtsmärkte-Prototyp in `lib/presentation/features/christmas_markets/`, aktuell lokale Fixtures)
**Ziel:** Die App lädt die Märkte künftig aus dem Backend statt aus den lokalen Fixtures und blendet den Bereich per Feature-Flag ein/aus.

Grundlagen:

- Backend-Vertrag: `backend/CONSTITUTION.md` §5.9 (Weihnachtsmärkte) und Abschnitt „Feature-Flags (Produkt)“
- Das Backend hinterlegt das Flag nur – es blockiert auf Basis des Flags **nichts**. Die App entscheidet über die Anzeige, genau wie bei Community/Kids-Spots.

---

## 1. API-Vertrag

Alle Endpunkte erfordern `Authorization: Bearer <FirebaseIdToken>` (auch anonym). Antworten kommen im globalen Envelope:

```json
{ "data": <Rückgabewert>, "timestamp": "<ISO-Zeit Berlin>" }
```

Der Client arbeitet mit `response.data`.

### 1.1 Märkte lesen

```http
GET /christmas-markets
```

Alle Märkte, serverseitig sortiert nach `startDate` aufsteigend (Märkte ohne Datum ans Ende, danach Name A–Z) und 15 Minuten gecacht. Kein Paging, keine Filter-Parameter – Ortsfilter/-Gruppierung erfolgt clientseitig über das Feld `city`.

```http
GET /christmas-markets/:id
```

Einzelner Markt, sonst **404**.

**Response-Objekt je Markt:**

```json
{
  "id": "nuernberg-christkindlesmarkt",
  "name": "Nürnberger Christkindlesmarkt",
  "city": "Nürnberg",
  "place": "Hauptmarkt",
  "description": "Einer der ältesten und bekanntesten Weihnachtsmärkte Deutschlands: …",
  "periodLabel": "27.11. – 24.12.2026",
  "openingHoursLabel": "Täglich 10–21 Uhr, Heiligabend bis 14 Uhr",
  "startDate": "2026-11-27T00:00:00.000Z",
  "endDate": "2026-12-24T00:00:00.000Z",
  "latitude": 49.4541,
  "longitude": 11.0773,
  "imageUrl": "https://www.frankentourismus.de/data/thumbs/img/7995361_weihnachtsmarkt-panorama.jpg",
  "highlights": ["Christkind", "Zwetschgenmännle", "Kinderweihnacht"],
  "createdAt": "2026-11-07T05:30:00.000Z",
  "updatedAt": "2026-11-07T05:30:00.000Z",
  "createdBy": "<Firebase-UID>",
  "updatedBy": "<Firebase-UID>"
}
```

Hinweise zum Mapping auf die vorhandene Freezed-Entität `ChristmasMarket`:

- Der Response-Vertrag ist feldgleich zur Entität; `startDate`/`endDate` sind ISO-Strings oder fehlen (`null` in Firestore), `imageUrl` ist optional, `highlights` ist im Zweifel `[]`.
- `periodLabel`/`openingHoursLabel` sind reine Anzeige-Strings – Status-Logik („Öffnet in x Tagen“) rechnet die App wie bisher aus `startDate`/`endDate` (`christmas_market_status.dart` bleibt unverändert).
- **Defensiv parsen:** Unbekannte/zusätzliche Felder ignorieren (u. a. `createdAt`, `updatedBy`), schlägt das Parsen eines einzelnen Marktes fehl, diesen überspringen und loggen statt die ganze Liste zu verwerfen.
- Fehlerverhalten wie bei den übrigen Lese-Adaptern: Fehler loggen und leere Liste zurückliefern, keine Exception in die UI durchreichen.

### 1.2 Feature-Flag lesen

```http
GET /feature-flags/christmas-markets
```

oder im Sammel-Endpunkt `GET /feature-flags` unter dem Schlüssel `christmasMarkets`:

```json
{
  "id": "christmas_markets_settings",
  "isEnabled": false,
  "updatedAt": "…",
  "updatedBy": "…"
}
```

Regeln:

1. `isEnabled === true` → Hero/Einstieg und Routen zum Weihnachtsmärkte-Bereich anzeigen.
2. `isEnabled === false` oder Flag nicht ladbar → Bereich ausblenden (Fallback: **aus**, heutiger Zustand ohne Hero).
3. Deep-Links/Detailziele dürfen auch bei deaktiviertem Flag funktionieren; nur die Einstiege hängen am Flag.
4. Das Markten-CRUD des Backends ist vom Flag unberührt – die Redaktion kann im Admin-FE bei deaktiviertem Flag bereits pflegen.

### 1.3 Schreiben (nur Admin-FE, nicht App)

| Methode | Pfad | Rollen |
|---|---|---|
| POST | `/christmas-markets` | `admin`, `super_admin` |
| PATCH | `/christmas-markets/:id` | `admin`, `super_admin` |
| DELETE | `/christmas-markets/:id` | `admin`, `super_admin` |

Beim Anlegen ist `id` optional als Slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`); eine belegte ID ergibt **409**. Der Service prüft `endDate >= startDate` (sonst **400**, auch bei PATCH gegen die zusammengeführten Werte).

## 2. Fehlerfälle

| Fall | Verhalten der App |
|---|---|
| `GET /christmas-markets` Netzwerkfehler / 5xx | Fehler loggen, leere Liste bzw. Leerzustand mit Retry anzeigen |
| `GET /christmas-markets/:id` → 404 | „Markt nicht gefunden“ mit Zurück-Button, kein Absturz (Markt kann gelöscht worden sein) |
| Flag-Endpunkt nicht erreichbar | Fallback `christmasMarkets = false` (Bereich ausgeblendet) |
| 401 (Token abgelaufen) | Bestehende Auth-Erneuerung; keine Sonderbehandlung |

## 3. Datenstand und Rollout

1. Backend (API + Flag, Default **deaktiviert**) ist live-tauglich, das CRUD ist flag-unabhängig pflegbar.
2. Seed mit den 10 Prototyp-Märkten (Saison 2026) läuft auf Citylife (`npm run seed:christmas-markets:citylife -- --write`); Zeitraum-/Öffnungszeiten sind Beispielwerte des Prototyps und werden redaktionell geprüft, die Bildrechte der Nürnberg-`imageUrl` sind vor Livegang zu klären.
3. App stellt von Fixtures auf die API um (Fixtures nur noch als Test-/Preview-Daten).
4. Erst nach dem App-Rollout aktiviert die Redaktion `christmas-markets` im Admin-FE – die App zeigt dann Hero/Routen, ohne dass ein weiteres Release nötig ist.
