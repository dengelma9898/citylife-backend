# Taxistandorte – App Integration

## Übersicht

Taxistandorte (Sammelplätze) auf der Karte anzeigen, Details öffnen, Telefonnummer anrufen. Verfügbar für alle authentifizierten User (inkl. anonyme und Business User).

## Base URL

```
/taxi-stands
```

Alle Requests benötigen Authentication (Bearer Token).

---

## 1. Feature-Flag prüfen

Vor Anzeige des Features:

### GET `feature-status`

**Response:**
```json
{
  "isFeatureActive": true,
  "startDate": "2026-03-01"
}
```

- `isFeatureActive: false` → Feature komplett ausblenden
- Bei `true` ggf. `startDate` berücksichtigen (Feature erst ab diesem Datum sichtbar)

---

## 2. Taxistandorte laden

### GET `/`

Alle Taxistandorte laden. Nur verfügbar, wenn Feature aktiv ist (sonst 503).

**Response:** Array von Taxistandort-Objekten (siehe unten).

---

## 3. Einzelnen Taxistandort laden

### GET `/:id`

Details für eine Detail-Ansicht oder Bottom Sheet.

---

## 4. Telefon-Klick tracken

### POST `/:id/phone-click`

Wenn ein User die Telefonnummer anklickt, einen Request senden um den Klick zu tracken.

**Response:** Aktualisiertes Taxistandort-Objekt.

**Hinweis:** Dieser Endpoint ist für alle User zugänglich. Es wird kein User-Bezug hergestellt – es wird nur der Zeitpunkt gespeichert.

---

## Taxistandort-Objekt (für Karte und Details)

```json
{
  "id": "string",
  "title": "string?",
  "description": "string?",
  "numberOfTaxis": 10,
  "phoneNumber": "+49 911 19410",
  "location": {
    "address": "Bahnhofplatz 1, 90402 Nürnberg",
    "latitude": 49.4465,
    "longitude": 11.0828
  },
  "phoneClickTimestamps": [
    "2026-01-15T10:30:00.000Z",
    "2026-01-16T14:22:00.000Z"
  ],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Karten-Integration

- **Koordinaten:** `location.latitude`, `location.longitude` für Marker
- **Marker-Tap:** Detailansicht/Bottom Sheet mit `title`, `description`, `phoneNumber`, `numberOfTaxis`
- **Telefon-Button:** Beim Klick auf die Telefonnummer `POST /:id/phone-click` senden, dann Telefon-App öffnen

---

## Ablauf-Vorschlag

1. Beim App-Start: `feature-status` laden → bei `false` Feature ausblenden
2. Bei Öffnen der Karte/Feature: `GET /` für alle Taxistandorte
3. Marker auf der Karte anzeigen
4. Bei Marker-Tap: Detailansicht mit Telefonnummer, Adresse, Beschreibung
5. Bei Telefon-Klick: `POST /:id/phone-click` senden, dann `tel:` URL öffnen
