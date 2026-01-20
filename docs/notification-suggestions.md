# Notification-Vorschläge für Citylife Backend

## Übersicht

Dieses Dokument beschreibt vorgeschlagene Notification-Typen, die noch implementiert werden können. Die Notifications sind unterteilt in **Aktive Updates** (sofortige Notifications bei Events) und **Scheduled Jobs** (zeitbasierte Notifications).

**Aktuell implementiert:**
- `DIRECT_CHAT_MESSAGE`: Sent when a new message is received in a direct chat
- `NEW_BUSINESS`: Sent when a new business becomes active
- `DIRECT_CHAT_REQUEST`: Sent when a user receives a direct chat request

---

## 📱 Aktive Updates (Event-basiert)

Diese Notifications werden sofort gesendet, wenn ein bestimmtes Event eintritt.

### 1. DIRECT_CHAT_REQUEST

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn User A eine Chat-Anfrage an User B sendet (Status: `pending`).

**Trigger:**  
- `POST /direct-chats` wird aufgerufen
- Chat wird mit Status `pending` erstellt

**Empfänger:**  
- Der eingeladene User (`invitedUserId`)

**Notification Payload:**
```typescript
{
  title: "Neue Chat-Anfrage",
  body: "{senderName} möchte mit dir chatten",
  data: {
    type: "DIRECT_CHAT_REQUEST",
    chatId: string,
    senderId: string,
    senderName: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.directChatRequests?: boolean`
- Default: `false` (wenn `undefined`)

**Implementierung:**
- ✅ Service: `DirectChatsService.createChat()`
- ✅ Notification Interface: `DirectChatRequestNotificationData`
- ✅ Module: `DirectChatsModule` importiert bereits `NotificationsModule`

**Besonderheiten:**
- Nicht senden, wenn User blockiert ist
- Nicht senden, wenn Chat bereits existiert
- Notification wird nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

---

### 2. CONTACT_REQUEST_RESPONSE

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein Admin auf eine Contact Request antwortet.

**Trigger:**  
- Admin fügt eine Nachricht zu einer Contact Request hinzu
- `responded` Status ändert sich von `false` zu `true`

**Empfänger:**  
- Der User, der die Contact Request erstellt hat (`userId`)

**Notification Payload:**
```typescript
{
  title: "Antwort auf deine Anfrage",
  body: "Du hast eine Antwort auf deine {requestType} Anfrage erhalten",
  data: {
    type: "CONTACT_REQUEST_RESPONSE",
    contactRequestId: string,
    requestType: "GENERAL" | "FEEDBACK" | "BUSINESS_CLAIM" | "BUSINESS_REQUEST"
  }
}
```

**Präferenz:**  
- `notificationPreferences.contactRequestResponses?: boolean`
- Default: `true`

**Implementierung:**
- Service: `ContactService.addMessage()` oder ähnliche Methode
- Notification Interface: `ContactRequestResponseNotificationData`
- Module: `ContactModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur senden, wenn Admin antwortet (`isAdminResponse: true`)
- Nicht senden für eigene Nachrichten des Users

---

### 3. NEW_EVENT

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein neues Event erstellt wird (analog zu `NEW_BUSINESS`).

**Trigger:**  
- `POST /events` wird aufgerufen
- Event wird erfolgreich erstellt

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Nur User in der gleichen Stadt (`currentCityId`)

**Notification Payload:**
```typescript
{
  title: "Neues Event verfügbar",
  body: "{eventTitle} - {eventCategory}",
  data: {
    type: "NEW_EVENT",
    eventId: string,
    eventTitle: string,
    categoryId: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newEvents?: boolean`
- Default: `true`

**Implementierung:**
- Service: `EventsService.create()`
- Notification Interface: `EventNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Optional: Filterung nach Stadt
- Optional: Filterung nach Event-Kategorie basierend auf User-Präferenzen

---

### 4. EVENT_UPDATE

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn ein favorisiertes Event aktualisiert wird.

**Trigger:**  
- `PATCH /events/:id` wird aufgerufen
- Event wird aktualisiert und User hat Event in `favoriteEventIds`

**Empfänger:**  
- Alle User, die das Event favorisiert haben (`favoriteEventIds`)

**Notification Payload:**
```typescript
{
  title: "Event wurde aktualisiert",
  body: "{eventTitle} wurde aktualisiert",
  data: {
    type: "EVENT_UPDATE",
    eventId: string,
    eventTitle: string,
    updateType: "TIME" | "LOCATION" | "DESCRIPTION" | "OTHER"
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventUpdates?: boolean`
- Default: `true`

**Implementierung:**
- Service: `EventsService.update()`
- Notification Interface: `EventUpdateNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur für favorisierte Events
- Optional: Unterscheidung nach Update-Typ (kritische Updates wie Zeit/Ort vs. weniger wichtige)

---

### 5. NEW_JOB_OFFER

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn ein neues Job-Angebot erstellt wird.

**Trigger:**  
- `POST /job-offers` wird aufgerufen
- Job Offer wird erfolgreich erstellt

**Empfänger:**  
- Alle User mit aktivierter Präferenz
- Optional: Gefiltert nach Job-Kategorie oder Stadt

**Notification Payload:**
```typescript
{
  title: "Neues Job-Angebot",
  body: "{jobTitle} - {jobCategory}",
  data: {
    type: "NEW_JOB_OFFER",
    jobOfferId: string,
    jobTitle: string,
    jobOfferCategoryId: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newJobOffers?: boolean`
- Default: `true`

**Implementierung:**
- Service: `JobOffersService.create()`
- Notification Interface: `JobOfferNotificationData`
- Module: `JobOffersModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Optional: Filterung nach Job-Kategorie
- Optional: Filterung nach Stadt/Location

---

### 6. NEWS_REACTION

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn jemand auf einen News-Post reagiert (für den Autor des Posts).

**Trigger:**  
- `PATCH /news/:id/react` wird aufgerufen
- Reaktion wird zu einem News-Item hinzugefügt

**Empfänger:**  
- Der Autor des News-Posts (`createdBy`)

**Notification Payload:**
```typescript
{
  title: "Neue Reaktion auf deinen Post",
  body: "{reactorName} hat mit {reactionType} reagiert",
  data: {
    type: "NEWS_REACTION",
    newsItemId: string,
    reactorId: string,
    reactorName: string,
    reactionType: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.newsReactions?: boolean`
- Default: `true`

**Implementierung:**
- Service: `NewsService.postReaction()`
- Notification Interface: `NewsReactionNotificationData`
- Module: `NewsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nicht senden, wenn User auf eigenen Post reagiert
- Optional: Aggregation mehrerer Reaktionen (z.B. "5 neue Reaktionen")

---

### 7. CHATROOM_MESSAGE

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn eine neue Nachricht in einem Chatroom gepostet wird.

**Trigger:**  
- `POST /chatrooms/:chatroomId/messages` wird aufgerufen
- Nachricht wird erfolgreich erstellt

**Empfänger:**  
- Alle Teilnehmer des Chatrooms (außer dem Sender)

**Notification Payload:**
```typescript
{
  title: "Neue Nachricht im Chatroom",
  body: "{senderName}: {messagePreview}",
  data: {
    type: "CHATROOM_MESSAGE",
    chatroomId: string,
    messageId: string,
    senderId: string,
    senderName: string
  }
}
```

**Präferenz:**  
- `notificationPreferences.chatroomMessages?: boolean`
- Default: `true`

**Implementierung:**
- Service: `ChatMessagesService.create()`
- Notification Interface: `ChatroomMessageNotificationData`
- Module: `ChatroomsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Mute-Funktion pro Chatroom sinnvoll (zusätzlich zu globaler Präferenz)
- Optional: Nicht senden, wenn User aktiv im Chatroom ist (Client-seitige Prüfung)

---

## ⏰ Scheduled Jobs (Zeit-basiert)

Diese Notifications erfordern einen Scheduled Job/Cron Service, der regelmäßig ausgeführt wird.

### 8. EVENT_REMINDER

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet als Erinnerung vor einem favorisierten Event.

**Trigger:**  
- Scheduled Job läuft täglich (z.B. um 8:00 Uhr)
- Prüft alle Events mit `dailyTimeSlots` oder `startDate` in den nächsten 24 Stunden
- Prüft alle Events mit `dailyTimeSlots` oder `startDate` in der nächsten Stunde

**Empfänger:**  
- Alle User, die das Event favorisiert haben (`favoriteEventIds`)

**Notification Payload:**
```typescript
{
  title: "Event-Erinnerung",
  body: "{eventTitle} startet {timeframe}",
  data: {
    type: "EVENT_REMINDER",
    eventId: string,
    eventTitle: string,
    startTime: string,
    reminderType: "24H" | "1H"
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventReminders?: boolean`
- Default: `true`

**Implementierung:**
- Neuer Scheduled Service: `EventReminderSchedulerService`
- Cron Job: Täglich um 8:00 Uhr (24h Reminder) und stündlich (1h Reminder)
- Notification Interface: `EventReminderNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Technische Anforderungen:**
- NestJS `@nestjs/schedule` Package
- Cron Job für regelmäßige Ausführung
- Effiziente Query für Events mit bevorstehenden Zeitpunkten
- Berücksichtigung von `dailyTimeSlots` (mehrere Zeitpunkte pro Event)

**Besonderheiten:**
- Zwei Reminder-Typen: 24h vorher und 1h vorher
- Nicht senden, wenn Event bereits vorbei ist
- Nicht senden, wenn bereits eine Reminder-Notification für diesen Zeitpunkt gesendet wurde

---

## 📊 Implementierungs-Priorität

### Phase 1 (Sofort umsetzbar)
1. ✅ **DIRECT_CHAT_REQUEST** - Hoher Nutzen, einfache Implementierung
2. ✅ **NEW_EVENT** - Analog zu NEW_BUSINESS, konsistentes Pattern
3. ✅ **CONTACT_REQUEST_RESPONSE** - Wichtig für Support-Erlebnis

### Phase 2 (Mittelfristig)
4. ⏰ **EVENT_REMINDER** - Erfordert Scheduled Jobs Setup
5. ✅ **NEW_JOB_OFFER** - Ähnlich wie NEW_EVENT/NEW_BUSINESS
6. ✅ **EVENT_UPDATE** - Für bessere User-Experience

### Phase 3 (Optional)
7. ✅ **NEWS_REACTION** - Social Engagement
8. ✅ **CHATROOM_MESSAGE** - Community Engagement

---

## 🔧 Technische Implementierungs-Hinweise

### Für Aktive Updates:
1. **Notification Interface erstellen:**
   ```typescript
   // src/notifications/domain/interfaces/[type]-notification-data.interface.ts
   export interface [Type]NotificationData {
     type: '[NOTIFICATION_TYPE]';
     // ... type-specific fields
   }
   ```

2. **Service erweitern:**
   - `NotificationService` und `UsersService` injizieren
   - Präferenz-Prüfung implementieren
   - Notification senden nach erfolgreicher Operation

3. **Module erweitern:**
   - `NotificationsModule` importieren
   - Bei circular dependencies: `forwardRef()` verwenden

### Für Scheduled Jobs:
1. **NestJS Schedule Setup:**
   ```typescript
   // app.module.ts
   import { ScheduleModule } from '@nestjs/schedule';
   
   @Module({
     imports: [
       ScheduleModule.forRoot(),
       // ...
     ],
   })
   ```

2. **Scheduler Service erstellen:**
   ```typescript
   @Injectable()
   export class EventReminderSchedulerService {
     @Cron('0 8 * * *') // Täglich um 8:00 Uhr
     async send24HourReminders() {
       // Implementation
     }
     
     @Cron('0 * * * *') // Stündlich
     async send1HourReminders() {
       // Implementation
     }
   }
   ```

---

## 📝 Notification Preferences Schema

```typescript
export interface NotificationPreferences {
  directMessages?: boolean;           // ✅ Implementiert
  newBusinesses?: boolean;            // ✅ Implementiert
  directChatRequests?: boolean;       // ✅ Implementiert
  contactRequestResponses?: boolean;   // 🔴 Phase 1
  newEvents?: boolean;                // 🔴 Phase 1
  eventReminders?: boolean;           // 🟡 Phase 2
  eventUpdates?: boolean;             // 🟡 Phase 2
  newJobOffers?: boolean;             // 🟡 Phase 2
  newsReactions?: boolean;            // 🟢 Phase 3
  chatroomMessages?: boolean;         // 🟢 Phase 3
}
```

**Default-Verhalten:**  
Alle Präferenzen sind standardmäßig `false` (wenn `undefined`). Notifications werden nur gesendet, wenn die Präferenz explizit auf `true` gesetzt ist.

---

## 🎯 Nächste Schritte

1. **Review dieses Dokuments** mit dem Team
2. **Prioritäten festlegen** basierend auf Business-Requirements
3. **Phase 1 umsetzen** (DIRECT_CHAT_REQUEST, NEW_EVENT, CONTACT_REQUEST_RESPONSE)
4. **Scheduled Jobs Setup** für Phase 2 vorbereiten
5. **Monitoring & Analytics** für Notification-Delivery implementieren

---

**Erstellt:** 2024  
**Status:** Vorschlag  
**Zuletzt aktualisiert:** 2024
