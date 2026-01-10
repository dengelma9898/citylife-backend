# LLM-basierte Event-Extraktion - API-Dokumentation

## Übersicht

Die LLM-basierte Event-Extraktion nutzt Mistral Small 3.2 für semantische Extraktion von Events aus HTML-Seiten. Bei Fehlern oder leeren Ergebnissen erfolgt automatisch ein Fallback zu den bestehenden Puppeteer-Scrapers.

## Endpoints

### 1. Events von URL extrahieren

**POST** `/events/scrape/llm`

Extrahiert Events von einer beliebigen URL mit LLM-basierter Extraktion.

#### Request Body

```json
{
  "url": "https://eventfinder.de/nuernberg",
  "useFallback": true
}
```

**Parameter:**
- `url` (string, erforderlich): Die URL der Seite, von der Events extrahiert werden sollen
- `useFallback` (boolean, optional): Ob bei Fehlern auf Puppeteer-Scraper zurückgegriffen werden soll (Standard: `true`)

#### Response

```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Konzert im Park",
      "description": "Open-Air Konzert mit lokalen Bands",
      "location": {
        "address": "Wöhrder Wiese, Nürnberg",
        "latitude": 49.45,
        "longitude": 11.08
      },
      "dailyTimeSlots": [
        {
          "date": "2026-01-15",
          "from": "19:00",
          "to": "22:00"
        }
      ],
      "price": 15,
      "priceString": "15,00€",
      "categoryId": "konzert",
      "titleImageUrl": "https://example.com/image.jpg",
      "imageUrls": ["https://example.com/image1.jpg"],
      "website": "https://example.com/event",
      "createdAt": "2026-01-09T10:00:00.000Z",
      "updatedAt": "2026-01-09T10:00:00.000Z"
    }
  ],
  "hasMorePages": false
}
```

**Response-Felder:**
- `events` (Event[]): Array von extrahierten Events
- `hasMorePages` (boolean): Gibt an, ob weitere Seiten verfügbar sind (aktuell immer `false`)
- `nextPageUrl` (string, optional): URL der nächsten Seite (aktuell nicht verwendet)

#### Fehlerbehandlung

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "URL ist erforderlich"
}
```

**500 Internal Server Error:**
Bei Fehlern in der LLM-Extraktion wird automatisch auf Puppeteer-Fallback zurückgegriffen (falls `useFallback: true`). Falls auch dieser fehlschlägt, wird ein Fehler zurückgegeben.

### 2. Kosten-Statistiken abrufen

**GET** `/events/scrape/llm/costs`

Gibt die monatlichen Kosten für LLM-Extraktion zurück.

#### Response

```json
{
  "costs": {
    "mistral-small-latest": 0.15
  },
  "total": 0.15,
  "currency": "USD"
}
```

**Response-Felder:**
- `costs` (object): Kosten pro Modell in USD
  - Schlüssel: Modell-Name (z.B. `mistral-small-latest`)
  - Wert: Gesamtkosten in USD für den aktuellen Monat
- `total` (number): Gesamtkosten aller Modelle in USD
- `currency` (string): Währung (immer "USD")

**Hinweis:** Daten werden im Memory gespeichert und gehen bei Neustart des Servers verloren. Bei leerem Zustand:
```json
{
  "costs": {},
  "total": 0,
  "currency": "USD"
}
```

### 3. Token-Verbrauch abrufen

**GET** `/events/scrape/llm/tokens`

Gibt den Token-Verbrauch für LLM-Extraktion zurück.

#### Response

```json
{
  "usage": {
    "mistral-small-latest": {
      "input": 500000,
      "output": 100000,
      "total": 600000
    }
  },
  "totals": {
    "input": 500000,
    "output": 100000,
    "total": 600000
  }
}
```

**Response-Felder:**
- `usage` (object): Token-Verbrauch pro Modell
  - Schlüssel: Modell-Name
  - `input`: Anzahl der Input-Tokens
  - `output`: Anzahl der Output-Tokens
  - `total`: Gesamt-Tokens (input + output)
- `totals` (object): Gesamtsummen aller Modelle
  - `input`: Gesamt Input-Tokens
  - `output`: Gesamt Output-Tokens
  - `total`: Gesamt-Tokens

**Hinweis:** Daten werden im Memory gespeichert und gehen bei Neustart des Servers verloren. Bei leerem Zustand:
```json
{
  "usage": {},
  "totals": {
    "input": 0,
    "output": 0,
    "total": 0
  }
}
```

## Beispiel-Integrationen

### cURL

```bash
# Events extrahieren
curl -X POST http://localhost:3000/events/scrape/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "url": "https://eventfinder.de/nuernberg",
    "useFallback": true
  }'

# Kosten abrufen
curl -X GET http://localhost:3000/events/scrape/llm/costs \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Token-Verbrauch abrufen
curl -X GET http://localhost:3000/events/scrape/llm/tokens \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### JavaScript/TypeScript (Fetch API)

```typescript
async function scrapeEventsWithLlm(url: string, useFallback = true) {
  const response = await fetch('http://localhost:3000/events/scrape/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify({
      url,
      useFallback,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result.events;
}

// Verwendung
const events = await scrapeEventsWithLlm('https://eventfinder.de/nuernberg');
console.log(`Gefunden: ${events.length} Events`);
```

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

async function scrapeEventsWithLlm(url: string, useFallback = true) {
  const response = await axios.post(
    'http://localhost:3000/events/scrape/llm',
    {
      url,
      useFallback,
    },
    {
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
    },
  );

  return response.data.events;
}

// Kosten abrufen
async function getLlmCosts() {
  const response = await axios.get('http://localhost:3000/events/scrape/llm/costs', {
    headers: {
      Authorization: `Bearer ${firebaseToken}`,
    },
  });

  return response.data;
}
```

## Authentifizierung

**WICHTIG:** Alle Endpoints erfordern eine Firebase-Authentifizierung.

Der `Authorization`-Header muss ein gültiges Firebase-ID-Token enthalten:

```
Authorization: Bearer <firebase-id-token>
```

## Verhalten

### LLM-Extraktion (Primär)

1. HTML-Inhalt wird von der angegebenen URL geladen
2. HTML wird bereinigt (Scripts, Styles, Kommentare entfernt)
3. Mistral Small 3.2 extrahiert Events semantisch aus dem HTML
4. Events werden normalisiert (IDs, Timestamps hinzugefügt)
5. Ergebnis wird zurückgegeben

### Puppeteer-Fallback

Der Fallback wird aktiviert, wenn:
- LLM-Extraktion einen Fehler wirft
- LLM-Extraktion keine Events findet
- `useFallback: true` gesetzt ist (Standard)

Der Fallback versucht automatisch, den passenden Puppeteer-Scraper basierend auf der Domain zu identifizieren:
- `eventfinder.de` → EventFinderScraper
- `curt.de` → CurtScraper
- `rausgegangen.de` → RausgegangenScraper
- `eventbrite.de` / `eventbrite.com` → EventbriteScraper

## Kosten

Die Kosten werden automatisch getrackt:
- **Mistral Small 3.2:** $0.075 pro 1M Input-Tokens, $0.2 pro 1M Output-Tokens
- Bei realistischer Nutzung (50 Seiten/Woche): ~$0.15-0.30 pro Monat

Kosten können über `/events/scrape/llm/costs` abgerufen werden.

## Rate Limits

- Mistral API: Standard-Rate-Limits der Mistral API
- Puppeteer-Fallback: Keine Limits (lokale Ausführung)

## Best Practices

1. **URL-Validierung:** Stellen Sie sicher, dass die URL gültig und erreichbar ist
2. **Error-Handling:** Implementieren Sie Retry-Logik für temporäre Fehler
3. **Kosten-Monitoring:** Überwachen Sie regelmäßig die Kosten über `/events/scrape/llm/costs`
4. **Fallback nutzen:** Lassen Sie `useFallback: true` aktiviert für maximale Zuverlässigkeit
5. **Batch-Processing:** Für mehrere URLs, rufen Sie den Endpoint sequenziell auf (keine Batch-API vorhanden)

## Bekannte Einschränkungen

- Keine Batch-API für mehrere URLs gleichzeitig
- `hasMorePages` ist aktuell immer `false` (Pagination nicht implementiert)
- Geocoding von Adressen zu Koordinaten erfolgt nicht automatisch (latitude/longitude können 0 sein)
- Kategorien werden auf bekannte Werte validiert, unbekannte werden zu `default` gemappt

## Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Logs für detaillierte Fehlermeldungen
2. Überprüfen Sie die Kosten- und Token-Statistiken
3. Testen Sie mit `useFallback: false` um LLM-spezifische Fehler zu isolieren
