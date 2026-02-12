# CSV Event Import - Client-Dokumentation

## Endpunkt

```
POST /events/import/csv
```

## Request

Der Endpunkt erwartet einen `multipart/form-data`-Upload mit einer CSV-Datei.

| Parameter | Typ    | Pflicht | Beschreibung                    |
|-----------|--------|---------|---------------------------------|
| `file`    | File   | Ja      | CSV-Datei (.csv, max. 5 MB)     |

### Beispiel (cURL)

```bash
curl -X POST https://api.example.com/events/import/csv \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@events.csv"
```

### Beispiel (JavaScript / fetch)

```javascript
const formData = new FormData();
formData.append('file', csvFile); // csvFile = File-Objekt aus <input type="file">

const response = await fetch('/events/import/csv', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
```

## CSV-Format

Die CSV-Datei muss folgende Spalten als Header-Zeile enthalten (exakte Schreibweise):

```
Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
```

| Spalte             | Pflicht | Format / Beispiel                                       |
|--------------------|---------|----------------------------------------------------------|
| Titel              | Ja      | Freitext                                                 |
| Beschreibung       | Nein    | Freitext                                                 |
| Startdatum         | Ja      | `YYYY-MM-DD` (z.B. `2026-02-09`)                        |
| Enddatum           | Nein    | `YYYY-MM-DD` (wenn leer, wird Startdatum verwendet)     |
| Startzeit          | Nein    | `HH:mm` (z.B. `19:45`)                                  |
| Endzeit            | Nein    | `HH:mm` (z.B. `22:00`)                                  |
| Veranstaltungsort  | Nein    | Freitext, z.B. `CLUB STEREO, Klaragasse 8, 90402 Nürnberg` |
| Kategorien         | Nein    | Freitext, wird automatisch gemappt (Fallback: `default`) |
| Preis              | Nein    | `Kostenlos`, `15`, `ab 10,00€` oder leer                |
| Tickets            | Nein    | `ja` / `nein` (oder leer)                                |
| E-Mail             | Nein    | Gültige E-Mail-Adresse                                   |
| Telefon            | Nein    | Telefonnummer                                            |
| Webseite           | Nein    | URL                                                      |
| Social Media       | Nein    | URL                                                      |
| Bild-URL           | Nein    | Wird aktuell nicht verarbeitet                           |
| Detail-URL         | Nein    | URL (wird als Webseite-Fallback verwendet)               |

## Response (HTTP 200)

Der Endpunkt gibt **immer** HTTP 200 zurueck, auch wenn einzelne Zeilen fehlschlagen. Der Import bricht nie vorzeitig ab.

```json
{
  "totalRows": 10,
  "successful": 7,
  "failed": 1,
  "skipped": 2,
  "results": [
    {
      "rowIndex": 1,
      "success": true,
      "eventId": "abc123",
      "errors": []
    },
    {
      "rowIndex": 2,
      "success": false,
      "skipped": true,
      "duplicateEventId": "xyz789",
      "errors": [
        {
          "rowIndex": 2,
          "field": "Titel",
          "message": "Event mit Titel 'Konzert XY' und Datum '2026-02-09' existiert bereits (ID: xyz789)",
          "value": "Konzert XY"
        }
      ]
    },
    {
      "rowIndex": 3,
      "success": false,
      "errors": [
        {
          "rowIndex": 3,
          "field": "Startdatum",
          "message": "Ungültiges Datumsformat: '09.02.2026'. Erwartet: YYYY-MM-DD",
          "value": "09.02.2026"
        }
      ]
    }
  ]
}
```

### Response-Felder

| Feld         | Typ     | Beschreibung                                       |
|--------------|---------|----------------------------------------------------|
| `totalRows`  | number  | Gesamtzahl der verarbeiteten CSV-Zeilen            |
| `successful` | number  | Anzahl erfolgreich erstellter Events               |
| `failed`     | number  | Anzahl fehlgeschlagener Zeilen                     |
| `skipped`    | number  | Anzahl uebersprungener Duplikate                   |
| `results`    | array   | Detailliertes Ergebnis pro Zeile (siehe unten)     |

### Ergebnis pro Zeile (`results[]`)

| Feld               | Typ     | Beschreibung                                        |
|--------------------|---------|-----------------------------------------------------|
| `rowIndex`         | number  | Zeilen-Index (1-basiert, Header nicht mitgezaehlt)  |
| `success`          | boolean | `true` wenn Event erstellt wurde                    |
| `eventId`          | string? | ID des erstellten Events (nur bei Erfolg)           |
| `skipped`          | boolean?| `true` wenn Zeile wegen Duplikat uebersprungen wurde |
| `duplicateEventId` | string? | ID des existierenden Events (nur bei Duplikat)      |
| `errors`           | array   | Liste der Fehler fuer diese Zeile                   |

### Fehler pro Zeile (`errors[]`)

| Feld       | Typ     | Beschreibung                            |
|------------|---------|-----------------------------------------|
| `rowIndex` | number  | Zeilen-Index                            |
| `field`    | string? | Betroffenes CSV-Feld (falls bekannt)    |
| `message`  | string  | Fehlermeldung                           |
| `value`    | any?    | Wert, der den Fehler verursacht hat     |

## Fehlerbehandlung (HTTP 400)

Bei ungueltigem Dateiformat gibt der Endpunkt HTTP 400 zurueck:

```json
{
  "statusCode": 400,
  "message": "Ungültiger Dateityp. Nur CSV-Dateien sind erlaubt (.csv)"
}
```

Moegliche 400-Fehler:
- Keine Datei hochgeladen
- Falscher Dateityp (nur `.csv` erlaubt)
- Datei zu gross (max. 5 MB)

## Client-seitige Auswertung

### Empfohlene Logik

```javascript
const result = await response.json();

if (!response.ok) {
  // HTTP 400: Datei-Validierungsfehler
  console.error('Upload fehlgeschlagen:', result.message);
  return;
}

// Zusammenfassung anzeigen
console.log(`Import abgeschlossen: ${result.successful}/${result.totalRows} erfolgreich`);

if (result.skipped > 0) {
  console.log(`${result.skipped} Duplikate uebersprungen`);
}

if (result.failed > 0) {
  console.warn(`${result.failed} Zeilen fehlgeschlagen`);

  // Fehlerdetails pro Zeile ausgeben
  const failedRows = result.results.filter(r => !r.success && !r.skipped);
  failedRows.forEach(row => {
    row.errors.forEach(err => {
      console.warn(`Zeile ${err.rowIndex}: [${err.field || 'allgemein'}] ${err.message}`);
    });
  });
}

// Duplikate separat auflisten
const duplicates = result.results.filter(r => r.skipped);
duplicates.forEach(row => {
  console.info(`Zeile ${row.rowIndex}: Duplikat (existierendes Event: ${row.duplicateEventId})`);
});
```

## Duplikaterkennung

Ein Event gilt als Duplikat, wenn **beide** Bedingungen erfuellt sind:
1. **Titel** stimmt ueberein (case-insensitive, Whitespace normalisiert)
2. Mindestens ein **Datum** aus den dailyTimeSlots stimmt ueberein

Duplikate werden nicht erstellt, sondern als `skipped` markiert.
