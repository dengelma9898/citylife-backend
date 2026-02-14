# Taxistandorte – Admin Frontend Integration

## Übersicht

Verwaltung der Taxistandorte im Admin-Frontend: Feature aktivieren, Standorte anlegen/bearbeiten/löschen, Telefon-Klick-Statistiken einsehen.

## Base URL

```
/taxi-stands
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
  "startDate": "2026-03-01"
}
```

### PUT `feature-status`
Feature aktivieren/deaktivieren.

**Request Body:**
```json
{
  "isFeatureActive": true,
  "startDate": "2026-03-01"
}
```

---

## 2. Taxistandorte CRUD

### POST `/` – Standort anlegen

**Request Body:**
```json
{
  "address": "Bahnhofplatz 1, 90402 Nürnberg",
  "latitude": 49.4465,
  "longitude": 11.0828,
  "phoneNumber": "+49 911 19410",
  "title": "Hauptbahnhof Nürnberg",
  "description": "Vor dem Haupteingang",
  "numberOfTaxis": 10
}
```

Pflichtfelder: `address`, `latitude`, `longitude`, `phoneNumber`

Optionale Felder: `title`, `description`, `numberOfTaxis`

### PATCH `/:id` – Standort bearbeiten

Alle Felder optional. Nur geänderte Felder senden.

```json
{
  "title": "Neuer Titel",
  "numberOfTaxis": 15
}
```

### DELETE `/:id` – Standort löschen

204 No Content bei Erfolg.

---

## 3. Telefon-Klick-Tracking

Die Telefon-Klicks werden automatisch getrackt, wenn User die Telefonnummer in der App anklicken. Im Admin-Frontend können die Klick-Timestamps pro Standort eingesehen werden.

Das Feld `phoneClickTimestamps` enthält ein Array von ISO-Timestamps.

---

## Response-Format Taxistandort

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

## Empfohlene UI-Bereiche

1. **Einstellungen:** Feature aktiv/inaktiv, Startdatum
2. **Taxistandorte-Liste:** Tabellenansicht mit Aktionen (Bearbeiten, Löschen)
3. **Standort anlegen/bearbeiten:** Formular mit Adress-/Koordinaten-Eingabe und Telefonnummer
4. **Klick-Statistiken:** Anzahl der Telefon-Klicks pro Standort (aus `phoneClickTimestamps.length`)
