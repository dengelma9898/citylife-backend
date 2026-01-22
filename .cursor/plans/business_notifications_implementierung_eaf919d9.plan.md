---
name: Business Notifications Implementierung
overview: Implementierung von Push-Notifications für neue aktive Businesses. Notifications werden gesendet, wenn ein neues Business mit Status ACTIVE erstellt wird oder wenn ein Business von PENDING zu ACTIVE wechselt. Nur Benutzer mit aktivierter newBusinesses-Präferenz erhalten Notifications.
todos:
  - id: extend-preferences
    content: "NotificationPreferences Interface erweitern: newBusinesses Feld hinzufügen"
    status: completed
  - id: create-interface
    content: BusinessNotificationData Interface erstellen
    status: completed
  - id: inject-services
    content: "BusinessesService erweitern: NotificationService und UsersService injizieren"
    status: completed
  - id: implement-notification-method
    content: sendNewBusinessNotification() Methode implementieren mit Präferenz-Prüfung
    status: completed
  - id: integrate-create
    content: "create() Methode erweitern: Notification senden wenn Status ACTIVE"
    status: completed
  - id: integrate-update-status
    content: "updateStatus() Methode erweitern: Notification senden wenn PENDING → ACTIVE"
    status: completed
  - id: import-notifications-module
    content: "BusinessesModule erweitern: NotificationsModule importieren"
    status: completed
---

# Business Notifications Implementierung

## Übersicht

Implementierung von Push-Notifications für neue aktive Businesses, analog zur Direct-Chat Notifications Implementierung. Notifications werden gesendet, wenn:

1. Ein neues Business mit Status ACTIVE erstellt wird
2. Ein Business von PENDING zu ACTIVE wechselt (bei Status-Update)

Nur Benutzer mit aktivierter `newBusinesses` Notification-Präferenz erhalten Notifications.

## Architektur

```
BusinessesService
  ├── create() → Wenn Status ACTIVE → sendNewBusinessNotification()
  ├── updateStatus() → Wenn zu ACTIVE → sendNewBusinessNotification()
  └── sendNewBusinessNotification() → Prüft Präferenzen → sendet an alle berechtigten Benutzer
```

## Implementierungsschritte

### 1. Notification-Präferenz erweitern

**Datei:** `src/users/interfaces/user-profile.interface.ts`

- `NotificationPreferences` Interface erweitern um `newBusinesses: boolean`
- Standardwert: `true` (wie bei `directMessages`)
```typescript
export interface NotificationPreferences {
  directMessages: boolean;
  newBusinesses: boolean; // NEU
}
```


### 2. Business Notification Data Interface erstellen

**Neue Datei:** `src/notifications/domain/interfaces/business-notification-data.interface.ts`

- Interface für Business-Notification-Daten erstellen
- Analog zu `DirectChatNotificationData`
```typescript
export interface BusinessNotificationData {
  type: 'NEW_BUSINESS';
  businessId: string;
  businessName: string;
}
```


### 3. BusinessesService erweitern

**Datei:** `src/businesses/application/services/businesses.service.ts`

#### 3.1 Dependencies injizieren

- `NotificationService` injizieren
- `UsersService` injizieren (bereits im Module verfügbar)

#### 3.2 Notification-Methode implementieren

- `sendNewBusinessNotification()` Methode erstellen:
  - Alle Benutzer abrufen (`usersService.getAll()`)
  - Für jeden Benutzer prüfen:
    - `notificationPreferences?.newBusinesses` (default: `true` wenn undefined)
    - Wenn aktiviert → Notification senden
  - Notification-Payload mit Business-Daten erstellen
  - Fehlerbehandlung mit Logging

#### 3.3 Integration in create()

- Nach erfolgreicher Business-Erstellung prüfen: `business.status === BusinessStatus.ACTIVE`
- Wenn ACTIVE → `sendNewBusinessNotification()` aufrufen

#### 3.4 Integration in updateStatus()

- Nach Status-Update prüfen:
  - Neuer Status ist `ACTIVE`
  - Alter Status war `PENDING` (nur bei Status-Wechsel, nicht bei Update von INACTIVE)
- Wenn Bedingung erfüllt → `sendNewBusinessNotification()` aufrufen

### 4. BusinessesModule erweitern

**Datei:** `src/businesses/businesses.module.ts`

- `NotificationsModule` zu den Imports hinzufügen
- `UsersModule` ist bereits vorhanden (mit forwardRef)

## Dateien die geändert werden

1. `src/users/interfaces/user-profile.interface.ts` - NotificationPreferences erweitern
2. `src/notifications/domain/interfaces/business-notification-data.interface.ts` - Neues Interface (NEU)
3. `src/businesses/application/services/businesses.service.ts` - Notification-Logik hinzufügen
4. `src/businesses/businesses.module.ts` - NotificationsModule importieren

## Notification-Payload Struktur

```typescript
{
  title: "Neuer Partner verfügbar",
  body: `${business.name} ist jetzt verfügbar`,
  data: {
    type: 'NEW_BUSINESS',
    businessId: business.id,
    businessName: business.name
  }
}
```

## Verhalten

- **Bei Erstellung:** Wenn `isAdmin === true` oder Status explizit ACTIVE → Notification senden
- **Bei Status-Update:** Nur wenn von PENDING zu ACTIVE → Notification senden
- **Präferenz-Prüfung:** Nur Benutzer mit `notificationPreferences.newBusinesses === true` (oder undefined, dann default `true`) erhalten Notifications
- **Fehlerbehandlung:** Fehler beim Senden einzelner Notifications brechen den Prozess nicht ab (analog zu Direct-Chat Notifications)

## Testing

- Unit Tests für `sendNewBusinessNotification()` Methode
- Test für Präferenz-Prüfung (aktiviert/deaktiviert)
- Test für Status-Prüfung (nur ACTIVE)
- Test für Status-Wechsel (nur PENDING → ACTIVE)