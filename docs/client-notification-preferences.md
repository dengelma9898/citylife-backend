# Client Notification Preferences - API Dokumentation

## Übersicht

Diese Dokumentation beschreibt alle verfügbaren Notification-Präferenzen, die vom Client gesetzt werden können. Die Präferenzen steuern, welche Push-Notifications ein User erhält.

**Wichtig:** Alle Präferenzen sind standardmäßig `false` (wenn `undefined`). Notifications werden nur gesendet, wenn die Präferenz explizit auf `true` gesetzt ist.

---

## API Endpoint

### Notification-Präferenzen aktualisieren

**Endpoint:** `PATCH /users/:id/profile`

**Authorization:** Erforderlich (Firebase Auth Token)

**Request Body:**
```json
{
  "notificationPreferences": {
    "directMessages": true,
    "newBusinesses": false,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "newEvents": true,
    "eventUpdates": true,
    "newJobOffers": false,
    "newNews": false,
    "newSurveys": false
  }
}
```

**Response:** Aktualisiertes `UserProfile` Objekt

**Beispiel Request:**
```http
PATCH /users/{userId}/profile
Authorization: Bearer {firebaseToken}
Content-Type: application/json

{
  "notificationPreferences": {
    "directMessages": true,
    "newEvents": true
  }
}
```

**Hinweis:** Es können einzelne Präferenzen aktualisiert werden. Nicht gesendete Felder bleiben unverändert.

---

## Verfügbare Notification-Präferenzen

### 1. `directMessages`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Nachrichten in Direct Chats erhält.

**Notification-Typ:** `DIRECT_CHAT_MESSAGE`

**Wann wird die Notification gesendet:**
- Wenn eine neue Nachricht in einem Direct Chat empfangen wird
- Nur wenn der Chat nicht stummgeschaltet ist (`muted: false`)

**Beispiel:**
```json
{
  "notificationPreferences": {
    "directMessages": true
  }
}
```

---

### 2. `newBusinesses`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue aktive Businesses erhält.

**Notification-Typ:** `NEW_BUSINESS`

**Wann wird die Notification gesendet:**
- Wenn ein neues Business mit Status `ACTIVE` erstellt wird
- Wenn ein Business von `PENDING` zu `ACTIVE` geändert wird

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newBusinesses": true
  }
}
```

---

### 3. `directChatRequests`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Direct Chat-Anfragen erhält.

**Notification-Typ:** `DIRECT_CHAT_REQUEST`

**Wann wird die Notification gesendet:**
- Wenn ein anderer User eine Chat-Anfrage sendet (Status: `pending`)
- Nicht gesendet, wenn der User blockiert ist
- Nicht gesendet, wenn bereits ein Chat existiert

**Beispiel:**
```json
{
  "notificationPreferences": {
    "directChatRequests": true
  }
}
```

---

### 4. `contactRequestResponses`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications erhält, wenn ein Admin auf eine Contact Request antwortet.

**Notification-Typ:** `CONTACT_REQUEST_RESPONSE`

**Wann wird die Notification gesendet:**
- Wenn ein Admin eine Nachricht zu einer Contact Request hinzufügt
- Nur wenn der `responded` Status von `false` zu `true` wechselt
- Nicht für eigene Nachrichten des Users

**Beispiel:**
```json
{
  "notificationPreferences": {
    "contactRequestResponses": true
  }
}
```

---

### 5. `newEvents`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Events erhält.

**Notification-Typ:** `NEW_EVENT`

**Wann wird die Notification gesendet:**
- Wenn ein neues Event erstellt wird
- Optional: Gefiltert nach Stadt (`currentCityId`)
- Optional: Gefiltert nach Event-Kategorie basierend auf User-Präferenzen

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newEvents": true
  }
}
```

---

### 6. `eventUpdates`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications erhält, wenn ein favorisiertes Event aktualisiert wird.

**Notification-Typ:** `FAV_EVENT_UPDATE`

**Wann wird die Notification gesendet:**
- Wenn ein Event aktualisiert wird, das der User favorisiert hat (`favoriteEventIds`)
- Unterscheidung nach Update-Typ: `TIME`, `LOCATION`, `DESCRIPTION`, `OTHER`

**Beispiel:**
```json
{
  "notificationPreferences": {
    "eventUpdates": true
  }
}
```

---

### 7. `newJobOffers`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Job-Angebote erhält.

**Notification-Typ:** `NEW_JOB_OFFER`

**Wann wird die Notification gesendet:**
- Wenn ein neues Job-Angebot erstellt wird
- Optional: Gefiltert nach Job-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newJobOffers": true
  }
}
```

---

### 8. `newNews`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue News-Artikel erhält.

**Notification-Typ:** `NEW_NEWS`

**Wann wird die Notification gesendet:**
- Wenn ein neuer News-Artikel erstellt wird
- Optional: Gefiltert nach News-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newNews": true
  }
}
```

---

### 9. `newSurveys`

**Typ:** `boolean | undefined`  
**Default:** `false` (wenn `undefined`)

**Beschreibung:**  
Steuert, ob der User Push-Notifications für neue Umfragen (Special Polls) erhält.

**Notification-Typ:** `NEW_SURVEY`

**Wann wird die Notification gesendet:**
- Wenn eine neue Umfrage erstellt wird
- Optional: Gefiltert nach Umfrage-Kategorie
- Optional: Gefiltert nach Stadt/Location

**Beispiel:**
```json
{
  "notificationPreferences": {
    "newSurveys": true
  }
}
```

---

## TypeScript Interface

Für TypeScript-Clients kann folgendes Interface verwendet werden:

```typescript
export interface NotificationPreferences {
  directMessages?: boolean;
  newBusinesses?: boolean;
  directChatRequests?: boolean;
  contactRequestResponses?: boolean;
  newEvents?: boolean;
  eventUpdates?: boolean;
  newJobOffers?: boolean;
  newNews?: boolean;
  newSurveys?: boolean;
}
```

---

## Vollständiges Beispiel

### Alle Präferenzen aktivieren

```json
{
  "notificationPreferences": {
    "directMessages": true,
    "newBusinesses": true,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "newEvents": true,
    "eventUpdates": true,
    "newJobOffers": true,
    "newNews": true,
    "newSurveys": true
  }
}
```

### Alle Präferenzen deaktivieren

```json
{
  "notificationPreferences": {
    "directMessages": false,
    "newBusinesses": false,
    "directChatRequests": false,
    "contactRequestResponses": false,
    "newEvents": false,
    "eventUpdates": false,
    "newJobOffers": false,
    "newNews": false,
    "newSurveys": false
  }
}
```

### Nur wichtige Präferenzen aktivieren

```json
{
  "notificationPreferences": {
    "directMessages": true,
    "directChatRequests": true,
    "contactRequestResponses": true,
    "eventUpdates": true
  }
}
```

---

## Wichtige Hinweise

### Default-Verhalten

- **Alle Präferenzen sind standardmäßig `false`** (wenn `undefined`)
- Notifications werden **nur gesendet**, wenn die Präferenz explizit auf `true` gesetzt ist
- Wenn eine Präferenz nicht gesetzt ist (`undefined`), wird keine Notification gesendet

### Teilweise Updates

- Es können einzelne Präferenzen aktualisiert werden
- Nicht gesendete Felder bleiben unverändert
- Beispiel: Nur `directMessages` aktualisieren, ohne andere Präferenzen zu ändern

### FCM Token Management

Damit Notifications empfangen werden können, muss der Client:

1. **FCM Token registrieren:**
   ```
   POST /users/:id/fcm-token
   Body: { "token": "...", "deviceId": "...", "platform": "ios" | "android" | "web" }
   ```

2. **FCM Token entfernen** (bei Logout oder App-Deinstallation):
   ```
   DELETE /users/:id/fcm-token/:deviceId
   ```

Mehr Informationen: Siehe `docs/client-business-notifications-integration.md`

---

## Notification Payload Struktur

Jede Notification enthält folgende Struktur:

```typescript
{
  title: string;        // Titel der Notification
  body: string;         // Text der Notification
  data: {
    type: string;       // Notification-Typ (z.B. "DIRECT_CHAT_MESSAGE")
    // ... type-specific fields
  }
}
```

Die `data`-Felder variieren je nach Notification-Typ. Siehe `docs/notification-suggestions.md` für Details zu jedem Typ.

---

## Implementierungsstatus

| Präferenz | Status | Notification-Typ |
|-----------|--------|------------------|
| `directMessages` | ✅ Implementiert | `DIRECT_CHAT_MESSAGE` |
| `newBusinesses` | ✅ Implementiert | `NEW_BUSINESS` |
| `directChatRequests` | ✅ Implementiert | `DIRECT_CHAT_REQUEST` |
| `contactRequestResponses` | ✅ Implementiert | `CONTACT_REQUEST_RESPONSE` |
| `newEvents` | ✅ Implementiert | `NEW_EVENT` |
| `eventUpdates` | ✅ Implementiert | `FAV_EVENT_UPDATE` |
| `newJobOffers` | ✅ Implementiert | `NEW_JOB_OFFER` |
| `newNews` | ✅ Implementiert | `NEW_NEWS` |
| `newSurveys` | ✅ Implementiert | `NEW_SURVEY` |

---

## Fehlerbehandlung

### Mögliche Fehler

**400 Bad Request:**
- Ungültige Präferenz-Werte (nicht `boolean`)
- Validierungsfehler im Request Body

**401 Unauthorized:**
- Fehlender oder ungültiger Authorization Header
- Ungültiges Firebase Token

**404 Not Found:**
- User mit angegebener ID existiert nicht

**Beispiel Error Response:**
```json
{
  "statusCode": 400,
  "message": ["notificationPreferences.directMessages must be a boolean value"],
  "error": "Bad Request"
}
```

---

## Best Practices für Clients

1. **Initiale Einstellungen:** Beim ersten App-Start alle Präferenzen explizit setzen (nicht `undefined` lassen)

2. **UI-Feedback:** Nach dem Update die aktualisierten Präferenzen vom Server abrufen und in der UI anzeigen

3. **Offline-Support:** Änderungen lokal speichern und beim nächsten Online-Status synchronisieren

4. **User Experience:** 
   - Klare Beschreibungen für jede Präferenz in der UI
   - Gruppierung nach Kategorien (z.B. "Chats", "Events", "News")
   - Möglichkeit, alle Präferenzen auf einmal zu aktivieren/deaktivieren

5. **FCM Token:** 
   - Token bei App-Start registrieren
   - Token bei Logout entfernen
   - Token-Refresh behandeln

---

**Erstellt:** 2024  
**Zuletzt aktualisiert:** 2024  
**Version:** 1.0
