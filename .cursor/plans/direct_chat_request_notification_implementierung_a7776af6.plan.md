---
name: DIRECT_CHAT_REQUEST Notification Implementierung
overview: Implementierung der DIRECT_CHAT_REQUEST Notification, die gesendet wird, wenn ein User eine Chat-Anfrage an einen anderen User sendet. Die Notification wird nur gesendet, wenn der Chat mit Status 'pending' erstellt wird und der eingeladene User die Präferenz aktiviert hat.
todos:
  - id: create-notification-interface
    content: Notification Interface DirectChatRequestNotificationData erstellen
    status: completed
  - id: extend-notification-preferences
    content: NotificationPreferences Interface und DTO um directChatRequests erweitern
    status: completed
  - id: implement-notification-service
    content: "DirectChatsService erweitern: NotificationService injizieren und sendDirectChatRequestNotification() Methode implementieren"
    status: completed
  - id: integrate-notification-call
    content: Notification-Versendung in createChat() nach erfolgreicher Chat-Erstellung integrieren
    status: completed
  - id: update-tests
    content: Tests für Notification-Versendung hinzufügen und bestehende Tests aktualisieren
    status: completed
  - id: update-documentation
    content: "notification-suggestions.md aktualisieren: Status auf implementiert setzen"
    status: completed
---

# DIRECT_CHAT_REQUEST Notification Implementierung

## Übersicht

Implementierung der `DIRECT_CHAT_REQUEST` Notification gemäß [notification-suggestions.md](docs/notification-suggestions.md). Die Notification wird gesendet, wenn User A eine Chat-Anfrage an User B sendet (Status: `pending`).

## Zu implementierende Komponenten

### 1. Notification Interface erstellen

**Datei:** `src/notifications/domain/interfaces/direct-chat-request-notification-data.interface.ts`

Neues Interface nach dem Pattern von `BusinessNotificationData`:

```typescript
export interface DirectChatRequestNotificationData {
  type: 'DIRECT_CHAT_REQUEST';
  chatId: string;
  senderId: string;
  senderName: string;
}
```

### 2. Notification Preferences erweitern

**Dateien:**

- `src/users/interfaces/user-profile.interface.ts` - `NotificationPreferences` Interface erweitern
- `src/users/dto/notification-preferences.dto.ts` - DTO erweitern

Hinzufügen von `directChatRequests?: boolean` zu beiden Dateien.

### 3. DirectChatsService erweitern

**Datei:** `src/direct-chats/application/services/direct-chats.service.ts`

**Änderungen:**

- `NotificationService` injizieren (mit `forwardRef()` falls nötig)
- Neue private Methode `sendDirectChatRequestNotification()` erstellen
- In `createChat()` nach erfolgreicher Chat-Erstellung (nach Zeile 67) die Notification senden

**Implementierungslogik:**

- Notification nur senden, wenn Chat erfolgreich erstellt wurde
- **Notification Preferences prüfen** (nach Pattern von `DirectMessagesService.sendMessageNotification()`):
  ```typescript
  const invitedUserProfile = await this.usersService.getUserProfile(dto.invitedUserId);
  const notificationPreferences = invitedUserProfile.notificationPreferences;
  const directChatRequestsEnabled =
    notificationPreferences?.directChatRequests !== undefined
      ? notificationPreferences.directChatRequests
      : false; // Default: false wenn undefined
  if (!directChatRequestsEnabled) {
    this.logger.debug(`Direct chat requests notifications disabled for user ${dto.invitedUserId}`);
    return; // Keine Notification senden
  }
  ```

- Sender-Name aus `userProfile.name` holen (falls nicht vorhanden, Fallback verwenden)
- Empfänger: `dto.invitedUserId`
- Notification Payload:
  - title: "Neue Chat-Anfrage"
  - body: "{senderName} möchte mit dir chatten"
  - data: `DirectChatRequestNotificationData` mit `chatId`, `senderId`, `senderName`

**Besonderheiten:**

- Nicht senden, wenn User blockiert ist (wird bereits in `createChat()` geprüft)
- Nicht senden, wenn Chat bereits existiert (wird bereits in `createChat()` geprüft)
- Fehlerbehandlung: Notification-Fehler sollten nicht die Chat-Erstellung verhindern (try-catch)

### 4. DirectChatsModule prüfen

**Datei:** `src/direct-chats/direct-chats.module.ts`

`NotificationsModule` wird bereits importiert (Zeile 19), keine Änderung nötig.

### 5. Tests aktualisieren

**Datei:** `src/direct-chats/application/services/direct-chats.service.spec.ts`

**Änderungen:**

- `NotificationService` Mock hinzufügen
- Test für erfolgreiche Notification-Versendung hinzufügen
- Test für deaktivierte Präferenz hinzufügen
- Test für fehlende Präferenz (default: false) hinzufügen
- Test für fehlgeschlagene Notification (sollte Chat-Erstellung nicht verhindern)

### 6. Dokumentation aktualisieren

**Datei:** `docs/notification-suggestions.md`

**Änderungen:**

- Status von `DIRECT_CHAT_REQUEST` in der Implementierungs-Priorität auf "✅ Implementiert" ändern
- In der Übersicht "Aktuell implementiert" hinzufügen
- Optional: Implementierungsdetails dokumentieren

## Wichtige Änderung: Default-Verhalten

**Default für Notification Preferences:** `false` (wenn `undefined`)

Dies gilt für alle Notification Preferences, nicht nur für `directChatRequests`. Die bestehenden Implementierungen (`DIRECT_CHAT_MESSAGE`, `NEW_BUSINESS`) verwenden aktuell `true` als Default und sollten ebenfalls angepasst werden, um konsistent zu sein.

## Implementierungsreihenfolge

1. Notification Interface erstellen
2. Notification Preferences erweitern (Interface + DTO)
3. DirectChatsService erweitern (NotificationService injizieren + Methode implementieren)
4. Tests aktualisieren
5. Dokumentation aktualisieren
6. **Optional:** Bestehende Implementierungen (`DirectMessagesService`, `BusinessesService`) auf Default `false` umstellen

## Technische Details

### Notification Service Injection

Da `DirectChatsModule` bereits `NotificationsModule` importiert und `UsersModule` mit `forwardRef()` verwendet, sollte die Injection funktionieren. Falls circular dependency Probleme auftreten, `forwardRef()` für `NotificationService` verwenden.

### Fehlerbehandlung

Notification-Versendung sollte in einem try-catch Block erfolgen, damit Fehler bei der Notification-Versendung die Chat-Erstellung nicht verhindern. Logging für Debugging hinzufügen.

### Pattern-Konsistenz

Die Implementierung folgt dem gleichen Pattern wie `DIRECT_CHAT_MESSAGE` und `NEW_BUSINESS` Notifications:

- **Notification Preferences Prüfung**: Nach dem Pattern aus `DirectMessagesService.sendMessageNotification()` (Zeilen 82-90), aber mit Default `false` statt `true`
  - User Profile laden
  - `notificationPreferences.directChatRequests` prüfen
  - **Default: `false` wenn `undefined`** (geändert von bisherigem `true` Default)
  - Early return wenn deaktiviert oder undefined
- Notification-Versendung nach erfolgreicher Operation
- Fehlerbehandlung ohne Operation zu verhindern (try-catch Block)
- Logging für Debugging hinzufügen