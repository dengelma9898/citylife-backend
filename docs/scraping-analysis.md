# Event-Scraping Analyse & Empfehlungen

**Erstellt:** 09. Januar 2026  
**Aktualisiert:** 09. Januar 2026  
**Branch:** `feature/scraping-analysis-improvement`  
**Status:** Analyse-Phase

---

## 📋 Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Aktuelle Implementierung](#aktuelle-implementierung)
3. [Identifizierte Probleme](#identifizierte-probleme)
4. [LLM-basierte Lösung (Empfohlen)](#llm-basierte-lösung-empfohlen)
5. [Implementierungsplan](#implementierungsplan)
6. [Abgelehnte Alternativen](#abgelehnte-alternativen)

---

## 🎯 Executive Summary

Die aktuelle Scraping-Implementierung basiert auf **Puppeteer** mit hartcodierten CSS-Selektoren für 5 Event-Quellen. Dieser Ansatz ist **fragil und wartungsintensiv**, da HTML-Strukturänderungen der Zielseiten sofortige Code-Anpassungen erfordern.

**Empfehlung:** LLM-basierte Extraktion mit gestaffeltem Modell-Ansatz:

1. **Primär:** LLM-basierte Extraktion (Gemini Flash 2.0 / DeepSeek-V3 / lokales Modell)
2. **Fallback:** Bestehende Puppeteer-Scraper als Backup

**Geschätzte Kosten:** €0-10/Monat (je nach Modellwahl)

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

## 🤖 LLM-basierte Lösung (Empfohlen)

### Konzept-Übersicht

Statt hartcodierter CSS-Selektoren nutzen wir LLMs zur semantischen Extraktion von Event-Daten aus HTML. Das LLM versteht den Kontext und kann Events unabhängig von der HTML-Struktur identifizieren.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin-Oberfläche (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ URL eingeben │→ │ Events laden │→ │ Events prüfen/import │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend LLM-Scraper Service                   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  1. HTML abrufen (Puppeteer für JS-gerenderte Seiten)       ││
│  │  2. HTML bereinigen (Scripts/Styles entfernen)               ││
│  │  3. LLM-Extraktion mit strukturiertem Output                 ││
│  │  4. Fallback zu klassischem Scraper bei Fehler               ││
│  └─────────────────────────────────────────────────────────────┘│
│         ↓                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Event Normalizer                                ││
│  │  - Deduplizierung                                            ││
│  │  - Geocoding (optional)                                      ││
│  │  - Kategorie-Mapping                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### LLM-Modell-Vergleich

| Modell | Input-Preis | Output-Preis | Structured Output | Empfehlung |
|--------|-------------|--------------|-------------------|------------|
| **Gemini Flash 2.0** | $0.10/1M | $0.40/1M | ✅ Ja | ⭐ **Beste Wahl** |
| **DeepSeek-V3** | $0.07-0.27/1M | $1.10/1M | ✅ Ja | ⭐ Sehr günstig |
| **Mistral Small 3.2** | $0.075/1M | $0.20/1M | ✅ JSON Mode | ⭐ Günstig |
| **GPT-4o-mini** | $0.15/1M | $0.60/1M | ❌ Nein | ⚠️ Kein Structured Output |
| **GPT-4o** | $2.50/1M | $10/1M | ✅ Ja | 💰 Teuer |
| **Ollama (lokal)** | Kostenlos | Kostenlos | ✅ Ja | 🖥️ Eigene Hardware |
| **Claude Haiku** | $1.00/1M | $5.00/1M | ✅ Ja | 💰 Mittlere Kosten |

#### Kostenberechnung (100 Seiten/Tag, ~30 Tage)

Annahmen: ~50.000 Input-Tokens pro Seite (bereinigtes HTML), ~2.000 Output-Tokens

| Modell | Input-Kosten/Monat | Output-Kosten/Monat | **Gesamt/Monat** |
|--------|-------------------|---------------------|------------------|
| **Gemini Flash 2.0** | $15.00 | $2.40 | **~$17** |
| **DeepSeek-V3** | $4.05-13.50 | $6.60 | **~$11-20** |
| **Mistral Small 3.2** | $11.25 | $1.20 | **~$12** |
| **Ollama (lokal)** | $0 | $0 | **$0** |
| **GPT-4o** | $375 | $60 | **$435** ❌ |

---

### Ansatz 1: Cloud-LLM mit Gemini Flash 2.0 (Empfohlen)

**Warum Gemini Flash 2.0?**
- ✅ **Kostenloser Tier verfügbar** (1.500 Requests/Tag, 1M Tokens/Minute)
- ✅ Natives Structured Output (JSON Schema)
- ✅ 1M Token Context Window
- ✅ Sehr schnelle Inferenz

**Implementierung:**

```typescript
// src/events/infrastructure/llm/gemini-extractor.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiExtractorService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EVENT_ARRAY_SCHEMA,
      },
    });
  }

  async extractEvents(html: string): Promise<ExtractedEvent[]> {
    const cleanedHtml = this.cleanHtml(html);
    
    const result = await this.model.generateContent([
      EVENT_EXTRACTION_PROMPT,
      cleanedHtml,
    ]);

    return JSON.parse(result.response.text());
  }

  private cleanHtml(html: string): string {
    // Entferne Scripts, Styles, Kommentare
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(header|footer|nav|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
```

**JSON Schema für Events:**

```typescript
const EVENT_ARRAY_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titel des Events' },
      description: { type: 'string', description: 'Beschreibung' },
      date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
      startTime: { type: 'string', description: 'Startzeit HH:mm' },
      endTime: { type: 'string', description: 'Endzeit HH:mm (optional)' },
      location: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
        },
      },
      price: { type: 'number', description: 'Preis in Euro oder null' },
      priceString: { type: 'string', description: 'Original-Preisangabe' },
      imageUrl: { type: 'string', description: 'Event-Bild URL' },
      sourceUrl: { type: 'string', description: 'Link zum Original-Event' },
      category: { type: 'string', description: 'Kategorie (Konzert, Party, etc.)' },
    },
    required: ['title', 'date'],
  },
};
```

---

### Ansatz 2: DeepSeek-V3 (Günstigste Cloud-Option)

**Vorteile:**
- ✅ Extrem günstig ($0.07-0.27/1M Input)
- ✅ Gute Qualität für strukturierte Extraktion
- ✅ OpenAI-kompatible API

**Implementierung:**

```typescript
// src/events/infrastructure/llm/deepseek-extractor.service.ts
import OpenAI from 'openai';

@Injectable()
export class DeepSeekExtractorService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  async extractEvents(html: string): Promise<ExtractedEvent[]> {
    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: EVENT_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extrahiere alle Events aus folgendem HTML:\n\n${this.cleanHtml(html)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content).events;
  }
}
```

---

### Ansatz 3: Lokales LLM mit Ollama (Kostenlos)

**Vorteile:**
- ✅ **Komplett kostenlos** (keine API-Kosten)
- ✅ Datenschutz (Daten verlassen Server nicht)
- ✅ Keine Rate-Limits
- ✅ Structured Output seit Dezember 2024

**Nachteile:**
- ❌ Erfordert GPU-Server (8-16GB VRAM empfohlen)
- ❌ Langsamere Inferenz als Cloud
- ❌ Selbst-Hosting erforderlich

**Empfohlene lokale Modelle:**

| Modell | VRAM | Qualität | Geschwindigkeit |
|--------|------|----------|-----------------|
| **Llama 3.2 3B** | 4GB | ⭐⭐ | Schnell |
| **Mistral 7B** | 8GB | ⭐⭐⭐ | Mittel |
| **Llama 3.1 8B** | 8GB | ⭐⭐⭐⭐ | Mittel |
| **Mixtral 8x7B** | 24GB | ⭐⭐⭐⭐⭐ | Langsam |

**Implementierung:**

```typescript
// src/events/infrastructure/llm/ollama-extractor.service.ts
import { Ollama } from 'ollama';

@Injectable()
export class OllamaExtractorService {
  private readonly ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    });
  }

  async extractEvents(html: string): Promise<ExtractedEvent[]> {
    const response = await this.ollama.chat({
      model: 'llama3.1:8b',
      messages: [
        {
          role: 'system',
          content: EVENT_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extrahiere alle Events:\n\n${this.cleanHtml(html)}`,
        },
      ],
      format: EVENT_ARRAY_SCHEMA,
      options: {
        temperature: 0,
      },
    });

    return JSON.parse(response.message.content);
  }
}
```

**Docker-Setup für Ollama:**

```yaml
# docker-compose.ollama.yml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

---

### Ansatz 4: Hybrid-Strategie (Empfohlen für Produktion)

Kombiniere mehrere Ansätze für optimale Kosten und Zuverlässigkeit:

```typescript
// src/events/infrastructure/llm/hybrid-extractor.service.ts
@Injectable()
export class HybridExtractorService {
  private readonly extractors: LlmExtractor[];

  constructor(
    private readonly geminiExtractor: GeminiExtractorService,
    private readonly ollamaExtractor: OllamaExtractorService,
    private readonly puppeteerFallback: ScraperService,
  ) {
    // Priorisierte Reihenfolge
    this.extractors = [
      { name: 'gemini', service: geminiExtractor },
      { name: 'ollama', service: ollamaExtractor },
    ];
  }

  async extractEvents(url: string): Promise<ExtractedEvent[]> {
    const html = await this.fetchHtml(url);

    // Versuche LLM-Extraktoren in Reihenfolge
    for (const extractor of this.extractors) {
      try {
        const events = await extractor.service.extractEvents(html);
        if (events.length > 0) {
          this.logger.log(`${extractor.name} erfolgreich: ${events.length} Events`);
          return events;
        }
      } catch (error) {
        this.logger.warn(`${extractor.name} fehlgeschlagen: ${error.message}`);
      }
    }

    // Fallback zu klassischem Scraper
    this.logger.log('Fallback zu Puppeteer-Scraper');
    return this.puppeteerFallback.scrapeEventsFromUrl(url);
  }
}
```

**Strategie-Matrix:**

| Szenario | Primär | Fallback 1 | Fallback 2 |
|----------|--------|------------|------------|
| **Kostenoptimiert** | Ollama (lokal) | Gemini Free Tier | Puppeteer |
| **Qualitätsoptimiert** | Gemini Flash | DeepSeek | Puppeteer |
| **Maximal günstig** | Ollama (lokal) | Puppeteer | - |

---

### Extraktions-Prompt (Optimiert für Event-Daten)

```typescript
const EVENT_EXTRACTION_SYSTEM_PROMPT = `
Du bist ein Experte für die Extraktion von Veranstaltungsdaten aus HTML.

AUFGABE:
Analysiere das HTML und extrahiere ALLE erkennbaren Events/Veranstaltungen.

REGELN:
1. Extrahiere nur echte Events, keine Werbung oder Navigation
2. Konvertiere deutsche Datumsformate zu ISO (YYYY-MM-DD)
3. Füge fehlendes Jahr hinzu (aktuelles Jahr: ${new Date().getFullYear()})
4. Zeiten im Format HH:mm
5. Preise als Zahl in Euro (0 für kostenlos, null wenn unbekannt)
6. Leere Felder als null, nicht als leere Strings
7. Absolute URLs für Bilder und Links

WICHTIGE HINWEISE:
- "Eintritt frei", "kostenlos", "free" → price: 0
- "ab X€", "X€ - Y€" → price: niedrigster Wert, priceString: Original
- Bei Datumsbereich: Erstelle separate Einträge pro Tag
- Kategorien: Konzert, Party, Theater, Ausstellung, Sport, Kinder, Sonstiges

Antworte NUR mit einem JSON-Array von Events.
`;
```

---

### HTML-Bereinigung (Wichtig für Token-Effizienz)

```typescript
// src/events/infrastructure/llm/html-cleaner.ts
export class HtmlCleaner {
  /**
   * Bereinigt HTML für LLM-Verarbeitung
   * Reduziert Token-Verbrauch um 60-80%
   */
  static clean(html: string): string {
    let cleaned = html;

    // 1. Entferne Script und Style Tags
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // 2. Entferne HTML-Kommentare
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // 3. Entferne irrelevante Bereiche
    cleaned = cleaned.replace(/<(header|footer|nav|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');

    // 4. Entferne Data-Attribute und Event-Handler
    cleaned = cleaned.replace(/\s(data-[a-z-]+|on[a-z]+)="[^"]*"/gi, '');

    // 5. Entferne leere Tags
    cleaned = cleaned.replace(/<(\w+)[^>]*>\s*<\/\1>/g, '');

    // 6. Komprimiere Whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 7. Entferne übermäßige Attribute
    cleaned = cleaned.replace(/\s(class|id|style)="[^"]*"/gi, (match, attr) => {
      // Behalte nur relevante Klassen
      if (attr === 'class' && /event|date|time|title|location|price/i.test(match)) {
        return match;
      }
      return '';
    });

    return cleaned.trim();
  }

  /**
   * Extrahiert nur den relevanten Content-Bereich
   */
  static extractMainContent(html: string): string {
    // Versuche main, article oder content div zu finden
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) return this.clean(mainMatch[1]);

    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) return this.clean(articleMatch[1]);

    // Fallback: Gesamtes HTML bereinigen
    return this.clean(html);
  }
}
```

---

### Kosten-Monitoring

```typescript
// src/events/infrastructure/llm/cost-tracker.service.ts
@Injectable()
export class CostTrackerService {
  private costs: Map<string, number> = new Map();

  trackUsage(model: string, inputTokens: number, outputTokens: number): void {
    const pricing = MODEL_PRICING[model];
    const cost = 
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    const current = this.costs.get(model) || 0;
    this.costs.set(model, current + cost);

    this.logger.log(`${model}: +$${cost.toFixed(4)} (Gesamt: $${(current + cost).toFixed(2)})`);
  }

  getMonthlyCosts(): Record<string, number> {
    return Object.fromEntries(this.costs);
  }
}

const MODEL_PRICING = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'mistral-small': { input: 0.075, output: 0.20 },
  'ollama': { input: 0, output: 0 },
};
```

---

## 📅 Implementierungsplan

### Phase 1: LLM-Infrastruktur (1 Woche)

- [ ] `@google/generative-ai` Package installieren
- [ ] `GeminiExtractorService` implementieren
- [ ] HTML-Cleaner entwickeln
- [ ] JSON-Schema für Events definieren
- [ ] Unit-Tests schreiben

### Phase 2: Integration & Fallback (1 Woche)

- [ ] `HybridExtractorService` implementieren
- [ ] Fallback zu bestehenden Scrapern einbauen
- [ ] Error-Handling und Retry-Logik
- [ ] Kosten-Tracking

### Phase 3: Admin-Frontend Integration (1-2 Wochen)

- [ ] API-Endpoint für URL-basierte Extraktion
- [ ] Event-Vorschau im Admin-Panel
- [ ] Manuelles Bearbeiten vor Import
- [ ] Batch-Import-Funktion

### Phase 4: Optimierung (1 Woche)

- [ ] Caching für wiederkehrende URLs
- [ ] Prompt-Optimierung basierend auf Ergebnissen
- [ ] Ollama-Setup als kostenfreie Alternative
- [ ] Monitoring-Dashboard

---

## ❌ Abgelehnte Alternativen

### 1. Event-APIs (Eventbrite, Eventfrog, etc.)

**Grund der Ablehnung:**
- Begrenzte Quellen: Nur Events von API-Partnern verfügbar
- Viele lokale Veranstalter nutzen keine dieser Plattformen
- Einschränkung auf wenige Anbieter entspricht nicht dem Ziel, viele verschiedene Quellen zu unterstützen

**Dokumentation:**
- Eventbrite API: Kostenlos, aber nur Eventbrite-Events
- Eventfrog API: Primär CH/DE, begrenzte Abdeckung
- AllEvents API: Aggregator, aber Freemium mit Limits

### 2. Scraping-as-a-Service (Firecrawl, Browserless, etc.)

**Grund der Ablehnung:**
- **Laufende Kosten** ab $16-99/Monat
- Abhängigkeit von Drittanbieter
- Keine Kostenkontrolle bei steigender Nutzung

**Preise (Stand Januar 2026):**
| Service | Free Tier | Paid |
|---------|-----------|------|
| Firecrawl | 500 Credits | $16+/Mo |
| Browserless | 6h/Mo | $99/Mo |
| ScrapingBee | 1000 Credits | $49/Mo |

### 3. Reines Puppeteer-Refactoring

**Grund der Ablehnung:**
- Löst das Grundproblem (Fragilität) nicht
- Weiterhin hoher Wartungsaufwand bei Strukturänderungen
- Keine semantische Intelligenz

**Aber:** Wird als Fallback beibehalten für Fälle, in denen LLM-Extraktion fehlschlägt.

---

## 📝 Fazit

Der **LLM-basierte Ansatz mit Gemini Flash 2.0** (oder Ollama für Kosten=0) bietet:

1. **Robustheit** gegen HTML-Strukturänderungen
2. **Einheitliche Implementierung** für alle Quellen
3. **Geringe Kosten** (~€10-15/Monat oder kostenlos mit Ollama)
4. **Zukunftssicher** durch semantisches Verständnis

Der bestehende Puppeteer-Ansatz bleibt als **Fallback** erhalten und wird nur aktiviert, wenn die LLM-Extraktion fehlschlägt.

---

## 🔗 Referenzen

- [Gemini API Dokumentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [DeepSeek API](https://api-docs.deepseek.com/)
- [Ollama Structured Outputs](https://ollama.com/blog/structured-outputs)
- [Mistral JSON Mode](https://docs.mistral.ai/capabilities/structured_output/json_mode)
