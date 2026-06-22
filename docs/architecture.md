# Backend-Architektur

## ADR-001: Pragmatisches Modul-Layout (2026-06-22)

**Status:** Angenommen  
**Kontext:** Ponytail-Audit Phase 08 – das Repo nutzt zwei parallele Muster (hexagonal/DDD vs. flache Services). `docs/architecture.md` beschrieb bisher ausschließlich Hexagonal als Soll, obwohl viele Module bereits flach implementiert sind.

### Entscheidungs-Checkliste

| Frage | Antwort | Konsequenz |
|-------|---------|------------|
| Plan für zweites Persistence-Backend? | **Nein** (nur Firebase/Firestore) | Repository-Abstraktion bringt keinen unmittelbaren Nutzen |
| Testbarkeit via Repository-Mocks harte Anforderung? | **Nein** | Services werden mit gemocktem `FirebaseService` getestet (wie `events`, `news`) |
| Team akzeptiert `docs/architecture.md`-Update? | **Ja** | Dieses Dokument ist die verbindliche Referenz |

### Gewählte Option: **A – Pragmatisch (alles flach)**

Neue und migrierte Module folgen dem flachen NestJS-Modul-Pattern. Repository-Interfaces, DI-Tokens und Entity-Klassen mit `create`/`fromProps`/`update`/`toJSON` werden schrittweise entfernt (Ponytail-Audit Phase 09/10).

**Abgelehnte Alternativen:**

- **Option B (strikt hexagonal):** Einheitlich, aber ~5.000 LOC Mehraufwand ohne zweites Backend.
- **Option C (Hybrid dauerhaft):** Zwei Patterns parallel pflegen – höherer Wartungsaufwand ohne klaren Exit.

### Konsequenzen für Ponytail-Audit Phase 09/10

| Phase | Aktion | Status nach Entscheidung |
|-------|--------|--------------------------|
| **09 – Repositories flatten** | Firebase-Repositories und Domain-Repository-Interfaces in Services konsolidieren | **Ausführen** (modulweise, klein zuerst) |
| **10 – Entities flatten** | Entity-Klassen durch `interface`-Types ersetzen | **Ausführen** (nach Phase 09 pro Modul) |
| **11 – Business Value Objects** | Unverändert abhängig von Phase 10 | Wie in Plan 11 beschrieben |

**Regeln bis Migration abgeschlossen:**

- **Neue Module:** ausschließlich flaches Pattern (siehe unten).
- **Bestehende DDD-Module:** nicht erweitern (keine neuen Repositories/Entities); bei Änderungen bevorzugt im Rahmen von Phase 09/10 migrieren.

---

## Ziel-Modul-Layout (Soll)

Jedes Feature-Modul unter `src/<feature>/`:

```
src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts          # oder application/controllers/
├── <feature>.service.ts             # oder application/services/
├── interfaces/                      # Plain TypeScript interfaces
├── dto/
├── enums/                           # optional
└── *.spec.ts                        # Unit-Tests neben der Implementierung
```

### Service-Pattern

Services injizieren `FirebaseService` (und ggf. weitere Nest-Services) direkt und kapseln Firestore-Zugriff:

```typescript
@Injectable()
export class EventsService {
  private readonly collection = 'events';

  constructor(private readonly firebaseService: FirebaseService) {}

  async findById(id: string): Promise<Event> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) throw new NotFoundException();
    return { id: doc.id, ...doc.data() } as Event;
  }
}
```

Referenz-Implementierungen: `src/events/events.service.ts`, `src/news/news.service.ts`.

### Types statt Entity-Klassen

```typescript
// interfaces/event.interface.ts
export interface Event {
  id: string;
  title: string;
  createdAt: Date;
  // ...
}
```

Kein `create`/`fromProps`/`update`/`toJSON`-Boilerplate. Updates als Plain Objects; vor dem Speichern `removeUndefined` aus `src/firebase/firebase-mapper.util.ts` verwenden.

### Tests

- Externe Abhängigkeiten mocken (`FirebaseService`, andere Services).
- Arrange-Act-Assert; Erfolgs-, Fehler- und Randfälle abdecken.
- Bei read-heavy Endpoints: Caching wie in `src/event-categories/services/event-categories.service.ts` (siehe `docs/configuration-values.md`).

### Caching (Pflicht für neue read-heavy Module)

Siehe `.cursorrules` – globaler `CACHE_MANAGER`, TTL in `docs/configuration-values.md`, Invalidierung bei Writes, Tests für Hit/Miss/Invalidierung.

---

## Ist-Zustand: DDD-Module (werden migriert)

Diese Module nutzen noch `domain/`, `application/`, `infrastructure/` mit Repository-Interfaces und Entity-Klassen. Sie bleiben funktionsfähig, werden aber in Phase 09/10 auf das flache Pattern umgestellt:

| Modul | Merkmale |
|-------|----------|
| `businesses` | Entity + Firebase-Repository |
| `business-categories` | Entity + Firebase-Repository |
| `direct-chats` | Mehrere Repositories, komplex |
| `curated-spots` | Entity + mehrere Repositories |
| `taxi-stands` | Entity + Firebase-Repository |
| `chatrooms` | Entity + Firebase-Repository |
| `job-offers`, `job-offer-categories` | Entity + Firebase-Repository |
| `feature-requests`, `contact`, `legal-documents` | Entity + Firebase-Repository |
| `app-settings`, `app-versions` | Entity + Firebase-Repository |
| `advent-calendar`, `easter-egg-hunt` | Entity + Firebase-Repository |
| `pass-stats` | Entity + Firebase-Repository |

## Ist-Zustand: Flache Module (Referenz)

Bereits im Ziel-Pattern: `events`, `news`, `keywords`, `blog-posts`, `special-polls`, `users`, `event-categories`, u. a.

---

## Firebase-Persistenz

### Datenkonvertierung

1. **Keine `undefined`-Werte** – vor dem Speichern `removeUndefined` aus `src/firebase/firebase-mapper.util.ts` nutzen (nicht pro Repository duplizieren).

2. **Timestamps** – Firebase `Timestamp` bei Reads nach `Date` konvertieren:
   ```typescript
   createdAt: data.createdAt?.toDate?.() || data.createdAt,
   ```

3. **IDs** – Firestore-Dokument-ID als `id`-Feld im zurückgegebenen Interface führen.

### Best Practices

- Validierung in DTOs (class-validator) und ggf. in Services.
- Batch-Operationen und Transaktionen für mehrere Schreibvorgänge.
- Firebase-Fehler loggen; Domain-spezifische Nest-Exceptions (`NotFoundException`, `BadRequestException`) nach außen.
- Indizes für häufig gefilterte Felder in Firestore pflegen.

---

## Querverweise

- Ponytail-Audit Übersicht: `.cursor/plans/ponytail-audit-2026-06-20-overview.plan.md`
- Phase 09 (Repositories): `.cursor/plans/ponytail-audit-09-flatten-repositories.plan.md`
- Phase 10 (Entities): `.cursor/plans/ponytail-audit-10-flatten-entities.plan.md`
- Firebase-Mapper: `src/firebase/firebase-mapper.util.ts`
- Coding-Standards: `.cursorrules`
