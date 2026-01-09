# Event-Scraping Analyse & Empfehlungen

**Erstellt:** 09. Januar 2026  
**Branch:** `feature/scraping-analysis-improvement`  
**Status:** Analyse-Phase

---

## 📋 Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Aktuelle Implementierung](#aktuelle-implementierung)
3. [Identifizierte Probleme](#identifizierte-probleme)
4. [Alternative Ansätze](#alternative-ansätze)
5. [Empfehlung](#empfehlung)
6. [Implementierungsplan](#implementierungsplan)

---

## 🎯 Executive Summary

Die aktuelle Scraping-Implementierung basiert auf **Puppeteer** mit hartcodierten CSS-Selektoren für 5 Event-Quellen. Dieser Ansatz ist **fragil und wartungsintensiv**, da HTML-Strukturänderungen der Zielseiten sofortige Code-Anpassungen erfordern.

**Empfehlung:** Hybrid-Ansatz mit:
1. **Primär:** LLM-basierte Extraktion (OpenAI GPT-4o mit Structured Outputs)
2. **Sekundär:** Offizielle APIs wo verfügbar (Eventbrite API, Eventfrog API)
3. **Fallback:** Optimierte Puppeteer-Scraper als Backup

**Geschätzte Kosten:** ~€10-30/Monat bei moderater Nutzung

---

## 📊 Aktuelle Implementierung

### Architektur-Übersicht

```
src/events/infrastructure/scraping/
├── base-scraper.interface.ts    # BaseScraper Interface & ScraperType Enum
├── scraper.service.ts           # Zentraler Service für alle Scraper
├── scraper-factory.ts           # Factory Pattern für Scraper-Erstellung
├── puppeteer.config.ts          # Puppeteer Browser-Konfiguration
├── eventfinder-scraper.ts       # eventfinder.de Scraper
├── curt-scraper.ts              # curt.de Scraper
├── rausgegangen-scraper.ts      # rausgegangen.de Scraper
├── eventbrite-scraper.ts        # eventbrite.de Scraper
└── parks-scraper.ts             # Parks-Events Scraper
```

### Implementierte Scraper

| Scraper | URL | Selektoren | Status |
|---------|-----|------------|--------|
| EventFinder | eventfinder.de/nuernberg | `.card.event`, `.titel`, `.datetime-mobile` | ⚠️ Fragil |
| CURT | curt.de/termine/84 | `.event`, `.time`, `.dat`, `.title a` | ⚠️ Fragil |
| Rausgegangen | rausgegangen.de/nurnberg | `#horizontal-scroll`, `.event-tile-text` | ⚠️ Fragil |
| Eventbrite | eventbrite.de | `.event-card`, `.event-card-details` | ⚠️ Fragil |
| Parks | - | - | 🔍 Zu prüfen |

### Technische Details

**Puppeteer-Konfiguration:**
- Headless Chrome mit Mobile-Viewport (375x812)
- Timeout: 60 Sekunden
- User-Agent: iPhone iOS 14
- 47 Chrome-Args für Performance-Optimierung

**Datenextraktion:**
- CSS-Selektoren mit Fallbacks (z.B. `.time, .uhrzeit`)
- Datumskonvertierung von deutschem Format zu ISO
- Cookie-Banner-Handling pro Seite

---

## ⚠️ Identifizierte Probleme

### 1. **Hohe Fragilität (Kritisch)**

Die Selektoren sind extrem spezifisch und brechen bei kleinsten HTML-Änderungen:

```typescript
// eventfinder-scraper.ts - Beispiel fragiler Selektoren
const title = element.querySelector('.titel')?.textContent?.trim() || '';
const datetimeContainer = element.querySelector('.datetime-mobile');
const locationText = element.querySelector('.card-body-footer')?.textContent?.trim() || '';
```

**Problem:** Wenn eventfinder.de `.titel` zu `.event-title` ändert, bricht der Scraper.

### 2. **Inkonsistente Datenqualität**

- Fehlende Beschreibungen (Eventbrite: `description: ''`)
- Unvollständige Geodaten (`latitude: 0, longitude: 0`)
- Inkonsistente Zeitbehandlung (`to: ''` vs `to: fromTime`)
- Fehlende Bilder/URLs

### 3. **Performance-Probleme**

- Puppeteer-Browserinstanz pro Request
- Sequentielle Datumsbereichsverarbeitung
- Hoher Ressourcenverbrauch (RAM/CPU)

### 4. **Wartungsaufwand**

- 5 separate Scraper mit jeweils eigener Logik
- Keine zentrale Fehlerbehandlung
- Duplizierter Code für Datumsparsing

### 5. **Skalierbarkeit**

- Neue Quellen erfordern komplette Scraper-Implementierung
- Keine dynamische Anpassung an Seitenänderungen
- Rate-Limiting nicht implementiert

---

## 🔄 Alternative Ansätze

### Option A: LLM-basierte Extraktion (Empfohlen)

**Technologie:** OpenAI GPT-4o mit Structured Outputs

**Konzept:**
```typescript
// Beispiel: LLM-basierte Event-Extraktion
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "event_extraction",
      schema: eventSchema
    }
  },
  messages: [{
    role: "user",
    content: `Extrahiere alle Events aus folgendem HTML. 
              Gib nur valides JSON zurück.\n\n${pageContent}`
  }]
});
```

**Vorteile:**
- ✅ Robust gegen HTML-Strukturänderungen
- ✅ Versteht Kontext und semantische Bedeutung
- ✅ Einheitliche Implementierung für alle Quellen
- ✅ Automatische Normalisierung der Daten
- ✅ 100% valide JSON-Outputs garantiert

**Nachteile:**
- ❌ API-Kosten (~$0.01-0.03 pro Seite)
- ❌ Latenz (~2-5s pro Anfrage)
- ❌ Token-Limits bei großen Seiten

**Geschätzte Kosten:**
- GPT-4o: ~$2.50/1M input tokens, ~$10/1M output tokens
- Bei 100 Seiten/Tag: ~$5-15/Monat

### Option B: Event-APIs nutzen

**Verfügbare APIs:**

| API | Kostenlos | Umfang | Relevanz |
|-----|-----------|--------|----------|
| **Eventbrite API** | Ja (Rate Limits) | Weltweit | ⭐⭐⭐ Hoch |
| **Eventfrog API** | Ja | CH/DE | ⭐⭐ Mittel |
| **AllEvents API** | Freemium | 200M+ Events | ⭐⭐ Mittel |
| **PredictHQ** | Freemium | Aggregator | ⭐ Niedrig |

**Eventbrite API Beispiel:**
```typescript
// GET /events/search/
const response = await fetch(
  'https://www.eventbriteapi.com/v3/events/search/?location.address=Nürnberg',
  { headers: { 'Authorization': `Bearer ${EVENTBRITE_TOKEN}` }}
);
```

**Vorteile:**
- ✅ Strukturierte, zuverlässige Daten
- ✅ Keine Wartung bei Webseiten-Änderungen
- ✅ Offizielle Bilder, Beschreibungen, Geodaten
- ✅ Pagination und Filtering eingebaut

**Nachteile:**
- ❌ Begrenzte Quellen (nur API-Partner)
- ❌ Rate Limits
- ❌ Nicht alle lokalen Events verfügbar

### Option C: Scraping-as-a-Service

**Anbieter:**

| Service | Free Tier | Preis | Features |
|---------|-----------|-------|----------|
| **Firecrawl** | 500 Credits | $16/Mo | AI-Extraktion, LLM-ready |
| **Browserless** | 6h/Mo | $99/Mo | Puppeteer-Hosting |
| **ScrapingBee** | 1000 Credits | $49/Mo | Residential Proxies |
| **Crawl4AI** | Open Source | Kostenlos | Self-hosted |

**Firecrawl Beispiel:**
```typescript
import Firecrawl from '@mendable/firecrawl-js';

const app = new Firecrawl({ apiKey: 'fc-xxx' });
const result = await app.scrapeUrl('https://eventfinder.de/nuernberg', {
  formats: ['extract'],
  extract: {
    schema: eventSchema,
    systemPrompt: 'Extrahiere Event-Daten in deutscher Sprache'
  }
});
```

**Vorteile:**
- ✅ Managed Infrastructure
- ✅ AI-basierte Extraktion integriert
- ✅ Proxy-Rotation, CAPTCHA-Handling

**Nachteile:**
- ❌ Laufende Kosten
- ❌ Abhängigkeit von Drittanbieter

### Option D: Optimierter aktueller Ansatz

**Verbesserungen am bestehenden System:**

1. **Resiliente Selektoren:**
```typescript
// Fallback-Ketten für mehr Robustheit
const title = element.querySelector('.titel, .title, h2, h3, [class*="title"]')?.textContent;
```

2. **Zentrale Konfiguration:**
```typescript
// Selektoren in Config-Dateien auslagern
const scraperConfig = {
  eventfinder: {
    selectors: {
      container: '.card.event',
      title: '.titel',
      // ...
    }
  }
};
```

3. **Health-Checks & Alerts:**
```typescript
// Automatische Erkennung von Strukturänderungen
if (events.length === 0 && page.content().includes('event')) {
  this.notifyStructureChange('eventfinder');
}
```

---

## ✅ Empfehlung: Hybrid-Ansatz

### Strategie

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin-Oberfläche (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ URL eingeben │→ │ Quelle wählen│→ │ Events prüfen/import │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Scraping Service                      │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ 1. API      │ → │ 2. LLM      │ → │ 3. Fallback         │  │
│  │ (Eventbrite)│    │ (GPT-4o)   │    │ (Puppeteer)         │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         ↓                  ↓                    ↓                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Unified Event Normalizer                        ││
│  │  - Deduplizierung                                            ││
│  │  - Geocoding (Google Maps API)                               ││
│  │  - Kategorie-Mapping                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Priorisierung der Quellen

1. **Eventbrite API** (Kostenlos, strukturiert, ~40% der Events)
2. **LLM-Extraktion** (Flexibel, ~50% der Events)
3. **Puppeteer Fallback** (Spezialfälle, ~10% der Events)

### Kostenanalyse (Monatlich)

| Komponente | Nutzung | Kosten |
|------------|---------|--------|
| OpenAI GPT-4o | ~200 Seiten | ~$10-15 |
| Eventbrite API | Kostenlos | $0 |
| Puppeteer (Serverless) | ~50 Seiten | ~$2-5 |
| Google Geocoding | ~500 Adressen | ~$2-5 |
| **Gesamt** | | **~$15-25/Monat** |

### Technische Implementierung

**Neuer LLM-basierter Scraper:**

```typescript
// src/events/infrastructure/scraping/llm-scraper.service.ts
@Injectable()
export class LlmScraperService {
  constructor(
    private readonly openaiService: OpenAiService,
    private readonly puppeteerManager: PuppeteerManager,
  ) {}

  async extractEventsFromUrl(url: string): Promise<Event[]> {
    // 1. HTML abrufen (mit Puppeteer für JS-rendered Seiten)
    const html = await this.fetchPageContent(url);
    
    // 2. HTML bereinigen (Script/Style Tags entfernen)
    const cleanedHtml = this.cleanHtml(html);
    
    // 3. LLM-Extraktion mit strukturiertem Output
    const events = await this.openaiService.extractStructured<Event[]>({
      model: 'gpt-4o',
      systemPrompt: EVENT_EXTRACTION_PROMPT,
      content: cleanedHtml,
      schema: eventArraySchema,
    });
    
    // 4. Nachbearbeitung (Geocoding, Kategorie-Mapping)
    return this.normalizeEvents(events);
  }
}
```

**Event-Extraktions-Prompt:**

```typescript
const EVENT_EXTRACTION_PROMPT = `
Du bist ein Experte für die Extraktion von Event-Daten aus HTML.

Analysiere das HTML und extrahiere ALLE Events mit folgenden Feldern:
- title: Titel des Events
- description: Beschreibung (falls vorhanden)
- location: Adresse/Veranstaltungsort
- date: Datum im Format YYYY-MM-DD
- startTime: Startzeit im Format HH:mm (falls vorhanden)
- endTime: Endzeit im Format HH:mm (falls vorhanden)
- price: Preis als Zahl oder null
- imageUrl: Bild-URL (falls vorhanden)
- sourceUrl: Link zum Event (falls vorhanden)

Wichtige Regeln:
1. Extrahiere nur tatsächliche Events, keine Werbung
2. Konvertiere deutsche Datumsformate zu ISO
3. Füge fehlende Jahreszahlen hinzu (aktuelles Jahr)
4. Setze leere Felder auf null, nicht auf leere Strings
`;
```

---

## 📅 Implementierungsplan

### Phase 1: Fundament (1-2 Wochen)

- [ ] OpenAI Service integrieren
- [ ] LLM-Scraper-Service implementieren
- [ ] Event-Schema für Structured Outputs definieren
- [ ] HTML-Bereinigungs-Utility erstellen

### Phase 2: API-Integration (1 Woche)

- [ ] Eventbrite API Client implementieren
- [ ] OAuth2-Flow für Eventbrite
- [ ] API-Response zu Event-Mapping

### Phase 3: Admin-Frontend (1-2 Wochen)

- [ ] URL-Eingabe-Formular
- [ ] Quellen-Auswahl (Auto-Detect)
- [ ] Event-Vorschau mit Bearbeitungsmöglichkeit
- [ ] Batch-Import-Funktion

### Phase 4: Optimierung (1 Woche)

- [ ] Caching für wiederkehrende URLs
- [ ] Rate-Limiting implementieren
- [ ] Fehler-Monitoring und Alerts
- [ ] A/B-Testing LLM vs. Puppeteer

---

## 📝 Fazit

Der aktuelle Puppeteer-basierte Ansatz ist funktional, aber **nicht nachhaltig**. Die empfohlene Hybrid-Lösung bietet:

1. **Bessere Zuverlässigkeit** durch LLM-basierte Extraktion
2. **Geringere Wartung** durch semantisches Verständnis
3. **Höhere Datenqualität** durch Normalisierung
4. **Moderate Kosten** (~€15-25/Monat)

Der wichtigste Schritt ist die **Integration des Admin-Frontends** mit dem Backend, um manuelle Überprüfung und Korrekturen vor dem Import zu ermöglichen – unabhängig vom gewählten Extraktionsansatz.

---

## 🔗 Referenzen

- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [Eventbrite API Dokumentation](https://www.eventbrite.com/platform/api)
- [Firecrawl AI Extraction](https://firecrawl.dev)
- [Puppeteer Dokumentation](https://pptr.dev)
