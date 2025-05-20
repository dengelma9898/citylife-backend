# Hexagonale Architektur

## Überblick

Die hexagonale Architektur (auch bekannt als Ports and Adapters) ist ein Architekturmuster, das die Anwendung in drei Hauptschichten unterteilt:

1. **Domain Layer (Innere Schicht)**
   - Enthält die Geschäftslogik und Domain-Modelle
   - Unabhängig von externen Abhängigkeiten
   - Definiert Ports (Interfaces) für die Kommunikation mit der Außenwelt

2. **Application Layer (Mittlere Schicht)**
   - Implementiert die Anwendungslogik
   - Nutzt die Domain-Modelle
   - Koordiniert die Interaktion zwischen Domain und Infrastruktur

3. **Infrastructure Layer (Äußere Schicht)**
   - Implementiert die Adapter für externe Systeme
   - Enthält die konkreten Implementierungen der Ports
   - Behandelt Persistenz, externe APIs, etc.

## Struktur

```
src/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── services/
├── application/
│   ├── ports/
│   ├── services/
│   └── use-cases/
└── infrastructure/
    ├── persistence/
    ├── external/
    └── adapters/
```

## Vorteile

- **Unabhängigkeit**: Die Domain-Logik ist unabhängig von externen Abhängigkeiten
- **Testbarkeit**: Einfaches Testen durch klare Grenzen und Abhängigkeiten
- **Flexibilität**: Einfacher Austausch von Implementierungen (z.B. Persistenz)
- **Wartbarkeit**: Klare Struktur und Verantwortlichkeiten

## Implementierungsrichtlinien

1. **Domain Layer**
   - Reine Geschäftslogik
   - Keine Abhängigkeiten zu externen Bibliotheken
   - Definiert Repository-Interfaces

2. **Application Layer**
   - Implementiert Use Cases
   - Nutzt Domain-Modelle
   - Definiert Ports für externe Dienste

3. **Infrastructure Layer**
   - Implementiert Repository-Interfaces
   - Handhabt externe Kommunikation
   - Enthält konkrete Implementierungen

## Firebase Persistenz

### Datenkonvertierung

Bei der Arbeit mit Firebase müssen folgende Regeln beachtet werden:

1. **Keine undefined-Werte**
   - Firebase akzeptiert keine `undefined`-Werte
   - Alle `undefined`-Werte müssen in `null` umgewandelt werden
   - Implementierung in `removeUndefined`-Methode:
   ```typescript
   private removeUndefined(obj: any): any {
     if (obj === null || obj === undefined) {
       return null;
     }
     if (Array.isArray(obj)) {
       return obj.map(item => this.removeUndefined(item));
     }
     if (typeof obj === 'object') {
       const result: any = {};
       for (const key in obj) {
         result[key] = this.removeUndefined(obj[key]);
       }
       return result;
     }
     return obj;
   }
   ```

2. **Klassen zu Plain Objects**
   - Firebase kann keine Klassen-Instanzen speichern
   - Domain-Entities müssen in Plain Objects umgewandelt werden
   - Implementierung in `toPlainObject`-Methode:
   ```typescript
   private toPlainObject(entity: any) {
     const { id, ...data } = entity;
     return this.removeUndefined(data);
   }
   ```

3. **Timestamps**
   - Firebase verwendet eigene Timestamp-Objekte
   - Konvertierung zwischen Firebase Timestamps und JavaScript Dates
   - Implementierung in `toJobOfferProps`-Methode:
   ```typescript
   private toJobOfferProps(data: any, id: string) {
     return {
       id,
       ...data,
       createdAt: data.createdAt?.toDate?.() || data.createdAt,
       updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
     };
   }
   ```

### Best Practices

1. **Repository-Implementierung**
   - Immer `removeUndefined` vor dem Speichern verwenden
   - Klare Trennung zwischen Domain-Entities und Firebase-Daten
   - Validierung der Daten vor dem Speichern

2. **Fehlerbehandlung**
   - Firebase-spezifische Fehler abfangen und in Domain-Fehler umwandeln
   - Logging für Debugging-Zwecke
   - Transaktionsmanagement für komplexe Operationen

3. **Performance**
   - Batch-Operationen für mehrere Dokumente
   - Caching-Strategien implementieren
   - Indizes für häufig abgefragte Felder

## Beispiel: Job Offers

```typescript
// Domain Layer
interface JobOfferRepository {
  findById(id: string): Promise<JobOffer>;
  findAll(): Promise<JobOffer[]>;
  save(jobOffer: JobOffer): Promise<void>;
}

// Application Layer
class JobOfferService {
  constructor(private repository: JobOfferRepository) {}
  
  async getJobOffer(id: string): Promise<JobOffer> {
    return this.repository.findById(id);
  }
}

// Infrastructure Layer
class FirebaseJobOfferRepository implements JobOfferRepository {
  async findById(id: string): Promise<JobOffer> {
    // Firebase-spezifische Implementierung
  }
}
``` 