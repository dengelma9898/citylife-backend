# Ostereiersuche – App Integration

## Übersicht

Zeitlich begrenztes Gewinnspiel: Ostereier auf der Karte anzeigen, Details öffnen, Teilnahme. Nur für angemeldete User (mit UserProfile); anonyme User werden abgelehnt.

## Base URL

```
/easter-egg-hunt
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
  "startDate": "2026-03-28"
}
```

- `isFeatureActive: false` → Feature komplett ausblenden
- Bei `true` ggf. `startDate` berücksichtigen (Feature erst ab diesem Datum sichtbar)

---

## 2. Ostereier laden

### GET `eggs?activeOnly=true`
Nur aktuell gültige Eier (Standard).

### GET `eggs?activeOnly=false`
Alle Eier (falls benötigt).

**Response:** Array von Ostereiern (siehe unten).

---

## 3. Einzelnes Osterei laden

### GET `eggs/:id`
Details für eine Detail-Ansicht oder Bottom Sheet.

---

## 4. Teilnahme

### PATCH `eggs/:id/participate`
Teilnahme am Gewinnspiel für dieses Ei. Nur **user** und **admin**, keine **business_user**.

**401/403:** Anonymer User oder kein UserProfile → Hinweis zur Registrierung anzeigen.

---

## Osterei-Objekt (für Karte und Details)

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "imageUrl": "string?",
  "prizeDescription": "string?",
  "numberOfWinners": 1,
  "startDate": "2026-03-28",
  "endDate": "2026-04-06?",
  "location": {
    "address": "string",
    "latitude": 49.4539,
    "longitude": 11.0775
  },
  "participantCount": 12,
  "winnerCount": 0,
  "hasParticipated": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

**hasParticipated:** `true`, wenn der anfragende User bereits bei diesem Ei teilgenommen hat – für korrekte Anzeige von „Teilnehmen“ vs. „Bereits teilgenommen“.

---

## Karten-Integration

- **Koordinaten:** `location.latitude`, `location.longitude` für Marker
- **Marker-Tap:** Detailansicht/Bottom Sheet mit `title`, `description`, `imageUrl`, `prizeDescription`, `participantCount`
- **Teilnahme-Button:** Nur anzeigen, wenn Feature aktiv und Ei im Gültigkeitszeitraum

---

## Geofencing (client-seitig)

Die Nähe des Users wird nur im Client geprüft:

1. User-Position via GPS holen
2. Distanz zu `location.latitude`, `location.longitude` berechnen (z.B. Haversine)
3. Teilnahme-Button nur anzeigen, wenn Distanz unter Schwellwert (z.B. 100 m)

Das Backend prüft die Nähe nicht – es reicht, wenn der Client den Button nur bei ausreichender Nähe anzeigt.

---

## Ablauf-Vorschlag

1. Beim App-Start: `feature-status` laden → bei `false` Feature ausblenden
2. Bei Öffnen der Karte/Feature: `GET eggs?activeOnly=true`
3. Marker auf der Karte anzeigen
4. Bei Marker-Tap: Detailansicht mit `GET eggs/:id` oder bereits vorhandenen Daten
5. Bei Teilnahme-Klick: `PATCH eggs/:id/participate` – ggf. vorher Geofencing prüfen
