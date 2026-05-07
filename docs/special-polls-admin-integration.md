# Special Polls (Umfragen) – Admin-Frontend Integration

Dieses Dokument beschreibt die **HTTP-API** für **Special Polls** (`/special-polls`), damit das **Admin-Frontend** (Super-Admin) Umfragen anlegen, status setzen, hervorheben, Antworten moderieren und löschen kann. Endnutzer-Flows (Liste, Antwort, Upvote) sind dieselben Routen wie in der App; hier der Fokus auf **Super-Admin**.

**Backend-Code:** [`src/special-polls/`](../src/special-polls/)  
**Rollen & Auth:** [.cursorrules](../.cursorrules), [`src/core/guards/roles.guard.ts`](../src/core/guards/roles.guard.ts)  
**Push bei neuer Umfrage:** [notification-suggestions.md](./notification-suggestions.md) (Abschnitt `NEW_SURVEY`, Präferenz `notificationPreferences.newSurveys`)

---

## Globale Voraussetzungen

### Authentifizierung

- Jede Anfrage: `Authorization: Bearer <FirebaseIdToken>`.
- Ohne gültigen Token: **401** (globales `AuthGuard`).

### Response-Envelope

Antworten sind eingepackt (globaler Interceptor):

```json
{
  "data": <Rückgabewert>,
  "timestamp": "<ISO-Zeit Berlin>"
}
```

Der Client arbeitet mit **`response.data`** (bzw. eurer HTTP-Abstraktion darauf).

### OpenAPI

Swagger UI: **`GET /api`**, Tag **`special-polls`**.

### Firestore (Einordnung)

| Collection        | Inhalt              |
|-------------------|---------------------|
| `special_polls`   | Umfrage-Dokumente   |

---

## Basis-Pfad

| Ressource      | Base-Pfad        |
|----------------|------------------|
| Special Polls  | `/special-polls` |

Präfixe wie `/dev` oder `/prd` hängen von der Deployment-Konfiguration ab ([README.md](../README.md), `BASE_URL`).

---

## Rollen-Matrix

| Methode | Pfad | Erlaubte Rollen |
|---------|------|------------------|
| `POST` | `/special-polls` | `super_admin` |
| `GET` | `/special-polls` | `user`, `admin`, `super_admin` |
| `GET` | `/special-polls/:id` | `user`, `admin`, `super_admin` |
| `PATCH` | `/special-polls/:id/status` | `super_admin` |
| `PATCH` | `/special-polls/:id/highlight` | `super_admin` |
| `POST` | `/special-polls/:id/responses/:responseId/upvote` | `user`, `admin`, `super_admin` |
| `POST` | `/special-polls/:id/responses` | `user`, `admin`, `super_admin` |
| `DELETE` | `/special-polls/:id/responses/me` | `user`, `admin`, `super_admin` |
| `PATCH` | `/special-polls/:id/responses` | `super_admin` |
| `DELETE` | `/special-polls/:id` | `super_admin` |

**Hinweis:** `SpecialPollsModule` importiert `UsersModule`, damit der `RolesGuard` funktioniert (siehe [.cursorrules](../.cursorrules)).

---

## Datenmodell (`SpecialPoll`)

Die API liefert nach Normalisierung immer dieses Schema im Feld `data` (ein Objekt oder Array von Objekten):

```json
{
  "id": "firestore-doc-id",
  "title": "Fragestellung / Titel",
  "status": "ACTIVE",
  "isHighlighted": false,
  "responses": [
    {
      "id": "stabile-antwort-uuid",
      "userId": "…",
      "userName": "…",
      "response": "Text der Antwort",
      "createdAt": "…",
      "upvotedUserIds": ["userA", "userB"]
    }
  ],
  "createdAt": "…",
  "updatedAt": "…"
}
```

### Status (`status`)

- **`ACTIVE`** – Umfrage ist für normale App-Nutzer **sichtbar** (Listen + Detail); neue Umfragen werden standardmäßig so angelegt.
- **`INACTIVE`** – Umfrage ist für Nutzer mit Rolle **`user`** in **Listen und Detail ausgeblendet** (**404** beim Einzelabruf, kein Eintrag in `GET /special-polls`). **`admin`** und **`super_admin`** sehen **alle** Umfragen inkl. `INACTIVE` (kein zusätzlicher Query-Parameter nötig).
- **`PATCH …/status`** darf nur **`ACTIVE`** oder **`INACTIVE`** setzen.
- **Legacy in Firestore (nur Lesen, nie als API-Antwort):** gespeichertes **`PENDING`** oder **`CLOSED`** wird beim Lesen wie **`ACTIVE`** behandelt (Rückwärtskompatibilität). Die API liefert dafür **`ACTIVE`**, nie `PENDING` oder `CLOSED`.

### Hervorhebung (`isHighlighted`)

- Steuert, ob eine Umfrage in der App **prominent** dargestellt werden soll (z. B. Widget „Hervorgehobene Frage“).
- Standard bei Erstellung: **`false`**, sofern nicht im Create-Body gesetzt.
- Änderung nur per **`PATCH /special-polls/:id/highlight`** (Super-Admin).

### Antworten (`responses`)

- Jede Antwort hat eine **stabile `id`** (UUID). Für Upvotes und Anzeige zwingend verwenden, **nicht** den Array-Index.
- **`upvotedUserIds`:** Liste der Firebase-User-IDs, die zugestimmt haben (Toggle über Upvote-Endpoint).

---

## Super-Admin: Umfrage anlegen

### `POST /special-polls`

**Body (JSON):**

| Feld | Pflicht | Typ | Beschreibung |
|------|---------|-----|--------------|
| `title` | Ja | string | Titel / Frage |
| `isHighlighted` | Nein | boolean | Standard `false` |

**Beispiel:**

```json
{
  "title": "Wohin soll der nächste Stadtausflug gehen?",
  "isHighlighted": true
}
```

**Response `data`:** angelegte `SpecialPoll` (u. a. `status: "ACTIVE"`, `responses: []`).

**Nebenwirkung:** Push an Nutzer mit `notificationPreferences.newSurveys === true` (Details: [notification-suggestions.md](./notification-suggestions.md)).

---

## Super-Admin: Status setzen

### `PATCH /special-polls/:id/status`

**Body:**

```json
{
  "status": "INACTIVE"
}
```

Erlaubte Werte: **`ACTIVE`**, **`INACTIVE`** (kein `PENDING` / `CLOSED` als neuer Schreibwert).

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Hervorhebung setzen

### `PATCH /special-polls/:id/highlight`

**Body:**

```json
{
  "isHighlighted": true
}
```

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Antworten ersetzen / moderieren

### `PATCH /special-polls/:id/responses`

**Zweck:** Gesamte Liste `responses` schreiben (Moderation, Korrekturen). Nur Super-Admin.

**Body:**

```json
{
  "responses": [
    {
      "id": "optional-oder-wird-normalisiert",
      "userId": "…",
      "userName": "…",
      "response": "…",
      "createdAt": "…",
      "upvotedUserIds": ["…"]
    }
  ]
}
```

| Feld pro Eintrag | Pflicht | Hinweis |
|------------------|---------|---------|
| `userId`, `userName`, `response`, `createdAt` | Ja | |
| `id` | Empfohlen | Fehlt oder leer → Backend vergibt UUID beim Speichern |
| `upvotedUserIds` | Nein | Fehlt → wird als leeres Array behandelt |

**Response `data`:** aktualisierte `SpecialPoll`.

---

## Super-Admin: Umfrage löschen

### `DELETE /special-polls/:id`

**Response `data`:** typischerweise `null` / leer je nach Interceptor-Konvention bei `void` – Status **200** bei Erfolg.

---

## Lesen (für Admin-UI & Vorschau)

### `GET /special-polls`

**Query (optional):**

| Parameter | Wert | Effekt |
|-----------|------|--------|
| `highlighted` | `true` | Nur Umfragen mit `isHighlighted === true` |

**Sichtbarkeit:** Nutzer mit **`admin`** oder **`super_admin`** erhalten **alle** Einträge inkl. **`INACTIVE`**. Reine **`user`**-Konten erhalten **keine** `INACTIVE`-Umfragen in dieser Liste.

**Response `data`:** `SpecialPoll[]`, sortiert absteigend nach `createdAt` (Backend).

### `GET /special-polls/:id`

**Sichtbarkeit:** Für **`user`** liefert das Backend **404**, wenn die Umfrage (nach Normalisierung) **`INACTIVE`** ist. **`admin`** / **`super_admin`** erhalten die Ressource.

**Response `data`:** eine `SpecialPoll`.

---

## Fehler (Auswahl)

| Code | Typische Ursache |
|------|------------------|
| **401** | Token fehlt/ungültig |
| **403** | Rolle passt nicht (`RolesGuard`) |
| **404** | Umfrage oder Antwort (`responseId`) nicht gefunden; oder Umfrage **`INACTIVE`** für normale Nutzer (`user`) |
| **400** | Validierung (DTO / class-validator) |

---

## UI-Empfehlungen (Kurz)

- **Highlight:** Schalter oder Stern-Icon, gebunden an `PATCH …/highlight`.
- **Status:** Dropdown **`ACTIVE`** / **`INACTIVE`**. Hinweis: historische Firestore-Werte `PENDING` / `CLOSED` erscheinen in der API als **`ACTIVE`**.
- **Moderation:** Bei `PATCH …/responses` immer vollständige Liste senden; `id` und `upvotedUserIds` aus der letzten `GET`-Antwort übernehmen, um Upvotes nicht zu verlieren.

---

## Verwandte Dokumentation

- Flutter-App (Lesen, Antworten, Upvotes): [flutter-special-polls-integration.md](./flutter-special-polls-integration.md)
- Benachrichtigungen: [notification-suggestions.md](./notification-suggestions.md)
