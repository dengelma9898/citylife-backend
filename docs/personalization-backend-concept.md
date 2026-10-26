# Backend-Architekturkonzept: Server-Driven Personalisierung & Profil-Steuerung

**Projekt:** Nürnbergspots Backend (NestJS / Firebase Firestore)  
**Datum:** 04. September 2026  
**Status:** Konzept ausgearbeitet  
**Scope:** `backend/src/users/`, `backend/src/events/`, `backend/src/businesses/`, Flutter App Integration (`lib/domains/personalization/`, `lib/presentation/features/profile/`)

---

## 1. Zielsetzung & Überblick

Bisher laufen die Filterung nach Favoriten sowie die Berechnung der „Für dich“-Matches (Kategorie-Affinitäten, Gewichtung von Präferenzen und Klick-Historie) **lokal im Speicher der Flutter-App**. 

Mit dem Anwachsen des Bestands auf **~3.900+ Events** skaliert dieser Client-Ansatz nicht mehr:
1. Der Client kann bei einer paginierten Event-Liste (`limit=25`) nicht lokal personalisieren, da er nicht weiß, welche Treffer auf Folgeseiten liegen.
2. `recentViews` verbleiben aktuell gerätegebunden in `SharedPreferences` und gehen bei Gerätewechsel verloren.

### Kernanforderungen an das Backend:
1. **Server-Driven Personalisierung:** Das Ranking und Filtern nach Favoriten und Relevanz („Für dich“) wird im Backend berechnet und paginiert ausgeliefert.
2. **Volle Profil-Kontrolle & Transparenz (DSGVO):** Der Nutzer kann im Profil der App jederzeit:
   - Seine Interessen (`preferences`) bearbeiten oder leeren.
   - Seine Historie (`recentViews`) einsehen und komplett löschen.
   - Seine Favoriten einsehen und mit einem Klick zurücksetzen.
   - Einen vollständigen Reset aller Personalisierungs-Signale durchführen.

---

## 2. Datenmodell-Erweiterungen (Firestore)

### 2.1 Erweiterung `UserProfile` (`src/users/interfaces/user-profile.interface.ts`)

```typescript
export interface RecentViewItem {
  target: 'business' | 'event';
  targetId: string;
  categoryKeys: string[];
  viewedAt: string; // ISO 8601 UTC
}

export interface UserProfile {
  // Bestehende Felder (email, userType, preferences, favoriteEventIds, favoriteBusinessIds etc.)
  
  /**
   * Kürzlich angesehene Spots und Events (max. 50 Einträge, Dedupe nach targetId).
   * Wird für das "Für dich"-Scoring herangezogen und kann vom User gelöscht werden.
   */
  recentViews?: RecentViewItem[];

  /**
   * Optional: Strukturierte Kategorie-IDs (Ablösung/Ergänzung von Freitext-Preferences)
   */
  preferredEventCategoryIds?: string[];
  preferredBusinessCategoryIds?: string[];
}
```

> **Hinweis zur Datenhaltung:** Ein flaches Array `recentViews` direkt im User-Dokument ist bei max. 50 Elementen (< 3 KB) performanter und kostengünstiger als eine Subcollection, da kein zusätzlicher Firestore-Read anfällt, wenn das Profil geladen wird.

---

## 3. Neue & erweiterte API-Endpunkte

### 3.1 Verlauf / Recent Views (`/users/:id/views`)

#### `POST /users/:id/views` (Aufruf tracken)
Wird von der App im Hintergrund aufgerufen, wenn ein Nutzer eine Partner- oder Event-Detailseite öffnet.
- **Guard:** `AuthGuard`, `verifyUserOwnershipOrSuperAdmin`
- **Request Body (`RecordViewDto`):**
  ```typescript
  export class RecordViewDto {
    @IsIn(['business', 'event'])
    public readonly target: 'business' | 'event';

    @IsString()
    @IsNotEmpty()
    public readonly targetId: string;

    @IsArray()
    @IsString({ each: true })
    public readonly categoryKeys: string[];
  }
  ```
- **Business-Logik (`UsersService.recordView`):**
  1. Eintrag an den Anfang des `recentViews`-Arrays schieben.
  2. Vorherige Einträge mit derselben `targetId` entfernen (Deduplizierung).
  3. Array auf die neuesten **50 Einträge** kappen.
  4. Cache `user-profile:${userId}` invalidieren.
- **Response:** `200 OK` `{ success: true, count: number }`

---

#### `GET /users/:id/views` (Verlauf abrufen)
Wird im Profil verwendet, um dem Nutzer Transparenz über seine gespeicherten Klicks zu geben.
- **Response:** `RecentViewItem[]`

---

#### `DELETE /users/:id/views` (Verlauf zurücksetzen)
Löscht das `recentViews`-Array vollständig aus dem Profil.
- **Business-Logik:**
  ```typescript
  await db.collection('users').doc(userId).update({
    recentViews: admin.firestore.FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  });
  ```
- **Response:** `200 OK` `{ message: 'View history cleared successfully' }`

---

### 3.2 Favoriten-Reset (`/users/:id/favorites`)

Bestehend sind bereits `PATCH .../favorites/events/:eventId` und `PATCH .../favorites/businesses/:businessId`. Ergänzt werden Sammel-Löschungen:

#### `DELETE /users/:id/favorites/events`
Leert alle Event-Favoriten des Nutzers (`favoriteEventIds = []`).

#### `DELETE /users/:id/favorites/businesses`
Leert alle Partner-Favoriten des Nutzers (`favoriteBusinessIds = []`).

#### `DELETE /users/:id/personalization/reset` (Komplett-Reset)
Setzt alle Personalisierungsparameter auf Werkseinstellungen zurück:
```typescript
await db.collection('users').doc(userId).update({
  preferences: [],
  recentViews: admin.firestore.FieldValue.delete(),
  updatedAt: new Date().toISOString(),
});
```

---

### 3.3 Erweiterung der Event-API (`GET /events`)

Das bestehende `EventsListQueryDto` (`src/events/dto/events-list-query.dto.ts`) wird erweitert:

```typescript
export class EventsListQueryDto extends EventsListFilterDto {
  // Bestehende Felder (page, limit, sort, order, q, category, status, date etc.)

  /**
   * Filtert ausschließlich nach den Favoriten des anfragenden Users.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  public readonly favoritesOnly?: boolean;

  /**
   * Sortiert und filtert nach dem Relevanz-Score des Users ("Für dich").
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  public readonly forYou?: boolean;
}
```

#### Ablauf in `EventsListQueryService.queryEvents`:
```typescript
public async queryEvents(
  query: EventsListQueryDto,
  actorUid?: string,
  isAdmin: boolean = false,
): Promise<EventsListResponse> {
  let allEvents = await this.loadAllEvents();
  
  // 1. Favoriten-Filter
  if (query.favoritesOnly) {
    if (!actorUid) throw new UnauthorizedException('Login required for favorites');
    const userProfile = await this.usersService.getUserProfile(actorUid);
    const favoriteIds = new Set(userProfile?.favoriteEventIds ?? []);
    allEvents = allEvents.filter(e => favoriteIds.has(e.id));
  }

  // 2. "Für dich" Personalisierungs-Scoring & Sortierung
  if (query.forYou) {
    if (!actorUid) throw new UnauthorizedException('Login required for personalization');
    const userProfile = await this.usersService.getUserProfile(actorUid);
    allEvents = this.personalizationScorer.scoreAndSortEvents(allEvents, userProfile);
  } else {
    // Standard-Sortierung (startDate, updatedAt etc.)
    allEvents = sortEvents(allEvents, query.sort ?? 'startDate', query.order ?? 'desc');
  }

  // 3. Paginierung
  const paginated = paginateEvents(allEvents, query.page ?? 1, query.limit ?? 50);
  return {
    data: paginated.data,
    meta: paginated.meta,
  };
}
```

---

### 3.4 Erweiterung der Partner-API (`GET /businesses`)

Analog zu den Events erhält der `BusinessesController` / `BusinessesService` Unterstützung für:
- `GET /businesses?favoritesOnly=true`
- `GET /businesses?forYou=true`

---

## 4. Relevanz- & Scoring-Algorithmus im Backend

Um 1:1 die erprobte Logik der Flutter-App abzubilden, wird ein dedizierter Service `PersonalizationScorerService` (`src/core/personalization/`) erstellt:

```typescript
@Injectable()
export class PersonalizationScorerService {
  private static readonly WEIGHTS = {
    favorite: 100,
    favoriteCategory: 50,
    preferenceCategory: 40,
    recentViewCategory: 30,
  };

  public scoreAndSortEvents(events: Event[], profile: UserProfile): Event[] {
    const favoriteIds = new Set(profile.favoriteEventIds ?? []);
    const preferences = (profile.preferences ?? []).map(p => this.normalize(p));
    
    // Kategorien aus favorisierten Events ableiten
    const favoriteCategoryIds = new Set(
      events.filter(e => favoriteIds.has(e.id)).map(e => e.categoryId).filter(Boolean)
    );

    // Kürzlich gesehene Kategorien
    const recentCategoryKeys = new Set(
      (profile.recentViews ?? [])
        .filter(v => v.target === 'event')
        .flatMap(v => v.categoryKeys)
    );

    const scored = events.map(event => {
      let score = 0;

      // 1. Ist Favorit
      if (favoriteIds.has(event.id)) {
        score += PersonalizationScorerService.WEIGHTS.favorite;
      }

      // 2. Kategorie eines Favoriten
      if (event.categoryId && favoriteCategoryIds.has(event.categoryId) && !favoriteIds.has(event.id)) {
        score += PersonalizationScorerService.WEIGHTS.favoriteCategory;
      }

      // 3. Kategorie aus Klick-Historie
      const catKey = this.normalize(event.category?.name ?? event.categoryId ?? '');
      if (recentCategoryKeys.has(catKey)) {
        score += PersonalizationScorerService.WEIGHTS.recentViewCategory;
      }

      // 4. Kategorie aus User-Präferenzen
      if (preferences.some(p => catKey.includes(p))) {
        score += PersonalizationScorerService.WEIGHTS.preferenceCategory;
      }

      return { event, score };
    });

    // Nur Treffer mit Match (score > 0), sortiert nach Score desc, danach nach Datum asc
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.event.startDate.localeCompare(b.event.startDate))
      .map(item => item.event);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  }
}
```

---

## 5. Caching- & Performance-Strategie

1. **Events & Businesses In-Memory Cache:**
   - Der bestehende In-Memory Cache `EVENTS_LIST_CACHE_KEY` in `EventsListQueryService` lädt alle Events einmalig für den TTL-Zeitraum in den Speicher.
   - Das Scoring läuft auf den im RAM gecachten Event-Referenzen ab – für 3.900 Objekte dauert das Array-Filtering und Scoring in V8/Node.js **unter 5 ms**.
2. **User Profile Cache:**
   - `UsersService` nutzt bereits `CACHE_PREFIX = 'user-profile:'` mit 5 Minuten TTL.
   - **Wichtig:** Beim Aufruf von `POST /users/:id/views` oder `DELETE /users/:id/views` muss dieser User-Cache gezielt geleert werden (`this.cacheManager.del(...)`).

---

## 6. Umsetzungs-Roadmap

| Phase | Aufgabe | Betroffene Backend-Dateien |
|---|---|---|
| **Phase 1: Datenmodell & View-History** | • `RecentViewItem` in `UserProfile` ergänzen<br>• `RecordViewDto` anlegen<br>• `POST`, `GET`, `DELETE /users/:id/views` in `UsersController` & `UsersService` | `src/users/interfaces/user-profile.interface.ts`<br>`src/users/dto/record-view.dto.ts`<br>`src/users/users.controller.ts`<br>`src/users/users.service.ts` |
| **Phase 2: Reset-Endpunkte für das Profil** | • `DELETE /users/:id/favorites/events`<br>• `DELETE /users/:id/favorites/businesses`<br>• `DELETE /users/:id/personalization/reset` | `src/users/users.controller.ts`<br>`src/users/users.service.ts` |
| **Phase 3: Event-Query & Scoring** | • `favoritesOnly` und `forYou` in `EventsListQueryDto`<br>• `PersonalizationScorerService` implementieren<br>• In `EventsListQueryService` integrieren | `src/events/dto/events-list-query.dto.ts`<br>`src/core/personalization/personalization-scorer.service.ts`<br>`src/events/application/services/events-list-query.service.ts` |
| **Phase 4: Partner-Query** | • `favoritesOnly` und `forYou` in `BusinessesController` integrieren | `src/businesses/application/controllers/businesses.controller.ts` |
