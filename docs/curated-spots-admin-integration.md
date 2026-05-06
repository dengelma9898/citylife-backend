# Kuratierte Spots – Admin-Frontend Integration

Dieses Dokument beschreibt die **HTTP-API**, die das Admin-Frontend ansprechen muss, um **kuratierte Spots** und das **eigene Keyword-Vokabular** (`spotKeywords`, getrennt von den globalen Partner-`keywords`) zu verwalten. Es ist so geschrieben, dass ein anderer Entwickler oder ein Agent **ohne Raten** Clients (z. B. React/Vue) implementieren kann.

## Globale Voraussetzungen (gilt für alle Endpunkte)

### Authentifizierung

- Jede Anfrage braucht einen **Firebase-ID-Token** im Header: `Authorization: Bearer <idToken>`.
- Ohne gültigen Token antwortet das Backend mit **401** (globales `AuthGuard`).

### Rollen (`RolesGuard`)

- Schreibende Admin-Routen sind mit `@Roles('admin', 'super_admin')` geschützt.
- Nutzer mit Rolle **Admin** oder **Super-Admin** (`userType` im Firestore-Profil) dürfen diese Routen aufrufen.
- Technische Details zum Guard: siehe [.cursorrules](../.cursorrules) und [`src/core/guards/roles.guard.ts`](../src/core/guards/roles.guard.ts) (Business-User werden separat behandelt).

### Response-Format (wichtig für den Client)

Das Backend nutzt einen **globalen Response-Interceptor**. Antworten sind **nicht** das nackte JSON-Objekt, sondern immer eingepackt:

```json
{
  "data": <Rückgabewert des Controllers>,
  "timestamp": "<ISO-Zeit Berlin>"
}
```

**Beispiel:** `GET /curated-spots/admin` liefert ein Array von Spots im Feld `data`:

```json
{
  "data": [
    {
      "id": "…",
      "name": "…",
      "nameLower": "…",
      "descriptionMarkdown": "…",
      "imageUrls": [],
      "keywordIds": [],
      "address": {
        "street": "Hauptstraße",
        "houseNumber": "1",
        "postalCode": "90403",
        "city": "Nürnberg",
        "latitude": 49.45,
        "longitude": 11.08
      },
      "videoUrl": null,
      "instagramUrl": null,
      "status": "PENDING",
      "isDeleted": false,
      "createdAt": "…",
      "updatedAt": "…",
      "createdByUserId": "…"
    }
  ],
  "timestamp": "…"
}
```

Der Admin-Client sollte überall **`response.data`** (oder eure HTTP-Client-Abstraktion darauf) verwenden.

### OpenAPI / Swagger

Interaktive Doku: **`GET /api`** (Swagger UI), Tag-Gruppen u. a. `curated-spots`, `spot-keywords`.

### Firestore-Collections (nur zur Einordnung)

| Collection (Firestore) | Inhalt |
|------------------------|--------|
| `curatedSpots` | Spot-Dokumente |
| `spotKeywords` | Tag-Keywords nur für Spots (nicht `keywords` für Businesses) |

Bei neuen zusammengesetzten Firestore-Queries können in der **Firebase Console** **Composite Indexes** nötig werden (Fehlermeldung mit Link kommt von Firebase).

---

## Basis-Pfade

| Ressource | Base-Pfad |
|-----------|-----------|
| Spots | `/curated-spots` |
| Spot-Keywords | `/spot-keywords` |

Präfix wie `/dev` oder `/prd` hängt von eurer Deployment-Konfiguration ab (siehe [README.md](../README.md) zu `BASE_URL`).

---

## 1. Spot-Keywords (Autocomplete + manuelles Anlegen)

### GET `/spot-keywords/suggest`

**Zweck:** Vorschläge für die Tag-Eingabe (Prefix-Suche auf `nameLower`).

**Auth:** Jeder authentifizierte User (keine Admin-Rolle nötig).

**Query-Parameter:**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|--------------|
| `q` | **Ja** | Prefix; leer oder nur Whitespace → **400** `Bad Request` |
| `limit` | Nein | Standard `20`; Backend clamped auf **1–50** |

**Beispiel:** `GET /spot-keywords/suggest?q=bier&limit=15`

**Response `data`:** `SpotKeyword[]`

```json
{
  "id": "firestore-doc-id",
  "name": "Biergarten",
  "nameLower": "biergarten",
  "createdAt": "…",
  "updatedAt": "…"
}
```

**UI-Hinweis:** Nutzer wählt Einträge nach **`name`**; für Spots speichert ihr die **`id`** in der Liste `keywordIds`.

---

### GET `/spot-keywords/:id`

**Zweck:** Ein einzelnes Spot-Keyword per **Firestore-Dokument-ID** laden – z. B. um beim **Bearbeiten** eines Spots aus `keywordIds[]` die **Anzeigenamen** für Chips aufzulösen (die Spot-API liefert nur IDs, keine eingebetteten Keyword-Objekte).

**Auth:** Jeder authentifizierte User (**keine** Admin-Rolle nötig).

**Pfad:** Die ID URL-sicher übergeben: `encodeURIComponent(id)` in den Pfad einfügen (Sonderzeichen in IDs sind selten, aber konsistent).

**Routen-Reihenfolge im Backend:** `GET …/suggest` ist **vor** `GET …/:id` registriert, damit der Literal-Pfad `suggest` nicht als ID interpretiert wird.

**Response `data`:** ein `SpotKeyword`-Objekt wie bei Suggest.

**Fehler:** **404**, wenn kein Dokument mit dieser ID existiert (Admin-UI kann dann z. B. „Unbekannt“ anzeigen, Chip aber mit gespeicherter `id` für `PATCH` beibehalten).

---

**Zweck:** Keyword explizit anlegen (z. B. „Import“ oder Admin-Pflege).

**Auth:** **admin** oder **super_admin**

**Body (`application/json`):**

```json
{
  "name": "Klimaanlage"
}
```

- `name`: string, nicht leer, max. **120** Zeichen.

**Verhalten:** Existiert bereits ein Keyword mit gleichem `nameLower` (trim + lowercase), liefert das Backend das **bestehende** Dokument (kein Duplikat).

**Response `data`:** ein `SpotKeyword`-Objekt wie oben.

---

## 2. Kuratierte Spots – Admin-Listen und Detail

### GET `/curated-spots/admin`

**Zweck:** Liste **aller nicht gelöschten** Spots (`isDeleted === false`), **alle Status** (`PENDING`, `ACTIVE`).

**Auth:** **admin** oder **super_admin**

**Response `data`:** `CuratedSpot[]`

---

### GET `/curated-spots/admin/:id`

**Zweck:** Einzelabruf inkl. **PENDING** (z. B. Bearbeiten-Formular).

**Auth:** **admin** oder **super_admin**

**Response `data`:** ein `CuratedSpot`

**Fehler:** **404**, wenn ID nicht existiert.

---

## 3. Kuratierte Spots – Anlegen und Bearbeiten

### Datenmodell `CuratedSpot` (Response / Patch-Logik)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | string | Firestore-Dokument-ID |
| `name` | string | Anzeigename |
| `nameLower` | string | vom Server gesetzt (normalisiert), nicht im Create-Body |
| `descriptionMarkdown` | string | Markdown-Rohstring; **Rendering** nur im Client |
| `imageUrls` | string[] | URLs (u. a. nach Upload) |
| `keywordIds` | string[] | Referenzen auf `spotKeywords` |
| `address` | Objekt | **Pflicht** in API-Responses; gleiche Struktur wie bei **Partnern** (`BusinessAddressDto`): `street`, `houseNumber`, `postalCode`, `city`, `latitude`, `longitude` (siehe [`business-address.dto.ts`](../src/businesses/dto/business-address.dto.ts)). Beim **Lesen** sehr alter Firestore-Dokumente ohne `address`-Feld füllt das Backend Platzhalter (leere Strings, `0` für Koordinaten); solche Einträge sollten per `PATCH` mit einer echten Adresse nachgezogen werden. |
| `videoUrl` | string \| null | z. B. nach Upload oder manuell per PATCH |
| `instagramUrl` | string \| null | gültige URL (`class-validator` `@IsUrl`) |
| `status` | `"PENDING"` \| `"ACTIVE"` | Sichtbarkeit in der öffentlichen App |
| `isDeleted` | boolean | Soft-Delete |
| `createdAt` / `updatedAt` | string (ISO) | vom Server gesetzt |
| `createdByUserId` | string \| null | Firebase-UID des Erstellers bei `POST` |

---

### POST `/curated-spots`

**Zweck:** Neuen Spot anlegen.

**Auth:** **admin** oder **super_admin**

**Body (`application/json`):**

```json
{
  "name": "Café Sonnendeck",
  "descriptionMarkdown": "## Lage\n…",
  "address": {
    "street": "Königstraße",
    "houseNumber": "10",
    "postalCode": "90402",
    "city": "Nürnberg",
    "latitude": 49.4489,
    "longitude": 11.0788
  },
  "keywordIds": ["id-aus-suggest", "andere-id"],
  "newKeywordNames": ["Rooftop", "Frühstück"],
  "videoUrl": "https://…",
  "instagramUrl": "https://www.instagram.com/reel/…",
  "status": "PENDING"
}
```

| Feld | Pflicht | Hinweis |
|------|---------|---------|
| `name` | Ja | max. 200 Zeichen |
| `descriptionMarkdown` | Ja | max. 20000 Zeichen |
| `address` | **Ja** | verschachteltes Objekt: `street`, `houseNumber`, `postalCode`, `city` (jeweils nicht-leerer String), `latitude` / `longitude` als Zahl (wie Partner-Adresse) |
| `keywordIds` | Nein | bestehende `spotKeywords`-IDs |
| `newKeywordNames` | Nein | Strings max. 120 Zeichen; Server legt fehlende Keywords an und **merged** die IDs in `keywordIds` |
| `videoUrl` / `instagramUrl` | Nein | müssen gültige URLs sein, wenn gesetzt |
| `status` | Nein | Default **`PENDING`**, wenn weggelassen |

**Response `data`:** angelegter `CuratedSpot` (inkl. `id`).

**Empfohlener Admin-Workflow:**

1. `POST /curated-spots` mit Text + Keywords (und optional URLs).
2. Mit zurückgegebener `id`: Bilder per `POST …/images` hochladen (siehe unten).
3. Optional: Video per `POST …/video` hochladen **oder** `videoUrl`/`instagramUrl` per `PATCH` setzen.
4. Wenn inhaltlich fertig: `PATCH /curated-spots/:id` mit `{ "status": "ACTIVE" }`.

---

### PATCH `/curated-spots/:id`

**Zweck:** Spot teilweise aktualisieren.

**Auth:** **admin** oder **super_admin**

**Body:** alle Felder optional; nur gesendete Felder ändern sich logisch. **`address`:** wenn gesetzt, wird das komplette Adressobjekt ersetzt (gleiche Pflichtfelder wie bei `POST`).

**Keywords – Semantik:**

- `keywordIds`: wenn gesetzt, **ersetzt** das die komplette Liste der Keyword-Referenzen auf dem Spot.
- `newKeywordNames`: wenn gesetzt (nicht-leeres Array), werden die Namen aufgelöst/angelegt und die neuen IDs **zur aktuellen Liste hinzugefügt** (nach ggf. gesetztem `keywordIds` im selben Request).

**Beispiele:**

Adresse ändern:

```json
{
  "address": {
    "street": "Neue Straße",
    "houseNumber": "2",
    "postalCode": "90403",
    "city": "Nürnberg",
    "latitude": 49.45,
    "longitude": 11.08
  }
}
```

Nur Freigabe:

```json
{ "status": "ACTIVE" }
```

Nur Instagram setzen:

```json
{ "instagramUrl": "https://www.instagram.com/p/…" }
```

Keyword-Liste komplett ersetzen:

```json
{ "keywordIds": ["kw1", "kw2"] }
```

**Response `data`:** aktualisierter `CuratedSpot`.

---

### DELETE `/curated-spots/:id`

**Zweck:** **Soft-Delete** (`isDeleted: true`). Datensatz bleibt in Firestore.

**Auth:** **admin** oder **super_admin**

**Response `data`:** der aktualisierte `CuratedSpot` (mit `isDeleted: true`) – **kein** HTTP 204.

---

## 4. Medien-Uploads (multipart)

### POST `/curated-spots/:id/images`

**Zweck:** Bis zu **20** Bilder auf einmal hochladen; URLs werden an `imageUrls` **angehängt**.

**Auth:** **admin** oder **super_admin**

**Content-Type:** `multipart/form-data`

**Form-Feldname:** `images` (mehrere Teile mit gleichem Namen – wie Browser/File-API bei Multi-Select).

**Response `data`:** aktualisierter `CuratedSpot` mit erweitertem `imageUrls`.

**Fehler:** **400**, wenn keine Dateien mitgeschickt wurden.

**Hinweis:** Erlaubte MIME-Typen/Größen folgen dem globalen [`FileValidationPipe`](../src/core/pipes/file-validation.pipe.ts) (wie bei anderen Uploads im Projekt).

---

### POST `/curated-spots/:id/video`

**Zweck:** **Eine** Videodatei hochladen; die resultierende Storage-URL wird in **`videoUrl`** geschrieben (überschreibt vorherigen Wert aus Sicht des Feldes).

**Auth:** **admin** oder **super_admin**

**Content-Type:** `multipart/form-data`

**Form-Feldname:** `file` (genau eine Datei).

**Response `data`:** aktualisierter `CuratedSpot`.

**Validierung:** [`VideoFileValidationPipe`](../src/core/pipes/video-file-validation.pipe.ts) – erlaubte Typen: **MP4** (`video/mp4`), **WebM** (`video/webm`), **QuickTime/MOV** (`video/quicktime`), **M4V** (`video/x-m4v`); maximale Dateigröße **10 MB** pro Upload.

---

## 5. Öffentliche Lese-Endpunkte (Referenz für Admin-Vorschau / QA)

Diese Routen brauchen **keine** Admin-Rolle, nur Auth.

### GET `/curated-spots`

Nur Spots mit `status === "ACTIVE"` und `isDeleted === false`.

### GET `/curated-spots/search`

**Query:**

| Parameter | Beschreibung |
|-----------|--------------|
| `namePrefix` | optional; Präfix auf `nameLower` |
| `keywordIds` | optional; **mehrfach** erlaubt |

**`keywordIds` encodieren:**

- wiederholter Query-Key: `?keywordIds=id1&keywordIds=id2`
- oder komma-separiert in einem Wert: `?keywordIds=id1,id2`
- Mischform wird vom Backend zu einer deduplizierten ID-Liste zusammengeführt.

**Semantik:** **UND** – es erscheinen nur Spots, die **alle** angegebenen Keyword-IDs in `keywordIds` haben. Zusätzlich muss der Name das Präfix erfüllen, wenn `namePrefix` gesetzt ist.

### GET `/curated-spots/:id`

Nur **ACTIVE** und nicht gelöscht; sonst **404** (gleiches Verhalten wie in der App).

---

## 6. Typische Fehlerbilder

| HTTP | Situation |
|------|-----------|
| 400 | Validation (`class-validator`), z. B. ungültige URL, leeres `name`, fehlendes **`address`** bei `POST`, fehlendes `q` bei Suggest |
| 401 | Token fehlt/ungültig |
| 403 | Rolle nicht `admin` / `super_admin` auf geschützter Route |
| 404 | Spot-ID unbekannt; oder Spot nicht `ACTIVE` auf `GET /curated-spots/:id` |

---

## 7. Checkliste für die Admin-UI-Implementierung

- [ ] HTTP-Client liest immer **`response.data`** (Interceptor).
- [ ] Admin-Routen nur für Nutzer mit Admin/Super-Admin anzeigen.
- [ ] Formular „Neuer Spot“: Pflichtfelder **`name`**, **`descriptionMarkdown`**, **`address`** (Straße, Hausnummer, PLZ, Stadt, Koordinaten) → `POST /curated-spots` → dann optional `images` / `video` Uploads.
- [ ] Keyword-Auswahl: `GET /spot-keywords/suggest?q=…` → gespeicherte Werte sind **`id`**, nicht der Anzeigename.
- [ ] Spot bearbeiten: Nach `GET /curated-spots/admin/:id` die **`keywordIds`** per **`GET /spot-keywords/:id`** (parallel, `encodeURIComponent`) in Namen auflösen; bei **404** z. B. Chip-Label „Unbekannt“, **`id`** für Speichern beibehalten.
- [ ] Zusätzliche freie Tags: `newKeywordNames` im Create/Patch mitschicken, wenn der User Text eintippt, der noch kein Keyword ist.
- [ ] Freigabe: `PATCH` mit `{ "status": "ACTIVE" }`.
- [ ] Löschen: `DELETE` = Soft-Delete; Liste ggf. clientseitig ausblenden oder `GET /curated-spots/admin` erneut laden.

---

## 8. Verwandte Projekt-Dokumentation

- **Flutter-App:** getrennte Integrationsguides – zuerst Anzeige testen, dann Schreibzugriff:
  - [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md) (nur Lesen)
  - [flutter-curated-spots-create-integration.md](./flutter-curated-spots-create-integration.md) (Spots anlegen/pflegen, Admin-Rolle)
- Architektur & Firebase-Konventionen: [architecture.md](./architecture.md)
- Projektweite Regeln (Tests, Guards, Notifications): [.cursorrules](../.cursorrules)
- Vergleichbares Admin-Pattern (CRUD + Auth): [taxi-stands-admin-integration.md](./taxi-stands-admin-integration.md)
