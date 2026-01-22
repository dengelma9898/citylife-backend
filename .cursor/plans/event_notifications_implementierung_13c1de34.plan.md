---
name: Event Notifications Implementierung
overview: Implementierung von NEW_EVENT und FAV_EVENT_UPDATE Notifications für das Events-Modul, analog zu den bestehenden NEW_BUSINESS und DIRECT_CHAT_REQUEST Implementierungen.
todos:
  - id: "1"
    content: Notification Interfaces erstellen (event-notification-data.interface.ts, event-update-notification-data.interface.ts)
    status: completed
  - id: "2"
    content: NotificationPreferences Interface und DTO erweitern (newEvents, eventUpdates)
    status: completed
  - id: "3"
    content: "EventsModule erweitern: NotificationsModule importieren"
    status: completed
  - id: "4"
    content: "EventsService erweitern: NEW_EVENT Notification implementieren (sendNewEventNotification Methode)"
    status: completed
  - id: "5"
    content: "EventsService erweitern: FAV_EVENT_UPDATE Notification implementieren (sendEventUpdateNotification Methode)"
    status: completed
  - id: "6"
    content: "EventsService.create() erweitern: sendNewEventNotification() aufrufen"
    status: completed
  - id: "7"
    content: "EventsService.update() erweitern: sendEventUpdateNotification() aufrufen (mit altem Event Vergleich)"
    status: completed
  - id: "8"
    content: Tests für NEW_EVENT Notification hinzufügen (events.service.spec.ts)
    status: completed
  - id: "9"
    content: Tests für FAV_EVENT_UPDATE Notification hinzufügen (events.service.spec.ts)
    status: completed
  - id: "10"
    content: "Dokumentation aktualisieren: Implementierungsstatus in notification-suggestions.md markieren"
    status: completed
---

# Implementierungsplan: NEW_EVENT und FAV_EVENT_UPDATE Notifications

## Übersicht

Implementierung von zwei neuen Notification-Typen für Events:

1. **NEW_EVENT**: Broadcast-Notification an alle User mit aktivierter Präferenz, wenn ein neues Event erstellt wird
2. **FAV_EVENT_UPDATE**: Targeted Notification an User, die ein Event favorisiert haben, wenn das Event aktualisiert wird

## Architektur

Die Implementierung folgt dem bestehenden Pattern aus `NEW_BUSINESS` und `DIRECT_CHAT_REQUEST`:

```
EventsService.create() → sendNewEventNotification()
  └─> getAllUserProfilesWithIds() → Filter nach newEvents Präferenz
      └─> notificationService.sendToUser() für jeden User

EventsService.update() → sendEventUpdateNotification()
  └─> getAllUserProfilesWithIds() → Filter nach favoriteEventIds
      └─> Filter nach eventUpdates Präferenz
          └─> notificationService.sendToUser() für jeden User
```

## Implementierungsschritte

### 1. Notification Interfaces erstellen

**Datei:** `src/notifications/domain/interfaces/event-notification-data.interface.ts`

- Interface für NEW_EVENT Notification Data
- Felder: `type: 'NEW_EVENT'`, `eventId`, `eventTitle`, `categoryId`

**Datei:** `src/notifications/domain/interfaces/fav-event-update-notification-data.interface.ts`

- Interface für FAV_EVENT_UPDATE Notification Data
- Felder: `type: 'FAV_EVENT_UPDATE'`, `eventId`, `eventTitle`, `updateType`

### 2. NotificationPreferences Interface erweitern

**Datei:** `src/users/interfaces/user-profile.interface.ts`

- `newEvents?: boolean` hinzufügen
- `eventUpdates?: boolean` hinzufügen

**Datei:** `src/users/dto/notification-preferences.dto.ts`

- DTO entsprechend erweitern

### 3. EventsModule erweitern

**Datei:** `src/events/events.module.ts`

- `NotificationsModule` mit `forwardRef()` importieren (wegen circular dependency mit UsersModule)
- `NotificationService` und `UsersService` sind bereits verfügbar (UsersModule bereits importiert)

### 4. EventsService erweitern

**Datei:** `src/events/events.service.ts`

#### 4.1 Dependencies injizieren

- `NotificationService` injizieren
- `UsersService` bereits verfügbar (über EventsModule → UsersModule)

#### 4.2 NEW_EVENT Notification implementieren

- Methode: `private async sendNewEventNotification(event: Event): Promise<void>`
- Pattern analog zu `BusinessesService.sendNewBusinessNotification()`
- Alle User mit `getAllUserProfilesWithIds()` abrufen
- Filtern nach `notificationPreferences.newEvents` (Default: `true` wenn `undefined`)
- Notification senden mit:
  - Title: "Neues Event verfügbar"
  - Body: "{eventTitle} - {categoryName}" (optional: Kategorie-Name statt ID)
  - Data: `{ type: 'NEW_EVENT', eventId, eventTitle, categoryId }`
- In `create()` nach erfolgreichem Erstellen aufrufen

#### 4.3 FAV_EVENT_UPDATE Notification implementieren

- Methode: `private async sendEventUpdateNotification(event: Event, oldEvent: Event): Promise<void>`
- Alle User mit `getAllUserProfilesWithIds()` abrufen
- Filtern nach User, die `eventId` in `favoriteEventIds` haben
- Zusätzlich filtern nach `notificationPreferences.eventUpdates` (Default: `true` wenn `undefined`)
- Update-Typ bestimmen (optional):
  - `TIME`: Wenn `dailyTimeSlots` geändert wurde
  - `LOCATION`: Wenn `location` geändert wurde
  - `DESCRIPTION`: Wenn `title` oder `description` geändert wurde
  - `OTHER`: Für alle anderen Änderungen
- Notification senden mit:
  - Title: "Event wurde aktualisiert"
  - Body: "{eventTitle} wurde aktualisiert"
  - Data: `{ type: 'FAV_EVENT_UPDATE', eventId, eventTitle, updateType }`
- In `update()` nach erfolgreichem Update aufrufen
- **Wichtig:** Altes Event vor dem Update speichern, um Änderungen zu erkennen

### 5. Tests implementieren

**Datei:** `src/events/events.service.spec.ts`

#### 5.1 NEW_EVENT Tests

- Test: Notification wird gesendet, wenn Präferenz aktiviert ist
- Test: Notification wird nicht gesendet, wenn Präferenz deaktiviert ist
- Test: Notification wird gesendet, wenn Präferenz `undefined` ist (Default: `true`)
- Test: Keine Notification, wenn keine User mit aktivierter Präferenz existieren
- Test: Error-Handling bei Notification-Versand

#### 5.2 FAV_EVENT_UPDATE Tests

- Test: Notification wird nur an User mit favorisiertem Event gesendet
- Test: Notification wird nur gesendet, wenn Präferenz aktiviert ist
- Test: Notification wird nicht gesendet, wenn Event nicht favorisiert ist
- Test: Update-Typ wird korrekt erkannt (TIME, LOCATION, DESCRIPTION, OTHER)
- Test: Keine Notification, wenn keine User das Event favorisiert haben
- Test: Error-Handling bei Notification-Versand

### 6. Dokumentation aktualisieren

**Datei:** `docs/notification-suggestions.md`

- Punkt 3 (NEW_EVENT): Implementierungsstatus auf ✅ setzen
- Punkt 4 (FAV_EVENT_UPDATE): Implementierungsstatus auf ✅ setzen
- In "Aktuell implementiert" Liste ergänzen
- In Notification Preferences Schema Status aktualisieren

## Technische Details

### Default-Verhalten für Präferenzen

**WICHTIG:** Im Dokument steht für beide Notifications Default `true`, aber die allgemeine Regel besagt Default `false`.

**Entscheidung:** Wir folgen dem Dokument und verwenden Default `true` für beide:

- `newEvents`: Default `true` (wenn `undefined`)
- `eventUpdates`: Default `true` (wenn `undefined`)

Dies entspricht dem Pattern von `CONTACT_REQUEST_RESPONSE` (Default `true`).

### Circular Dependencies

- `EventsModule` importiert bereits `UsersModule` mit `forwardRef()`
- `NotificationsModule` importiert `UsersModule` mit `forwardRef()`
- `EventsModule` muss `NotificationsModule` mit `forwardRef()` importieren
- `UsersService` kann direkt injiziert werden (bereits über EventsModule verfügbar)

### Event-Kategorie Name

Optional: Für NEW_EVENT könnte der Kategorie-Name statt der ID angezeigt werden. Dafür müsste `EventCategoriesService` injiziert werden. Für die erste Implementierung verwenden wir die `categoryId` (kann später erweitert werden).

### Update-Typ Erkennung

Für EVENT_UPDATE können wir optional erkennen, welche Felder geändert wurden:

- Vergleich zwischen `oldEvent` und `newEvent`
- Bestimmung des `updateType` basierend auf geänderten Feldern
- Falls zu komplex, verwenden wir `updateType: 'OTHER'` für alle Updates

## Dateien die geändert/erstellt werden

### Neue Dateien

- `src/notifications/domain/interfaces/event-notification-data.interface.ts`
- `src/notifications/domain/interfaces/fav-event-update-notification-data.interface.ts`

### Zu ändernde Dateien

- `src/users/interfaces/user-profile.interface.ts` - NotificationPreferences erweitern
- `src/users/dto/notification-preferences.dto.ts` - DTO erweitern
- `src/events/events.module.ts` - NotificationsModule importieren
- `src/events/events.service.ts` - Notification-Logik hinzufügen
- `src/events/events.service.spec.ts` - Tests hinzufügen
- `docs/notification-suggestions.md` - Dokumentation aktualisieren

## Abhängigkeiten

- `NotificationsModule` muss bereits existieren ✅
- `UsersService.getAllUserProfilesWithIds()` muss existieren ✅
- `NotificationService.sendToUser()` muss existieren ✅
- `EventCategoriesService` (optional, für Kategorie-Name)

## Risiken und Überlegungen

1. **Performance:** Bei vielen Usern könnte `getAllUserProfilesWithIds()` langsam sein. Für FAV_EVENT_UPDATE könnten wir später eine optimierte Query implementieren, die direkt nach `favoriteEventIds` filtert.

2. **Update-Typ Erkennung:** Die Erkennung von Update-Typen könnte komplex werden. Für die erste Implementierung können wir mit `'OTHER'` starten und später erweitern.

3. **Default-Werte:** Inkonsistenz zwischen Dokument (Default `true`) und allgemeiner Regel (Default `false`). Wir folgen dem Dokument für diese beiden Notifications.