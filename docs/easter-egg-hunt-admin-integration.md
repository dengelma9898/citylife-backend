# Ostereiersuche – Admin Frontend Integration

## Übersicht

Verwaltung der Ostereiersuche im Admin-Frontend: Feature aktivieren, Ostereier anlegen/bearbeiten, Gewinner auslosen, Statistiken einsehen.

## Base URL

```
/easter-egg-hunt
```

Alle Anfragen erfordern Authentication (Bearer Token) und Admin/Super-Admin-Rolle.

---

## 1. Feature-Status

### GET `feature-status`
Status abrufen.

**Response:**
```json
{
  "isFeatureActive": true,
  "startDate": "2026-03-28"
}
```

### PUT `feature-status`
Feature aktivieren/deaktivieren.

**Request Body:**
```json
{
  "isFeatureActive": true,
  "startDate": "2026-03-28"
}
```

---

## 2. Ostereier CRUD

### POST `eggs` – Osterei anlegen

**Request Body:**
```json
{
  "title": "Goldenes Ei am Hauptmarkt",
  "description": "Versteckt hinter dem Schönen Brunnen",
  "prizeDescription": "2x Kinogutscheine",
  "numberOfWinners": 1,
  "startDate": "2026-03-28",
  "endDate": "2026-04-06",
  "address": "Hauptmarkt 1, 90403 Nürnberg",
  "latitude": 49.4539,
  "longitude": 11.0775
}
```

**Tipp:** Partner-Standorte als Vorauswahl nutzen – Adressen/Koordinaten von `/businesses` laden und übernehmen.

### PATCH `eggs/:id` – Osterei bearbeiten

Alle Felder optional. Nur geänderte Felder senden.

### DELETE `eggs/:id` – Osterei löschen

204 No Content bei Erfolg.

---

## 3. Bild-Upload

### POST `eggs/:id/image`
Multipart-Form-Data: `file` mit dem Bild.

Altes Bild wird bei neuem Upload ersetzt.

---

## 4. Gewinner

### PATCH `eggs/:id/winners` – Gewinner manuell hinzufügen
```json
{ "userId": "firebase-user-id" }
```

### POST `eggs/:id/draw-winners` – Gewinner zufällig auslosen
Wählt bis zu `numberOfWinners` aus den Teilnehmern aus (ohne bereits vorhandene Gewinner).

---

## 5. Teilnehmer (Admin)

### GET `eggs/:id/participants`
Liefert die Liste der User-IDs der Teilnehmer.

---

## 6. Statistiken

### GET `statistics`

**Response:**
```json
{
  "totalEggs": 10,
  "activeEggs": 7,
  "totalParticipants": 142,
  "totalWinners": 3,
  "participantsPerEgg": [
    {
      "eggId": "abc-123",
      "title": "Goldenes Ei am Hauptmarkt",
      "participantCount": 23,
      "winnerCount": 1
    }
  ]
}
```

---

## Response-Format Osterei

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
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**hasParticipated:** Im Admin-Kontext i. d. R. `false` (Admin ist selten Teilnehmer).

---

## Empfohlene UI-Bereiche

1. **Einstellungen:** Feature aktiv/inaktiv, Startdatum
2. **Ostereier-Liste:** Tabellenansicht mit Aktionen (Bearbeiten, Löschen, Gewinner, Teilnehmer)
3. **Osterei anlegen/bearbeiten:** Formular mit Adress-/Koordinaten-Eingabe (ggf. Partner-Vorauswahl)
4. **Dashboard:** Statistik-Karten mit Kennzahlen
