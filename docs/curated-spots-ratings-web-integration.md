# Kuratierte Spots – Web-Frontend: Admin-Bewertung & Nutzer-Bewertungs-Toggle

Dieser Guide fokussiert auf **Admin-Redaktionsbewertung** (1–5 Sterne) und den **Feature-Toggle**, mit dem Endnutzer:innen das einmalige Bewerten von Spots erlaubt oder verweigert wird. Vollständige Spot-API inkl. Keywords und Medien: [curated-spots-admin-integration.md](./curated-spots-admin-integration.md).

---

## 1. Globale Voraussetzungen

### Authentifizierung

- Header auf **jeder** Anfrage: `Authorization: Bearer <FirebaseIdToken>`.
- Token z. B. nach Login mit Firebase Web SDK: `await auth.currentUser?.getIdToken()`.

### Rollen

| Aktion | Erforderliche Rolle (`userType` im Profil) |
|--------|---------------------------------------------|
| Admin-Bewertung setzen / Spot bearbeiten | `admin` oder `super_admin` |
| Nutzer-Toggle **lesen** | beliebiger angemeldeter User |
| Nutzer-Toggle **ändern** (`PATCH`) | `admin` oder `super_admin` |

### Response-Envelope

Alle JSON-Antworten sind eingepackt:

```json
{
  "data": <payload>,
  "timestamp": "<ISO Berlin>"
}
```

Im Frontend immer **`body.data`** (nicht die Root) auswerten.

`BASE_URL` und Umgebungspräfixe: [README.md](../README.md).

---

## 2. Admin-Bewertung anzeigen

### Datenfelder am `CuratedSpot`

| Feld | Typ | Anzeige |
|------|-----|---------|
| `adminRating` | `number \| null` | `null` → „noch nicht vergeben“; sonst **1–5** Sterne |
| `adminRatedAt` | `string \| null` | ISO-Zeitpunkt der **letzten** Änderung an `adminRating` (z. B. formatiert als Datum/Uhrzeit); `null`, wenn keine Redaktionsbewertung |
| `userRatingAverage` | `number \| null` | optional: Durchschnitt Nutzerbewertungen (read-only im Admin) |
| `userRatingCount` | `number` | optional: Anzahl Nutzerstimmen |

### Wo die Daten herkommen

- Liste: **`GET {BASE_URL}/curated-spots/admin`** → `data` ist `CuratedSpot[]`.
- Detail / Bearbeiten: **`GET {BASE_URL}/curated-spots/admin/:id`** → `data` ist ein Objekt.

Keine zusätzlichen Endpunkte nötig; die Felder liegen direkt am Spot.

---

## 3. Admin-Bewertung setzen

### Regeln (wichtig für die UI)

- **Mehrfach änderbar:** `admin` / `super_admin` dürfen `adminRating` per `PATCH` anpassen oder mit **`null`** wieder entfernen.
- **Idempotent:** Sendet ihr im `PATCH` **dieselbe** Zahl wie bereits gespeichert (oder erneut `null`, wenn schon ohne Bewertung), ändert sich nichts (kein neuer `adminRatedAt`).
- **`adminRatedAt` nie mitsenden** – setzt nur das Backend bei jeder inhaltlichen Änderung von `adminRating`.
- Gültige Werte: Ganzzahl **1–5**, oder **`null`** zum Entfernen (entspricht Backend-Validierung).

### Beim Anlegen (optional)

**`POST {BASE_URL}/curated-spots`**

```json
{
  "name": "…",
  "descriptionMarkdown": "…",
  "address": { … },
  "adminRating": 4
}
```

`adminRating` ist optional. Fehlt sie, bleibt der Spot ohne Redaktionssterne (`null`), bis ihr sie per `PATCH` setzt.

### Beim Bearbeiten

**`PATCH {BASE_URL}/curated-spots/:id`**

```json
{ "adminRating": 5 }
```

Nach erfolgreicher Antwort enthält `data.adminRatedAt` den Zeitstempel der letzten Bewertungsänderung (bzw. `null`, wenn keine Bewertung).

### UI-Empfehlungen

- **Eingabe:** Sterne- oder Slider-Komponente 1–5; optional Aktion „Redaktionsbewertung entfernen“ (`PATCH` mit `adminRating: null`).
- Beim Speichern aktuellen Spot aus der Response übernehmen, damit `adminRatedAt` stimmt.

---

## 4. Feature-Toggle: Endnutzer dürfen bewerten

Das Toggle steuert, ob **Apps** (Web könnte dasselbe API nutzen) die Routen  
`GET/POST …/curated-spots/:id/my-user-rating` verwenden dürfen. **Aus** → Backend antwortet dort mit **503**.

### Einstellung lesen

**`GET {BASE_URL}/curated-spots/settings/user-ratings`**

- Auth: beliebig angemeldet.
- Response `data`:

```typescript
type CuratedSpotsUserRatingsSettings = {
  id: 'curated_spots_user_ratings_settings';
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
};
```

**Typischer Einsatz im Admin-Web:**

- Einstellungsseite „Kuratierte Spots“ / „Community-Bewertungen“: Toggle anzeigen und Status laden.
- Optional: Hinweistext, dass Nutzer:innen Spots nur **einmal** bewerten können, solange das Feature an ist.

### Toggle speichern

**`PATCH {BASE_URL}/curated-spots/settings/user-ratings`**

- Auth: **admin** oder **super_admin**.
- Body:

```json
{ "isEnabled": true }
```

Response: aktualisiertes Settings-Objekt in `data`.

### Berechtigung

Ohne Admin-Rolle liefert `PATCH` **403/404** je nach Rollenprüfung (wie andere geschützte Admin-Routen). Die genaue HTTP-Antwort bei fehlender Rolle sollte mit eurem bestehenden Fehlerhandling für Admin-Aufrufe konsistent sein.

---

## 5. TypeScript-Beispiele (Fetch)

```typescript
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Nicht angemeldet');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { data: T };
  if (!res.ok) {
    throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

/** Admin: Redaktionssterne setzen oder ändern (optional null zum Entfernen) */
export async function patchAdminRating(spotId: string, adminRating: number | null) {
  return api<CuratedSpot>(`/curated-spots/${encodeURIComponent(spotId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ adminRating }),
  });
}

/** Beliebig angemeldet: Toggle lesen */
export async function getUserRatingsFeatureSettings() {
  return api<CuratedSpotsUserRatingsSettings>('/curated-spots/settings/user-ratings');
}

/** Admin: Toggle ändern */
export async function patchUserRatingsFeature(isEnabled: boolean) {
  return api<CuratedSpotsUserRatingsSettings>('/curated-spots/settings/user-ratings', {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  });
}
```

`CuratedSpot` entspricht der API; siehe Feldliste in [curated-spots-admin-integration.md](./curated-spots-admin-integration.md#datenmodell-curatedspot-response--patch-logik).

---

## 6. Fehlerübersicht (Web)

| HTTP | Kontext |
|------|---------|
| 401 | Token fehlt/ungültig |
| 403 / 404 | Admin-Aktion ohne Rolle (wie bestehende Admin-Routen) |
| 400 | Validierung (z. B. `adminRating` außerhalb 1–5, wenn nicht `null`) |

Der Toggle-Endpunkt `PATCH` nutzt dieselbe Admin-Absicherung wie `PATCH /curated-spots/:id`.

---

## 7. Kurz-Checkliste Admin-UI

1. Spot-Liste/Detail aus `GET /curated-spots/admin` bzw. `…/admin/:id` – `adminRating` / `adminRatedAt` anzeigen.
2. Formular: Redaktionssterne bearbeitbar halten; optional Entfernen per `null`.
3. Nach Speichern: Response `data` in den lokalen State übernehmen.
4. Einstellungsseite: `GET` Toggle → Schalter binden → `PATCH` bei Änderung.
