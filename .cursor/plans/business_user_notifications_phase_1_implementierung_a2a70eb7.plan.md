---
name: Business User Notifications Phase 1 Implementierung
overview: Implementierung von BUSINESS_ACTIVATED und BUSINESS_CONTACT_REQUEST_RESPONSE Notifications für Business User. Erweitert bestehende Services um Business-spezifische Notifications und fügt Notification Preferences für Business User hinzu.
todos:
  - id: create-notification-interfaces
    content: "Notification Interfaces erstellen: BusinessActivatedNotificationData und BusinessContactRequestResponseNotificationData"
    status: completed
  - id: extend-business-user-interface
    content: BusinessUser Interface um notificationPreferences erweitern und BusinessUserNotificationPreferences Interface erstellen
    status: completed
  - id: extend-notification-preferences-dto
    content: NotificationPreferencesDto und BusinessUserNotificationPreferencesDto erweitern
    status: completed
  - id: implement-business-activated-notification
    content: BusinessesService.sendBusinessActivatedNotification() Methode implementieren
    status: completed
  - id: integrate-business-activated-in-update-status
    content: BusinessesService.updateStatus() erweitern um Business User Notifications zu senden
    status: completed
  - id: implement-business-contact-request-notification
    content: ContactService.sendBusinessContactRequestResponseNotification() Methode implementieren
    status: completed
  - id: integrate-business-contact-request-in-contact-service
    content: ContactService.sendContactRequestResponseNotification() erweitern um Business-spezifische Notifications
    status: completed
  - id: add-business-activated-tests
    content: Tests für BUSINESS_ACTIVATED Notification in businesses.service.spec.ts hinzufügen
    status: completed
  - id: add-business-contact-request-tests
    content: Tests für BUSINESS_CONTACT_REQUEST_RESPONSE Notification in contact.service.spec.ts hinzufügen
    status: completed
  - id: update-documentation
    content: docs/business-user-notifications.md aktualisieren mit Implementierungsstatus
    status: completed
---

# Business User Notifications Phase 1 - Implementierungsplan

## Übersicht

Implementierung von zwei kritischen Notification-Typen für Business User:

1. **BUSINESS_ACTIVATED**: Benachrichtigung wenn eigenes Business von PENDING zu ACTIVE geschaltet wird
2. **BUSINESS_CONTACT_REQUEST_RESPONSE**: Benachrichtigung bei Admin-Antworten auf BUSINESS_CLAIM/BUSINESS_REQUEST Anfragen

## Architektur

```
BusinessesService.updateStatus()
  └─> sendBusinessActivatedNotification()
      └─> Finde Business User mit businessIds.includes(businessId)
          └─> Prüfe notificationPreferences.businessActivated (Default: false)
              └─> NotificationService.sendToUser()

ContactService.addAdminResponse() / addMessage()
  └─> sendContactRequestResponseNotification()
      └─> Prüfe ob Business User und Request-Typ BUSINESS_CLAIM/BUSINESS_REQUEST
          └─> sendBusinessContactRequestResponseNotification()
              └─> Prüfe notificationPreferences.businessContactRequestResponses (Default: false)
                  └─> NotificationService.sendToUser()
```

## Implementierungsschritte

### 1. Notification Interfaces erstellen

**Datei:** `src/notifications/domain/interfaces/business-activated-notification-data.interface.ts`

- Interface `BusinessActivatedNotificationData` mit:
  - `type: 'BUSINESS_ACTIVATED'`
  - `businessId: string`
  - `businessName: string`
  - `previousStatus: 'PENDING'`
  - `newStatus: 'ACTIVE'`

**Datei:** `src/notifications/domain/interfaces/business-contact-request-response-notification-data.interface.ts`

- Interface `BusinessContactRequestResponseNotificationData` mit:
  - `type: 'BUSINESS_CONTACT_REQUEST_RESPONSE'`
  - `contactRequestId: string`
  - `requestType: 'BUSINESS_CLAIM' | 'BUSINESS_REQUEST'`
  - `businessId?: string`
  - `businessName?: string`

### 2. BusinessUser Interface erweitern

**Datei:** `src/users/interfaces/business-user.interface.ts`

- `notificationPreferences?: BusinessUserNotificationPreferences` hinzufügen
- Optional: `fcmTokens?: FcmToken[]` für zukünftige FCM Token Unterstützung

**Neue Datei:** `src/users/interfaces/business-user-notification-preferences.interface.ts`

- Interface `BusinessUserNotificationPreferences` mit:
  - `businessActivated?: boolean`
  - `businessContactRequestResponses?: boolean`
  - (Zukünftige Felder für Phase 2/3)

### 3. NotificationPreferencesDto erweitern

**Datei:** `src/users/dto/notification-preferences.dto.ts`

- `businessActivated?: boolean` hinzufügen
- `businessContactRequestResponses?: boolean` hinzufügen

**Neue Datei:** `src/users/dto/business-user-notification-preferences.dto.ts`

- DTO `BusinessUserNotificationPreferencesDto` mit:
  - `@IsBoolean() @IsOptional() businessActivated?: boolean`
  - `@IsBoolean() @IsOptional() businessContactRequestResponses?: boolean`

### 4. BusinessesService erweitern

**Datei:** `src/businesses/application/services/businesses.service.ts`

**Neue Methode hinzufügen:**

```typescript
private async sendBusinessActivatedNotification(business: Business): Promise<void>
```

- Ruft `usersService.getAllBusinessUsers()` auf
- Filtert Business User mit `businessIds.includes(business.id)`
- Für jeden Business User:
  - Prüft `notificationPreferences.businessActivated` (Default: `false` wenn `undefined`)
  - Sendet Notification via `notificationService.sendToUser()`
- Error Handling und Logging

**Methode erweitern:**

- `updateStatus()`: Nach Status-Update PENDING → ACTIVE zusätzlich `sendBusinessActivatedNotification()` aufrufen
- Bestehende `sendNewBusinessNotification()` bleibt für normale User erhalten

### 5. ContactService erweitern

**Datei:** `src/contact/application/services/contact.service.ts`

**Neue Methode hinzufügen:**

```typescript
private async sendBusinessContactRequestResponseNotification(contactRequest: ContactRequest): Promise<void>
```

- Prüft ob Request-Typ `BUSINESS_CLAIM` oder `BUSINESS_REQUEST`
- Ruft `usersService.getBusinessUser(contactRequest.userId)` auf
- Prüft `notificationPreferences.businessContactRequestResponses` (Default: `false` wenn `undefined`)
- Sendet Notification via `notificationService.sendToUser()`
- Error Handling und Logging

**Methode erweitern:**

- `sendContactRequestResponseNotification()`: 
  - Prüft ob Business User und Business-Request-Typ
  - Ruft `sendBusinessContactRequestResponseNotification()` auf für Business User
  - Bestehende Logik für normale User bleibt erhalten

### 6. Tests implementieren

**Datei:** `src/businesses/application/services/businesses.service.spec.ts`

- Test: `sendBusinessActivatedNotification()` sendet Notification wenn Präferenz aktiviert
- Test: `sendBusinessActivatedNotification()` sendet keine Notification wenn Präferenz deaktiviert
- Test: `sendBusinessActivatedNotification()` sendet keine Notification bei Default (undefined = false)
- Test: `updateStatus()` ruft `sendBusinessActivatedNotification()` auf bei PENDING → ACTIVE
- Test: `updateStatus()` sendet keine Notification bei anderen Status-Änderungen
- Test: Nur Business User mit passendem businessId erhalten Notification

**Datei:** `src/contact/application/services/contact.service.spec.ts`

- Test: `sendBusinessContactRequestResponseNotification()` sendet Notification für BUSINESS_CLAIM
- Test: `sendBusinessContactRequestResponseNotification()` sendet Notification für BUSINESS_REQUEST
- Test: `sendBusinessContactRequestResponseNotification()` sendet keine Notification für GENERAL/FEEDBACK
- Test: `sendBusinessContactRequestResponseNotification()` sendet keine Notification wenn Präferenz deaktiviert
- Test: `sendBusinessContactRequestResponseNotification()` sendet keine Notification bei Default (undefined = false)
- Test: Normale User erhalten weiterhin `CONTACT_REQUEST_RESPONSE` für GENERAL/FEEDBACK
- Test: Business User erhalten `BUSINESS_CONTACT_REQUEST_RESPONSE` für BUSINESS_CLAIM/BUSINESS_REQUEST

### 7. Dokumentation aktualisieren

**Datei:** `docs/business-user-notifications.md`

- Status der beiden Phase 1 Notifications auf "✅ Implementiert" setzen
- Implementierungsdetails aktualisieren
- Code-Beispiele aktualisieren falls nötig

## Technische Details

### Business User Identifikation

- Business User werden über `usersService.getBusinessUser(userId)` oder `usersService.getAllBusinessUsers()` abgerufen
- Business User haben `businessIds[]` Array
- Business gehört zu Business User wenn `businessIds.includes(businessId)`

### Notification Preferences Defaults

- `businessActivated`: `false` wenn `undefined` (Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist)
- `businessContactRequestResponses`: `false` wenn `undefined` (Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist)

### Error Handling

- Alle Notification-Methoden sollten try-catch verwenden
- Fehler sollten geloggt werden, aber nicht die Hauptoperation blockieren
- Bestehende Patterns aus `sendNewBusinessNotification()` und `sendContactRequestResponseNotification()` verwenden

### Module Dependencies

- `BusinessesModule` importiert bereits `NotificationsModule` ✅
- `ContactModule` importiert bereits `NotificationsModule` ✅
- Beide Module importieren bereits `UsersModule` mit `forwardRef()` ✅

## Abhängigkeiten

- `UsersService.getAllBusinessUsers()` existiert bereits ✅
- `UsersService.getBusinessUser()` existiert bereits ✅
- `NotificationService.sendToUser()` existiert bereits ✅
- `BusinessesModule` und `ContactModule` importieren bereits `NotificationsModule` ✅

## Offene Fragen / Annahmen

1. **FCM Tokens für Business User**: Business User haben aktuell kein `fcmTokens` Feld. Für Phase 1 wird angenommen, dass FCM Token Management für Business User separat implementiert wird oder bereits funktioniert. Falls nicht, muss `BusinessUser` Interface um `fcmTokens` erweitert werden.

2. **Notification Preferences Storage**: Business User haben aktuell kein `notificationPreferences` Feld. Dies muss zum `BusinessUser` Interface hinzugefügt werden.

3. **Update Endpoint**: Business User können über `PUT /users/:id/business-profile` aktualisiert werden. Notification Preferences können dort gesetzt werden, sobald das Interface erweitert ist.