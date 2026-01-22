# Business User Notifications - Vorschläge für Citylife Backend

## Übersicht

Dieses Dokument beschreibt Notification-Typen, die speziell für **Business User** relevant sind. Business User haben andere Bedürfnisse als normale User:

- **Nicht relevant:** Generelle neue Businesses in der Stadt
- **Relevant:** Status-Änderungen der eigenen Businesses (z.B. PENDING → ACTIVE)
- **Relevant:** Antworten auf Business-bezogene Contact Requests (BUSINESS_CLAIM, BUSINESS_REQUEST)
- **Relevant:** Interaktionen mit eigenen Events und Businesses

**Business User Identifikation:**
- Business User haben `businessIds[]` Array in ihrem Profil
- User-Typ: `BUSINESS` oder `PREMIUM_BUSINESS`
- Können mehrere Businesses besitzen

**Aktuell implementiert:**
- ✅ `BUSINESS_ACTIVATED`: Sent when a business owned by the business user changes from PENDING to ACTIVE
- ✅ `BUSINESS_CONTACT_REQUEST_RESPONSE`: Sent when an admin responds to a BUSINESS_CLAIM or BUSINESS_REQUEST contact request

---

## 📱 Aktive Updates (Event-basiert)

Diese Notifications werden sofort gesendet, wenn ein bestimmtes Event eintritt.

### 1. BUSINESS_ACTIVATED

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn ein Business des Business Users von `PENDING` zu `ACTIVE` geschaltet wird. Dies ist für Business User von höchster Priorität, da sie wissen müssen, wann ihr Business live geht.

**Trigger:**  
- `PATCH /businesses/:id/status` wird aufgerufen
- Business Status ändert sich von `PENDING` zu `ACTIVE`
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Dein Business ist jetzt aktiv",
  body: "{businessName} wurde freigeschaltet und ist jetzt sichtbar",
  data: {
    type: "BUSINESS_ACTIVATED",
    businessId: string,
    businessName: string,
    previousStatus: "PENDING",
    newStatus: "ACTIVE"
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessActivated?: boolean`
- Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Implementierung:**
- ✅ Service: `BusinessesService.updateStatus()` und `BusinessesService.sendBusinessActivatedNotification()`
- ✅ Notification Interface: `BusinessActivatedNotificationData`
- ✅ Module: `BusinessesModule` importiert bereits `NotificationsModule`
- ✅ Prüfung: Nur senden, wenn Business User existiert und Business in `businessIds` enthalten ist
- ✅ Tests: Vollständige Test-Suite in `businesses.service.spec.ts`

**Besonderheiten:**
- Nur für Business User (nicht für normale User)
- Nur bei Status-Änderung PENDING → ACTIVE
- Nicht senden, wenn Business bereits ACTIVE war
- Wichtig: Business User sollten sofort informiert werden, wenn ihr Business freigeschaltet wird

---

### 2. BUSINESS_CONTACT_REQUEST_RESPONSE

**Priorität:** 🔴 Hoch

**Beschreibung:**  
Notification wird gesendet, wenn ein Admin auf eine Business-bezogene Contact Request antwortet. Besonders wichtig für `BUSINESS_CLAIM` und `BUSINESS_REQUEST` Anfragen.

**Trigger:**  
- Admin fügt eine Nachricht zu einer Contact Request hinzu
- Contact Request Typ ist `BUSINESS_CLAIM` oder `BUSINESS_REQUEST`
- `responded` Status ändert sich von `false` zu `true`
- Contact Request gehört zu einem Business User (`contactRequestIds`)

**Empfänger:**  
- Der Business User, der die Contact Request erstellt hat (`userId`)

**Notification Payload:**
```typescript
{
  title: "Antwort auf deine Business-Anfrage",
  body: "Du hast eine Antwort auf deine {requestType} Anfrage erhalten",
  data: {
    type: "BUSINESS_CONTACT_REQUEST_RESPONSE",
    contactRequestId: string,
    requestType: "BUSINESS_CLAIM" | "BUSINESS_REQUEST",
    businessId?: string, // Falls vorhanden
    businessName?: string // Falls vorhanden
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessContactRequestResponses?: boolean`
- Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Implementierung:**
- ✅ Service: `ContactService.addAdminResponse()`, `ContactService.addMessage()` und `ContactService.sendBusinessContactRequestResponseNotification()`
- ✅ Notification Interface: `BusinessContactRequestResponseNotificationData`
- ✅ Module: `ContactModule` importiert bereits `NotificationsModule`
- ✅ Prüfung: Nur senden für `BUSINESS_CLAIM` und `BUSINESS_REQUEST` Typen
- ✅ Prüfung: Nur für Business User (nicht für normale User)
- ✅ Tests: Vollständige Test-Suite in `contact.service.spec.ts`

**Besonderheiten:**
- ✅ Nur senden, wenn Admin antwortet (`isAdminResponse: true`)
- ✅ Nur für Business-bezogene Request-Typen
- ✅ Nicht senden für eigene Nachrichten des Business Users
- ✅ Notification wird nur gesendet, wenn `responded` Status von `false` zu `true` wechselt
- ✅ Default: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist

**Unterschied zu normalen User:**
- Normale User erhalten `CONTACT_REQUEST_RESPONSE` für GENERAL und FEEDBACK
- Business User erhalten `BUSINESS_CONTACT_REQUEST_RESPONSE` für BUSINESS_CLAIM und BUSINESS_REQUEST
- Separate Notification-Typen für bessere Filterung und Personalisierung

---

### 3. BUSINESS_STATUS_CHANGED

**Priorität:** 🟡 Mittel

**Beschreibung:**  
Notification wird gesendet, wenn der Status eines eigenen Businesses geändert wird (z.B. ACTIVE → INACTIVE oder INACTIVE → ACTIVE). Wichtig für Business User, um über Status-Änderungen informiert zu bleiben.

**Trigger:**  
- `PATCH /businesses/:id/status` wird aufgerufen
- Business Status ändert sich (außer PENDING → ACTIVE, das wird von BUSINESS_ACTIVATED abgedeckt)
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Business-Status geändert",
  body: "{businessName} Status wurde von {previousStatus} zu {newStatus} geändert",
  data: {
    type: "BUSINESS_STATUS_CHANGED",
    businessId: string,
    businessName: string,
    previousStatus: "ACTIVE" | "INACTIVE" | "PENDING",
    newStatus: "ACTIVE" | "INACTIVE" | "PENDING"
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessStatusChanged?: boolean`
- Default: `true` (wenn `undefined`)

**Implementierung:**
- Service: `BusinessesService.updateStatus()`
- Notification Interface: `BusinessStatusChangedNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren
- Prüfung: Nur senden, wenn Status sich ändert (nicht bei erstmaliger Erstellung)
- Prüfung: Nicht senden für PENDING → ACTIVE (wird von BUSINESS_ACTIVATED abgedeckt)

**Besonderheiten:**
- Nur für Business User
- Alle Status-Änderungen außer PENDING → ACTIVE
- Wichtig für Transparenz über Admin-Aktionen

---

### 4. EVENT_INTERACTION (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn jemand mit einem Event des Business Users interagiert (z.B. favorisiert, kommentiert, teilnimmt). **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- User favorisiert ein Event (`favoriteEventIds`)
- User kommentiert ein Event (falls Kommentar-Feature existiert)
- User nimmt an einem Event teil (falls Teilnahme-Feature existiert)
- Event gehört zu einem Business User (`eventIds`)

**Empfänger:**  
- Der Business User, der das Event erstellt hat (`eventIds` enthält die Event-ID)

**Notification Payload:**
```typescript
{
  title: "Neue Interaktion mit deinem Event",
  body: "{interactionType} für {eventTitle}",
  data: {
    type: "EVENT_INTERACTION",
    eventId: string,
    eventTitle: string,
    interactionType: "FAVORITE" | "COMMENT" | "PARTICIPATION",
    userId?: string, // Optional: User, der interagiert hat
    userName?: string // Optional: Name des Users
  }
}
```

**Präferenz:**  
- `notificationPreferences.eventInteractions?: boolean`
- Default: `false` (wenn `undefined`) - Optional, nicht alle Business User wollen diese Notifications

**Implementierung:**
- Service: TBD (abhängig von Event-Interaktions-Features)
- Notification Interface: `EventInteractionNotificationData`
- Module: `EventsModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur für Business User
- Optional - Business User können diese Notifications deaktivieren
- Für zukünftige Features

---

### 5. BUSINESS_REVIEW (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Notification wird gesendet, wenn jemand eine Review/Bewertung für ein Business des Business Users schreibt. **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- User schreibt eine Review für ein Business
- Business gehört zu einem Business User (`businessIds`)

**Empfänger:**  
- Alle Business User, die dieses Business besitzen (`businessIds` enthält die Business-ID)

**Notification Payload:**
```typescript
{
  title: "Neue Bewertung erhalten",
  body: "{businessName} hat eine neue Bewertung erhalten",
  data: {
    type: "BUSINESS_REVIEW",
    businessId: string,
    businessName: string,
    reviewId: string,
    rating?: number, // Falls Bewertungssystem existiert
    userId?: string // Optional: User, der die Review geschrieben hat
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessReviews?: boolean`
- Default: `true` (wenn `undefined`) - Business User sollten über Reviews informiert werden

**Implementierung:**
- Service: TBD (abhängig von Review-Feature)
- Notification Interface: `BusinessReviewNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren

**Besonderheiten:**
- Nur für Business User
- Für zukünftige Features
- Wichtig für Reputation-Management

---

## ⏰ Scheduled Jobs (Zeit-basiert)

Diese Notifications erfordern einen Scheduled Job/Cron Service, der regelmäßig ausgeführt wird.

### 6. BUSINESS_PERFORMANCE_SUMMARY (Zukünftig)

**Priorität:** 🟢 Niedrig

**Beschreibung:**  
Wöchentliche oder monatliche Zusammenfassung der Business-Performance (z.B. Anzahl Scans, Event-Teilnahmen, etc.). **Noch nicht implementiert** - für zukünftige Features.

**Trigger:**  
- Scheduled Job läuft wöchentlich (z.B. Montag 8:00 Uhr) oder monatlich
- Sammelt Metriken für alle Businesses eines Business Users

**Empfänger:**  
- Alle Business User mit aktiven Businesses

**Notification Payload:**
```typescript
{
  title: "Deine Business-Zusammenfassung",
  body: "Diese Woche: {scanCount} Scans, {eventParticipations} Event-Teilnahmen",
  data: {
    type: "BUSINESS_PERFORMANCE_SUMMARY",
    period: "WEEKLY" | "MONTHLY",
    businessIds: string[],
    metrics: {
      scanCount: number,
      eventParticipations?: number,
      // ... weitere Metriken
    }
  }
}
```

**Präferenz:**  
- `notificationPreferences.businessPerformanceSummary?: boolean`
- Default: `false` (wenn `undefined`) - Optional

**Implementierung:**
- Neuer Scheduled Service: `BusinessPerformanceSummarySchedulerService`
- Cron Job: Wöchentlich oder monatlich
- Notification Interface: `BusinessPerformanceSummaryNotificationData`
- Module: `BusinessesModule` muss `NotificationsModule` importieren

**Technische Anforderungen:**
- NestJS `@nestjs/schedule` Package
- Cron Job für regelmäßige Ausführung
- Aggregation von Business-Metriken
- Effiziente Query für alle Business User

**Besonderheiten:**
- Nur für Business User
- Optional - Business User können diese Notifications deaktivieren
- Für zukünftige Features

---

## 📊 Implementierungs-Priorität

### Phase 1 (Sofort umsetzbar - Hoch)
1. ✅ **BUSINESS_ACTIVATED** - Kritisch für Business User, einfache Implementierung
2. ✅ **BUSINESS_CONTACT_REQUEST_RESPONSE** - Wichtig für Support-Erlebnis, ähnlich zu CONTACT_REQUEST_RESPONSE

### Phase 2 (Mittelfristig)
3. 🟡 **BUSINESS_STATUS_CHANGED** - Für Transparenz über Admin-Aktionen

### Phase 3 (Optional / Zukünftig)
4. 🟢 **EVENT_INTERACTION** - Abhängig von Event-Interaktions-Features
5. 🟢 **BUSINESS_REVIEW** - Abhängig von Review-Feature
6. 🟢 **BUSINESS_PERFORMANCE_SUMMARY** - Erfordert Metriken-System und Scheduled Jobs

---

## 🔧 Technische Implementierungs-Hinweise

### Business User Identifikation

```typescript
// Prüfung, ob User ein Business User ist
const businessUser = await this.usersService.getBusinessUser(userId);
if (businessUser && businessUser.businessIds.includes(businessId)) {
  // Business gehört zu diesem Business User
  // Notification senden
}
```

### Notification Interface erstellen

```typescript
// src/notifications/domain/interfaces/business-activated-notification-data.interface.ts
export interface BusinessActivatedNotificationData {
  type: 'BUSINESS_ACTIVATED';
  businessId: string;
  businessName: string;
  previousStatus: 'PENDING';
  newStatus: 'ACTIVE';
}
```

### Service erweitern

```typescript
// Beispiel: BusinessesService.updateStatus()
public async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
  const existingBusiness = await this.businessRepository.findById(id);
  if (!existingBusiness) {
    throw new NotFoundException('Business not found');
  }

  const previousStatus = existingBusiness.status;
  const updatedBusiness = existingBusiness.updateStatus(status);
  const savedBusiness = await this.businessRepository.update(id, updatedBusiness);

  // Business User Notification für Status-Änderung
  if (previousStatus === BusinessStatus.PENDING && status === BusinessStatus.ACTIVE) {
    await this.sendBusinessActivatedNotification(savedBusiness);
  } else if (previousStatus !== status) {
    await this.sendBusinessStatusChangedNotification(savedBusiness, previousStatus);
  }

  return savedBusiness;
}

private async sendBusinessActivatedNotification(business: Business): Promise<void> {
  // Finde alle Business User, die dieses Business besitzen
  const allBusinessUsers = await this.usersService.getAllBusinessUsers();
  const relevantBusinessUsers = allBusinessUsers.filter(
    (user) => user.businessIds.includes(business.id)
  );

  for (const businessUser of relevantBusinessUsers) {
    // Prüfe Präferenz
    const preferences = businessUser.notificationPreferences || {};
    const enabled = preferences.businessActivated !== undefined 
      ? preferences.businessActivated 
      : false; // Default: false - Notifications werden nur gesendet, wenn Präferenz explizit auf true gesetzt ist

    if (enabled) {
      await this.notificationService.sendToUser(businessUser.id, {
        title: 'Dein Business ist jetzt aktiv',
        body: `${business.name} wurde freigeschaltet und ist jetzt sichtbar`,
        data: {
          type: 'BUSINESS_ACTIVATED',
          businessId: business.id,
          businessName: business.name,
          previousStatus: 'PENDING',
          newStatus: 'ACTIVE',
        },
      });
    }
  }
}
```

### Module erweitern

```typescript
// businesses.module.ts
@Module({
  imports: [
    // ... andere Imports
    NotificationsModule, // Für Business Notifications
    forwardRef(() => UsersModule), // Für Business User Lookup
  ],
  // ...
})
export class BusinessesModule {}
```

---

## 📝 Business User Notification Preferences Schema

```typescript
export interface BusinessUserNotificationPreferences {
  // Business-spezifische Präferenzen
  businessActivated?: boolean;              // 🔴 Phase 1
  businessContactRequestResponses?: boolean; // 🔴 Phase 1
  businessStatusChanged?: boolean;          // 🟡 Phase 2
  eventInteractions?: boolean;              // 🟢 Phase 3
  businessReviews?: boolean;                // 🟢 Phase 3
  businessPerformanceSummary?: boolean;     // 🟢 Phase 3
  
  // Normale User Präferenzen (falls Business User auch normale User-Features nutzen)
  directMessages?: boolean;
  directChatRequests?: boolean;
  newEvents?: boolean; // Für Events anderer Businesses
  eventUpdates?: boolean;
}
```

**Default-Verhalten:**  
- `businessActivated`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- `businessContactRequestResponses`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- `businessStatusChanged`: `false` (wenn `undefined`) - Notifications werden nur gesendet, wenn Präferenz explizit auf `true` gesetzt ist
- Alle anderen: `false` (wenn `undefined`)

---

## 🎯 Unterschiede zu normalen User Notifications

| Aspekt | Normale User | Business User |
|--------|--------------|---------------|
| **NEW_BUSINESS** | ✅ Erhalten Notifications für alle neuen Businesses | ❌ Nicht relevant |
| **BUSINESS_ACTIVATED** | ❌ Nicht relevant | ✅ Erhalten Notifications für eigene Businesses |
| **CONTACT_REQUEST_RESPONSE** | ✅ Für GENERAL, FEEDBACK | ❌ Nicht relevant |
| **BUSINESS_CONTACT_REQUEST_RESPONSE** | ❌ Nicht relevant | ✅ Für BUSINESS_CLAIM, BUSINESS_REQUEST |
| **NEW_EVENT** | ✅ Für alle Events | ⚠️ Optional: Nur für Events anderer Businesses |
| **EVENT_INTERACTION** | ❌ Nicht relevant | ✅ Für eigene Events (zukünftig) |

---

## 🎯 Nächste Schritte

1. **Review dieses Dokuments** mit dem Team
2. **Prioritäten festlegen** basierend auf Business-Requirements
3. **Phase 1 umsetzen** (BUSINESS_ACTIVATED, BUSINESS_CONTACT_REQUEST_RESPONSE)
4. **Business User Notification Preferences** erweitern
5. **Testing** für Business User Notification-Flows
6. **Monitoring & Analytics** für Business User Notification-Delivery implementieren

---

**Erstellt:** 2024  
**Status:** Vorschlag  
**Zuletzt aktualisiert:** 2024  
**Zielgruppe:** Business User (`BUSINESS`, `PREMIUM_BUSINESS`)
