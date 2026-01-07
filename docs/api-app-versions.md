# App Versions API Dokumentation

## Übersicht

Das App Versions Modul ermöglicht es, die Mindestversion der App zu verwalten und Clients zu prüfen, ob ein Update erforderlich ist.

## Endpunkte

### 1. Version Check (Öffentlich)

**Endpoint:** `GET /app-versions/check`

**Beschreibung:** Prüft, ob die übergebene Client-Version ein Update benötigt.

**Authentifizierung:** Erforderlich (mindestens anonym)

**Query Parameter:**
- `version` (string, required): Die aktuelle App-Version im Format `X.Y.Z` oder `X.Y.Z (Build Nummer)`
  - Beispiel: `1.2.3` oder `1.2.3 (123)`
  - Die Build-Nummer wird ignoriert

**Response:**
```typescript
{
  requiresUpdate: boolean
}
```

**Beispiele:**

```http
GET /app-versions/check?version=1.2.3
```

**Response (kein Update erforderlich):**
```json
{
  "requiresUpdate": false
}
```

**Response (Update erforderlich):**
```json
{
  "requiresUpdate": true
}
```

**Fehler:**
- `400 Bad Request`: Wenn der `version` Parameter fehlt oder ungültig ist
  ```json
  {
    "statusCode": 400,
    "message": "Version parameter is required"
  }
  ```

---

### 2. Mindestversion abrufen (Super Admin)

**Endpoint:** `GET /app-versions/admin/minimum-version`

**Beschreibung:** Gibt die aktuell konfigurierte Mindestversion zurück.

**Authentifizierung:** Erforderlich (Super Admin)

**Response:**
```typescript
{
  id: string;
  minimumVersion: string;  // Format: "X.Y.Z"
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

**Beispiel:**

```http
GET /app-versions/admin/minimum-version
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "id": "current",
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Response (keine Version konfiguriert):**
```json
null
```

---

### 3. Mindestversion setzen (Super Admin)

**Endpoint:** `POST /app-versions/admin/minimum-version`

**Beschreibung:** Setzt die Mindestversion für die App. Wenn bereits eine Version existiert, wird sie aktualisiert.

**Authentifizierung:** Erforderlich (Super Admin)

**Request Body:**
```typescript
{
  minimumVersion: string  // Format: "X.Y.Z" (z.B. "1.3.0")
}
```

**Response:**
```typescript
{
  id: string;
  minimumVersion: string;
  createdAt: string;
  updatedAt: string;
}
```

**Beispiel:**

```http
POST /app-versions/admin/minimum-version
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "minimumVersion": "1.3.0"
}
```

**Response:**
```json
{
  "id": "current",
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Fehler:**
- `400 Bad Request`: Wenn `minimumVersion` fehlt oder ungültig ist
  ```json
  {
    "statusCode": 400,
    "message": "minimumVersion is required"
  }
  ```
  
  ```json
  {
    "statusCode": 400,
    "message": "Invalid version format: invalid. Expected format: X.Y.Z"
  }
  ```

---

## DTOs

### CheckVersionResponseDto

```typescript
export interface CheckVersionResponseDto {
  requiresUpdate: boolean;
}
```

### SetMinimumVersionDto

```typescript
export interface SetMinimumVersionDto {
  minimumVersion: string;  // Format: "X.Y.Z"
}
```

### AppVersion Entity

```typescript
export interface AppVersionProps {
  id: string;
  minimumVersion: string;  // Format: "X.Y.Z"
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

---

## Versionsvergleich

Der Versionsvergleich folgt dem Semantic Versioning Format (X.Y.Z):

- **Major Version (X)**: Breaking Changes
- **Minor Version (Y)**: Neue Features (rückwärtskompatibel)
- **Patch Version (Z)**: Bugfixes

**Vergleichslogik:**
- Version `1.2.3` < `1.3.0` → Update erforderlich
- Version `1.2.3` = `1.2.3` → Kein Update erforderlich
- Version `1.3.0` > `1.2.3` → Kein Update erforderlich

**Beispiele:**
- Mindestversion: `1.3.0`
  - Client `1.2.9` → `requiresUpdate: true`
  - Client `1.3.0` → `requiresUpdate: false`
  - Client `1.3.1` → `requiresUpdate: false`
  - Client `2.0.0` → `requiresUpdate: false`

---

## Verwendung in Client-Apps

### iOS/Android App Integration

```typescript
// Beispiel: TypeScript/JavaScript
async function checkAppVersion(): Promise<boolean> {
  const currentVersion = getAppVersion(); // z.B. "1.2.3 (123)"
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/app-versions/check?version=${encodeURIComponent(currentVersion)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`, // Anonym oder authentifiziert
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: CheckVersionResponseDto = await response.json();
    
    if (data.requiresUpdate) {
      // Zeige Update-Dialog an
      showUpdateDialog();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking app version:', error);
    // Bei Fehler: App weiterhin nutzbar
    return false;
  }
}
```

---

## Firebase Storage

Die Mindestversion wird in Firebase Firestore gespeichert:

**Collection:** `app_versions`
**Document ID:** `current`

**Dokumentstruktur:**
```json
{
  "minimumVersion": "1.3.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

---

## Fehlerbehandlung

### Client-Version Check

| HTTP Status | Beschreibung | Lösung |
|------------|--------------|--------|
| 400 | Ungültiges Versionsformat | Versionsstring im Format `X.Y.Z` oder `X.Y.Z (Build)` senden |
| 400 | Version Parameter fehlt | `version` Query Parameter hinzufügen |
| 401 | Nicht authentifiziert | Firebase Token im Authorization Header senden |

### Admin Endpoints

| HTTP Status | Beschreibung | Lösung |
|------------|--------------|--------|
| 400 | Ungültiges Versionsformat | `minimumVersion` im Format `X.Y.Z` senden |
| 400 | Parameter fehlt | `minimumVersion` im Request Body senden |
| 401 | Nicht authentifiziert | Firebase Token im Authorization Header senden |
| 403 | Keine Berechtigung | Super Admin Token verwenden |

---

## Best Practices

1. **Version Check beim App-Start**: Prüfe die Version beim App-Start oder nach dem Login
2. **Fehlerbehandlung**: Bei Fehlern sollte die App weiterhin nutzbar sein (graceful degradation)
3. **Caching**: Cache das Ergebnis für eine kurze Zeit, um unnötige Requests zu vermeiden
4. **Update-Dialog**: Zeige einen benutzerfreundlichen Dialog, der zum App Store führt
5. **Build-Nummer**: Die Build-Nummer wird automatisch ignoriert, kann aber trotzdem mitgesendet werden

