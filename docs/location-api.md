# Location API (HERE Geocoding / Reverse)

Kurzdokumentation der Endpunkte unter **`/location`**. Zugriff erfordert ein gültiges Firebase- **`Authorization: Bearer`**-Token (wie alle Routen).

## Antwort-Envelope

Wie überall im Backend packt der [`ResponseInterceptor`](../src/core/interceptors/response.interceptor.ts) die Nutzdaten ein:

```json
{ "data": <...>, "timestamp": "..." }
```

- **`/location/search`** liefert in `data` ein **JSON-Array** von Adress-Treffern (`LocationResult[]`).
- **`/location/reverse`** liefert in `data` **ein Objekt oder `null`** (ein `LocationResult` bzw. kein deutscher Treffer).

Shape eines Treffers entspricht einem HERE-`items[]`-Eintrag (u. a. `title`, `id`, `resultType`, `address`, `position` mit `lat`/`lng`) und ist damit mit `HereLocationResult.fromJson` auf der Flutter-Seite kompatibel.

## GET /location/search

| Query | Typ | Beschreibung |
|--------|-----|----------------|
| `query` | string (Pflicht) | Freitext-Adresssuchbegriff |

- Backend: HERE Geocode (`geocode.search.hereapi.com/v1/geocode`).
- Treffer sind auf Deutschland beschränkt (`in=countryCode:DEU` und Filter auf `countryCode` DE/DEU).

## GET /location/reverse

| Query | Typ | Beschreibung |
|--------|-----|----------------|
| `latitude` | number (Pflicht) | Breitengrad WGS84, −90 … 90 |
| `longitude` | number (Pflicht) | Längengrad WGS84, −180 … 180 |

- Backend: HERE Reverse Geocode (`revgeocode.search.hereapi.com/v1/revgeocode`), nur `at=latitude,longitude` und `apiKey` (gleiche Credentials wie Vorwärtssuche). **Kein** `in=countryCode:DEU` in diesem Request – HERE lässt `at` nicht mit diesem räumlichen Filter kombinieren und antwortet sonst mit **400**.
- In der HERE-Antwort wird der **beste** deutschlandkonforme Treffer gewählt (Filter auf `countryCode` DE/DEU); sonst ist `data` **`null`**.

### Hinweis für Clients (Pins vs. HERE)

Koordinaten, die ihr z. B. durch **Long-Press auf der Karte** setzt, sollten die **authoritative Quelle** für Persistenz bleiben (z. B. `CuratedSpotAddress.latitude` / `longitude` beim Spot-Anlegen). Nutzt Reverse-Geocoding vor allem zur **Vorbefüllung von Textfeldern** (Straße, PLZ, Stadt). Dadurch verschiebt sich die Kartenposition nicht, wenn HERE gegenüber dem gewählten Pin leicht abweicht.
