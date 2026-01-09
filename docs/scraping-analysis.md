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

**Empfehlung:** LLM-basierte Extraktion mit Mistral Small 3.2 (europäisches Modell):

1. **Primär:** Mistral Small 3.2 (europäisches Modell, sehr günstig)
2. **Fallback:** Bestehende Puppeteer-Scraper als Backup

**Geschätzte Kosten:** ~€0.75/Monat (bei 50 Seiten/Woche)

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

| Modell | Input-Preis | Output-Preis | Structured Output | Herkunft | Empfehlung |
|--------|-------------|--------------|-------------------|----------|------------|
| **Mistral Small 3.2** | $0.075/1M | $0.20/1M | ✅ JSON Mode | 🇪🇺 Europa | ⭐ **Empfohlen** |
| **Gemini Flash 2.0** | $0.10/1M | $0.40/1M | ✅ Ja | 🇺🇸 USA | ⭐ Alternative |
| **DeepSeek-V3** | $0.27/1M | $1.10/1M | ✅ Ja | 🇨🇳 China | ⚠️ Teurer |
| **GPT-4o-mini** | $0.15/1M | $0.60/1M | ❌ Nein | 🇺🇸 USA | ⚠️ Kein Structured Output |
| **GPT-4o** | $2.50/1M | $10/1M | ✅ Ja | 🇺🇸 USA | 💰 Zu teuer |
| **Claude Haiku** | $1.00/1M | $5.00/1M | ✅ Ja | 🇺🇸 USA | 💰 Teuer |

#### Kostenberechnung (50 Seiten/Woche = ~200 Seiten/Monat)

**Annahmen:** 
- ~50.000 Input-Tokens pro Seite (bereinigtes HTML)
- ~2.000 Output-Tokens pro Seite
- **Monatlich:** 200 Seiten × 50.000 = 10M Input-Tokens, 200 × 2.000 = 0.4M Output-Tokens

| Modell | Input-Kosten/Monat | Output-Kosten/Monat | **Gesamt/Monat** | **Gesamt/Jahr** |
|--------|-------------------|---------------------|------------------|-----------------|
| **Mistral Small 3.2** | $0.75 | $0.08 | **~$0.83** | **~$10** |
| **Gemini Flash 2.0** | $1.00 | $0.16 | **~$1.16** | **~$14** |
| **DeepSeek-V3** | $2.70 | $0.44 | **~$3.14** | **~$38** |
| **GPT-4o** | $25.00 | $4.00 | **~$29** ❌ | **~$348** ❌ |

---

### Ansatz 1: Mistral Small 3.2 (Empfohlen - Europäisches Modell)

**Warum Mistral Small 3.2?**
- ✅ **Europäisches Modell** (DSGVO-konform, Datenschutz)
- ✅ **Sehr günstig** (~$0.83/Monat bei 50 Seiten/Woche)
- ✅ JSON Mode für strukturierte Ausgaben
- ✅ OpenAI-kompatible API (einfache Integration)
- ✅ Gute Qualität für strukturierte Extraktion
- ✅ Verfügbar via DeepInfra oder direkt von Mistral AI

**Implementierung:**

```typescript
// src/events/infrastructure/llm/mistral-extractor.service.ts
import OpenAI from 'openai';

@Injectable()
export class MistralExtractorService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(MistralExtractorService.name);

  constructor() {
    // Mistral AI API (oder DeepInfra als Alternative)
    this.client = new OpenAI({
      baseURL: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  async extractEvents(html: string): Promise<ExtractedEvent[]> {
    const cleanedHtml = HtmlCleaner.extractMainContent(html);
    
    const response = await this.client.chat.completions.create({
      model: 'mistral-small-latest', // oder 'mistral-small-2409'
      messages: [
        {
          role: 'system',
          content: EVENT_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extrahiere alle Events aus folgendem HTML:\n\n${cleanedHtml}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Deterministisch für strukturierte Daten
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Keine Antwort von Mistral API erhalten');
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed.events) ? parsed.events : parsed;
  }
}
```

**Alternative: DeepInfra (oft günstiger):**

```typescript
// Via DeepInfra (kann günstiger sein)
this.client = new OpenAI({
  baseURL: 'https://api.deepinfra.com/v1/openai',
  apiKey: process.env.DEEPINFRA_API_KEY,
});
// Modell: 'mistralai/Mistral-Small-2409'
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

### Ansatz 2: Gemini Flash 2.0 (Alternative mit Free Tier)

**Vorteile:**
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
    const cleanedHtml = HtmlCleaner.extractMainContent(html);
    
    const result = await this.model.generateContent([
      EVENT_EXTRACTION_PROMPT,
      cleanedHtml,
    ]);

    return JSON.parse(result.response.text());
  }
}
```

---

### Ansatz 3: Hybrid-Strategie (Empfohlen für Produktion)

Kombiniere mehrere Ansätze für optimale Kosten und Zuverlässigkeit:

```typescript
// src/events/infrastructure/llm/hybrid-extractor.service.ts
@Injectable()
export class HybridExtractorService {
  private readonly extractors: LlmExtractor[];
  private readonly logger = new Logger(HybridExtractorService.name);

  constructor(
    private readonly mistralExtractor: MistralExtractorService,
    private readonly geminiExtractor: GeminiExtractorService,
    private readonly puppeteerFallback: ScraperService,
  ) {
    // Priorisierte Reihenfolge: Mistral (europäisch, günstig) → Gemini (Free Tier) → Puppeteer
    this.extractors = [
      { name: 'mistral', service: mistralExtractor },
      { name: 'gemini', service: geminiExtractor },
    ];
  }

  async extractEvents(url: string): Promise<ExtractedEvent[]> {
    const html = await this.fetchHtml(url);

    // Versuche LLM-Extraktoren in Reihenfolge
    for (const extractor of this.extractors) {
      try {
        const events = await extractor.service.extractEvents(html);
        if (events && events.length > 0) {
          this.logger.log(`${extractor.name} erfolgreich: ${events.length} Events`);
          return events;
        }
      } catch (error) {
        this.logger.warn(`${extractor.name} fehlgeschlagen: ${error.message}`);
      }
    }

    // Fallback zu klassischem Scraper
    this.logger.log('Fallback zu Puppeteer-Scraper');
    const result = await this.puppeteerFallback.scrapeEventsFromUrl(url);
    return result.events;
  }

  private async fetchHtml(url: string): Promise<string> {
    // Nutze Puppeteer für JS-gerenderte Seiten
    const puppeteerManager = PuppeteerManager.getInstance();
    const page = await puppeteerManager.getPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    await page.close();
    return html;
  }
}
```

**Strategie-Matrix:**

| Szenario | Primär | Fallback 1 | Fallback 2 |
|----------|--------|------------|------------|
| **Empfohlen** | Mistral Small 3.2 | Gemini Flash (Free Tier) | Puppeteer |
| **Kostenoptimiert** | Mistral Small 3.2 | Puppeteer | - |
| **Qualitätsoptimiert** | Mistral Small 3.2 | Gemini Flash | Puppeteer |

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
  'mistral-small-latest': { input: 0.075, output: 0.20 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'deepseek-chat': { input: 0.27, output: 1.10 },
};
```

---

## 📅 Implementierungsplan

### Phase 1: LLM-Infrastruktur (1 Woche)

- [ ] `openai` Package installieren (für Mistral API)
- [ ] `MistralExtractorService` implementieren
- [ ] HTML-Cleaner entwickeln
- [ ] JSON-Schema für Events definieren
- [ ] Unit-Tests schreiben

### Phase 2: Integration & Fallback (1 Woche)

- [ ] `HybridExtractorService` implementieren
- [ ] Gemini als Fallback integrieren (optional)
- [ ] Fallback zu bestehenden Puppeteer-Scrapern einbauen
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
- [ ] Monitoring-Dashboard
- [ ] Kosten-Analyse und Optimierung

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

Der **LLM-basierte Ansatz mit Mistral Small 3.2** bietet:

1. **Robustheit** gegen HTML-Strukturänderungen
2. **Einheitliche Implementierung** für alle Quellen
3. **Sehr geringe Kosten** (~€0.75/Monat bei 50 Seiten/Woche)
4. **Europäisches Modell** (DSGVO-konform, Datenschutz)
5. **Zukunftssicher** durch semantisches Verständnis

**Kostenübersicht bei realistischer Nutzung (50 Seiten/Woche):**
- Mistral Small 3.2: **~€0.75/Monat** (~€10/Jahr)
- Gemini Flash 2.0: **~€1.16/Monat** (~€14/Jahr) - mit Free Tier möglicherweise kostenlos

Der bestehende Puppeteer-Ansatz bleibt als **Fallback** erhalten und wird nur aktiviert, wenn die LLM-Extraktion fehlschlägt.

---

## 🔗 Referenzen

- [Mistral AI API Dokumentation](https://docs.mistral.ai/)
- [Mistral JSON Mode](https://docs.mistral.ai/capabilities/structured_output/json_mode)
- [Mistral Pricing](https://mistral.ai/pricing/)
- [DeepInfra Mistral](https://deepinfra.com/mistralai/Mistral-Small-2409) (Alternative Hosting)
- [Gemini API Dokumentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
