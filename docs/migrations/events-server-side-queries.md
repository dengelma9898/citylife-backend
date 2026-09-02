# Migration: Events-Liste server-seitig in Firestore (Group C)

> Status: **Deferred / Follow-up** – NICHT umgesetzt im Performance-Paket 2026-09.
> Dieses Dokument beschreibt Schritt für Schritt, wie die aktuelle In-Memory-Event-Suche auf server-seitige Firestore-Queries umgestellt wird.
> Grund für das Aufschieben: Hoher Umbauaufwand, benötigt manuelle Composite-Indexe (Firebase Console) und betrifft das Kern-Feature „Event-Liste“. Kein akuter Fehler – Kapazitäts-Thema.

---

## 1. Aktueller Ist-Zustand

### 1.1 Datenfluss

`EventsListQueryService` (`src/events/application/services/events-list-query.service.ts`):

1. `loadAllEvents()` lädt die **gesamte** `events`-Collection inkl. aller Felder in den In-Memory-LRU-Cache (`events:list:all`, TTL 5 Min, `max` = 100 Items global).
2. `filterEventsByApproval` + `filterEvents` filtern **im JavaScript-Prozess**.
3. `sortEvents` sortiert in-memory.
4. `paginateEvents` paginiert in-memory.
5. Facets (`buildMonthOptions`, `pendingCount`) werden aus der **gesamten gefilterten Menge** berechnet, nicht nur aus der aktuellen Seite.

### 1.2 Betroffene Endpunkte

| Endpoint | Methode | Service-Methode | Anmerkung |
|----------|---------|-----------------|-----------|
| `GET /events` | legacy | `EventsService.getAll()` | Keine Query-Params (bzw. nicht paginiert). Bleibt unverändert, wird `@deprecated`. |
| `GET /events` | paginated | `EventsListQueryService.queryEvents()` | Wenn `isPaginatedEventsRequest()` zutrifft. |
| `GET /events/count` | get | `EventsListQueryService.countEvents()` |
| `GET /events/export` | get (admin) | `EventsListQueryService.getFilteredEventsForExport()` |

Steuerung: `isPaginatedEventsRequest()` aus `src/events/utils/event-list-filter.util.ts` (Key-Liste `PAGINATED_EVENTS_QUERY_KEYS`).

---

## 2. Semantik, die zwingend erhalten bleiben muss

Referenz: `src/events/utils/event-list-filter.util.ts`, `event-list-date.util.ts`, `event-list-sort.util.ts`, `src/events/dto/events-list-query.dto.ts`.

### 2.1 Filter (DTO `EventsListFilterDto`)

| Param | Werte | Semantik (aktuelle JS-Logik) |
|-------|-------|------------------------------|
| `q` | string | case-insensitive `title.includes(q)` |
| `status` | `all` / `past` / `running` / `future` | Basiert auf `dailyTimeSlots[0].date` (erster) und `dailyTimeSlots[last].date` (letzter) vs. heute (startOfDay). `running` = heute innerhalb [erster, letzter] inklusive. Events mit nur `monthYear` zählen bei `past/running/future` als „passt immer“ (algorithmisch: bei `statusFilter !== 'all'` → true, wenn `monthYear` gesetzt). Events ohne Datum liefern `false`, sobald ein nicht-`all`-Status gesetzt ist. |
| `approval` | `all` / `pending` / `active` | `active` = `status === undefined` **ODER** `status === 'ACTIVE'` (`isPubliclyVisibleStatus`). Nur Admins dürfen `pending`/`all`. Nicht-Admins erzwingen `active`. |
| `category` | `all` / `no-category` / `<categoryId>` | `no-category` = `!categoryId || categoryId === 'default'` |
| `date` | `all` / `with-date` / `no-date` | `hasDateInfo` = `dailyTimeSlots.length > 0` **ODER** `monthYear` gesetzt |
| `time` + `week` | `all` / `week` / `month` | `week`: mind. ein Slot in ISO-Kalenderwoche `week` des aktuellen Jahres (`getSlotCalendarWeek`). `month`: mind. ein Slot mit `formatSlotMonthKey(slot.date) === month` ODER `monthYear` aus `M.YYYY` geparst == `month` (`YYYY-MM`). |
| `sort` | `startDate` / `updatedAt` | `startDate` ist **berechnet** via `getEventStartDate()` (nicht gespeichert): `dailyTimeSlots[0].date` sonst `monthYear→YYYY-MM-01`. Events ohne Datum sortieren ans Ende (unabhängig von asc/desc). Tiebreak: `id.localeCompare`. |
| `order` | `asc` / `desc` | Richtung; Default `desc` |
| `page` / `limit` | Zahl | Default `page=1`, `limit=50` (max 100). Meta: `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`. |
| `facets` | boolean | `monthOptions` = alle Monats-Keys (aus Slots + monthYear) der **gesamten gefilterten Menge**, absteigend sortiert, Label de-DE („September 2026“). `pendingCount` nur für Admins = Anzahl `status === 'PENDING'` in der gefilterten Menge. |

### 2.2 Zeitraum/Kalenderwoche (Berlin)

- Slot-Datum: `YYYY-MM-DD`, geparst als `Date` (String-Interpretation), Tagesgrenze Berlin via `startOfDay`.
- Kalenderwoche: ISO (`DateTime.weekNumber`), Jahr = aktuelles Kalenderjahr.
- `monthKey`: `YYYY-MM`.

---

## 3. Herausforderungen für Firestore-Only

| # | Problem | Warum problematisch |
|---|---------|----------------------|
| 1 | **`status === undefined || ACTIVE`** | Firestore unterstützt kein OR. Query `status == 'ACTIVE'` liefert keine Dokumente ohne `status`-Feld. |
| 2 | **`sort: startDate` ist berechnet** | Es gibt kein `startDate`-Feld. Sortierung aus `dailyTimeSlots[0]`/`monthYear` ist nicht direkt per `orderBy` möglich. |
| 3 | **`running`, `week`, `month` nutzen Arrays** | `dailyTimeSlots` ist ein Array; Firestore-`array-contains` matcht ganze Objekte, nicht „teilweise“. Kalenderwoche rückwärts ist nicht querybar. |
| 4 | **Facets aus Gesamtmenge** | `monthOptions` + `pendingCount` brauchen Daten über die gefilterte Menge, nicht über die Seite. |
| 5 | **Fehlende Composite-Indexe** | Für kombinierte `where` + `orderBy` braucht es manuell angelegte Indexe (CONSTITUTION §3 Hinweis). |

**Konsequenz:** Eine 100 % server-seitige Umsetzung erfordert eine **Denormalisierung** der Event-Dokumente (neue Felder + Backfill) oder einen **Hybrid**.

---

## 4. Schritt-für-Schritt-Plan

### Phase 0 – Vorentscheidungen treffen

- [ ] **A)** Voll-Denormalisierung (empfohlen für Sortierung/Pagination) vs. **B)** Hybrid (Filter in Firestore, Facets in Memory via `count`-Queries/`getCountFromServer`).
- [ ] Empfohlene Variante: **Hybrid zuerst**, Voll-Denormalisierung nur wenn Pagination-Performance es erfordert. Risiko geringer, Breaking-Change-Risiko minimiert.

### Phase 1 – Semantik-Gold-Test schreiben (Voraussetzung, kein Produktionscode)

- [ ] Golden-Test gegen die **aktuelle** In-Memory-Logik in `src/events/application/services/events-list-query.service.spec.ts`:
  - Fixture-Daten mit: Events mit/ohne `status`, mit `dailyTimeSlots`, nur `monthYear`, ohne Datum, mit `categoryId === 'default'` / fehlender Kategorie, PENDING/ACTIVE.
  - Alle Filterkombinationen aus §2.1 als Parameterized-Tests.
  - Fixierte Erwartungen (JSON-Snapshot) für `data`, `meta`, `facets.monthOptions`, `facets.pendingCount`.
- [ ] Diese Tests dienen später dem Nachweis „alte vs. neue Implementierung → identische Antworten“.

### Phase 2 – Event-Dokumente denormalisieren (falls Variante A)

- [ ] Neue Felder beim Schreiben setzen (Backfill vorhandener Dokumente per Skript):
  - `_startDate: string` (ISO `YYYY-MM-DD`) – kleinster Slot-Datum oder `monthYear→YYYY-MM-01`; `null`, wenn kein Datum.
  - `_endDate: string` – größtes Slot-Datum.
  - `_monthKeys: string[]` (`YYYY-MM`) – dedupliziert aus Slots + monthYear.
  - `_hasDate: boolean` – `hasDateInfo`.
  - `_hasStatus: boolean` bzw. alle Bestands-Docs auf explizites `status: 'ACTIVE'` setzen (löst Problem #1).
- [ ] Schreibpfade (create/update) anpassen; `removeUndefined` beachten; alte Felder unverändert lassen (kein API-Break).
- [ ] Konvention: `status` ist danach **immer** gesetzt → `isPubliclyVisibleStatus` wird `status === 'ACTIVE'`.

### Phase 3 – Composite-Indexe in Firebase Console anlegen

Die folgenden Indexe müssen manuell erstellt werden (Collection `events`). Exakte Namen sind egal – Console erzeugt sie. **`status ↓, _startDate ↓`** etc.:

1. `status` ASC/DESC + `_startDate` + (Pagination `offset` via `startAfter`)
2. `status` + `_startDate` (für Default `sort=startDate, order=desc`)
3. `status` + `_updatedAt` (falls `sort=updatedAt`)
4. `status` + `_monthKeys` `array-contains` (falls `time=month` querybar)
5. Beliebige Kombinationen aus `categoryId`, `status`, `_startDate`, `_updatedAt`, die aus §5 resultieren

- [ ] `missing_index`-Fehler zuerst in der Console/prod testen und nachloggen.

### Phase 4 – Hybrid: Filter-Ebene in Firestore, Semantik in Memory

Falls Phase 0 = B, mindestens die **billigen Filter** nach unten schieben:

- [ ] `approval=active` → `where('status', '==', 'ACTIVE')` (nach Phase 2 Backfill).
- [ ] `approval=pending` → `where('status', '==', 'PENDING')`.
- [ ] `category` (außer `no-category`) → `where('categoryId', '==', x)`.
- [ ] `sort=updatedAt` → `orderBy('updatedAt')`.
- [ ] `date=with-date` → `where('_hasDate', '==', true)`; `date=no-date` → `== false`.
- [ ] `time=month` → `where('_monthKeys', 'array-contains', month)`.
- [ ] `q`, `status=past/running/future`, `time=week`, `category=no-category`, `sort=startDate`, `facets` → weiter in-Memory (Semantik zu komplex für Firestore).
- [ ] Klare Regel: In-Memory-Filter bleibt als Fallback **exakt** erhalten, wird aber auf die (kleinere) Vorfiltermenge angewandt.

Neue Struktur:

```
queryEvents():
  1. page = await loadEventsPage(whereClauses, orderBy, limit+1)   // vorselektiert
  2. filtered = filterEventsInMemory(page, inMemoryOnlyParams)      // nur noch fehlende Filter
  3. facets = computeFacetsFromFullFilteredSet(...)                 // eigener count/Query
  4. meta wie heute
```

### Phase 5 – Voll-Denormalisierung für Pagination/Sortierung (nur falls nötig)

- [ ] Sortierung komplett in Firestore: `orderBy('_startDate', desc)` + `startAfter(…, id)` statt `page*limit` (`offset` skaliert nicht gut).
- [ ] `q`-Suche: Optional `title`-Prefix-Query + In-Memory-`includes` bleibt Fallback. Kein Volltext-Index einplanen (kein Algolia/Typesense im Budget-Kontext).

### Phase 6 – Backward-compatible Auslieferung (kein Breaking Change)

- [ ] Neue Logik hinter **Feature-Flag** (Env-Var, z. B. `EVENTS_QUERY_MODE=firestore|memory`; Default `memory`).
- [ ] `EventsListQueryService` entscheidet anhand des Flags; DTOs, Response-Shape (`data/meta/facets`), Statuscodes und Error-Messages **unverändert**.
- [ ] Legacy `GET /events` (`getAll()`) bleibt unangetastet; `@deprecated`-JSDoc bereits vorhanden, Swagger-Markierung `deprecated: true` setzen.
- [ ] Vergleichstest: identische Antworten alt vs. neu (Golden-Tests aus Phase 1) auf derselben Firestore-Datenmenge.
- [ ] Nach erfolgreichem Rollout: Flag auf `firestore`, In-Memory-Pfad **nicht entfernen** (mind. 1 Release als Fallback), erst auf explizite Freigabe löschen.

### Phase 7 – Entfernen (nur auf explizite Anweisung)

- [ ] `events:list:all`-Cache-Eintrag entfällt (kein Gesamt-Collection-Load mehr).
- [ ] `EventsService.getAllUnfiltered()` nur noch für Legacy-Pfad/CSV-Import nutzen.
- [ ] Aufräumen: `getFilteredEventsForExport` darf weiter die In-Memory-Logik nutzen (Admin-Kontext, selten), behält aber das Flag.

---

## 5. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Feuerstore `IN`-Limit (30) / `offset`-Skalierung | Chunking wie bei User-Profiles (§3 CONSTITUTION); `startAfter`-Cursor statt `offset`. |
| `status undefined`-Events verschwinden nach `where(ACTIVE)` | Phase 2 Backfill zwingend **vor** Aktivierung; danach Index-Konsistenz prüfen. |
| Facets weichen ab (Gesamtmenge vs. Seite) | Separate Aggregations-Query (`getCountFromServer` + Monats-Aggregation) mit eigener Caching-TTL. |
| Kalenderwoche/Jahr-Zeitzone | Queries nie in UTC auf Monats-Keys bauen; Keys immer Berlin (`YYYY-MM`). |
| Doppelte Wartung (Memory + Firestore-Pfad) | Gemeinsame Pure-Functions (Filter/Sort) unverändert lassen; nur die Datenquelle wechseln. |

---

## 6. Geplante Testabdeckung

- [ ] Golden-Tests (Phase 1) als Single Source of Truth.
- [ ] Firestore-Emulator-Tests für Query-Pfad (`@firebase/rules-unit-testing`, lokaler Emulator in CI).
- [ ] E2E: `GET /events?page=2&limit=10&facets=true` identisch alt/neu.
- [ ] Index-Test: Query ohne angelegten Composite-Index wirft `missing_index` → CI-sichtbar machen.

---

## 7. Nächste konkrete Schritte (erster PR)

1. Golden-Tests (Phase 1) schreiben und grün.
2. Backfill-Skript für `_hasStatus`/`_startDate`/`_monthKeys`/`status=ACTIVE` (idempotent, README im Skript).
3. Composite-Indexe anlegen (Phase 3) und mit echten Admin-Queries verifizieren.
4. Feature-Flag-Präfix `EVENTS_QUERY_MODE` (Phase 6) einbauen.

---

**Letzte Aktualisierung:** 2026-09-02
**Gehört zu:** Performance-Review 2026-09 (Group C) – siehe `docs/migrations/fcm-multicast-batching.md` (Group B Follow-up).