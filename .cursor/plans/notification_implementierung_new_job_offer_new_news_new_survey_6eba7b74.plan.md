---
name: Notification Implementierung NEW_JOB_OFFER NEW_NEWS NEW_SURVEY
overview: Implementierung von Push-Notifications für neue Job Offers, News und Surveys (Punkte 5-7 aus notification-suggestions.md). Alle drei Notifications folgen dem gleichen Pattern wie bereits implementierte NEW_EVENT und NEW_BUSINESS Notifications.
todos:
  - id: extend-notification-preferences
    content: "NotificationPreferences Interface und DTO erweitern: newJobOffers, newNews, newSurveys hinzufügen"
    status: completed
  - id: create-job-offer-interface
    content: JobOfferNotificationData Interface erstellen
    status: completed
  - id: create-news-interface
    content: NewsNotificationData Interface erstellen
    status: completed
  - id: create-survey-interface
    content: SurveyNotificationData Interface erstellen
    status: completed
  - id: extend-job-offers-service
    content: "JobOffersService erweitern: NotificationService und UsersService injizieren, sendNewJobOfferNotification() implementieren, create() erweitern"
    status: completed
  - id: extend-news-service
    content: "NewsService erweitern: NotificationService injizieren, sendNewNewsNotification() implementieren, alle create* Methoden erweitern"
    status: completed
  - id: extend-special-polls-service
    content: "SpecialPollsService erweitern: NotificationService injizieren, sendNewSurveyNotification() implementieren, create() erweitern"
    status: completed
  - id: import-notifications-job-offers
    content: "JobOffersModule erweitern: NotificationsModule importieren"
    status: completed
  - id: import-notifications-news
    content: "NewsModule erweitern: NotificationsModule importieren"
    status: completed
  - id: import-notifications-special-polls
    content: "SpecialPollsModule erweitern: NotificationsModule importieren"
    status: completed
  - id: test-job-offers-notifications
    content: "Tests für JobOffersService: Notification-Sending, Präferenz-Prüfung, Error Handling"
    status: completed
  - id: test-news-notifications
    content: "Tests für NewsService: Notification-Sending für alle News-Typen, Präferenz-Prüfung, Error Handling"
    status: completed
  - id: test-special-polls-notifications
    content: "Tests für SpecialPollsService: Notification-Sending, Präferenz-Prüfung, Error Handling"
    status: completed
---

# Notification Implementierung: NEW_JOB_OFFER, NEW_NEWS, NEW_SURVEY

## Übersicht

Implementierung von drei neuen Notification-Typen gemäß Punkte 5-7 aus `docs/notification-suggestions.md`:

- **NEW_JOB_OFFER**: Notification bei Erstellung eines neuen Job-Angebots
- **NEW_NEWS**: Notification bei Erstellung neuer News (Text, Image, Poll)
- **NEW_SURVEY**: Notification bei Erstellung einer neuen Special Poll

Alle drei Notifications folgen dem etablierten Pattern der bereits implementierten `NEW_EVENT` und `NEW_BUSINESS` Notifications.

## Architektur-Übersicht

```
JobOffersService.create()
  └─> sendNewJobOfferNotification()
      └─> getAllUserProfilesWithIds() → Filter nach newJobOffers Präferenz
          └─> notificationService.sendToUser() für jeden User

NewsService.createTextNews() / createImageNews() / createPollNews()
  └─> sendNewNewsNotification()
      └─> getAllUserProfilesWithIds() → Filter nach newNews Präferenz
          └─> notificationService.sendToUser() für jeden User

SpecialPollsService.create()
  └─> sendNewSurveyNotification()
      └─> getAllUserProfilesWithIds() → Filter nach newSurveys Präferenz
          └─> notificationService.sendToUser() für jeden User
```

## Implementierungs-Schritte

### 1. Notification Preferences erweitern

**Dateien:**

- `src/users/interfaces/user-profile.interface.ts`
- `src/users/dto/notification-preferences.dto.ts`

**Änderungen:**

- `NotificationPreferences` Interface erweitern um:
  - `newJobOffers?: boolean` (Default: `false` wenn `undefined`)
  - `newNews?: boolean` (Default: `false` wenn `undefined`)
  - `newSurveys?: boolean` (Default: `false` wenn `undefined`)
- `NotificationPreferencesDto` entsprechend erweitern

**Referenz:** Siehe `src/users/interfaces/user-profile.interface.ts` Zeilen 12-19

### 2. Notification Data Interfaces erstellen

**Neue Dateien:**

- `src/notifications/domain/interfaces/job-offer-notification-data.interface.ts`
- `src/notifications/domain/interfaces/news-notification-data.interface.ts`
- `src/notifications/domain/interfaces/survey-notification-data.interface.ts`

**Struktur (analog zu `EventNotificationData`):**

```typescript
// job-offer-notification-data.interface.ts
export interface JobOfferNotificationData {
  type: 'NEW_JOB_OFFER';
  jobOfferId: string;
  jobTitle: string;
  jobOfferCategoryId: string;
}

// news-notification-data.interface.ts
export interface NewsNotificationData {
  type: 'NEW_NEWS';
  newsId: string;
  newsTitle: string;
  categoryId?: string;
}

// survey-notification-data.interface.ts
export interface SurveyNotificationData {
  type: 'NEW_SURVEY';
  surveyId: string;
  surveyTitle: string;
  categoryId?: string;
}
```

**Referenz:** Siehe `src/notifications/domain/interfaces/event-notification-data.interface.ts`

### 3. JobOffersService erweitern

**Datei:** `src/job-offers/application/services/job-offers.service.ts`

**Änderungen:**

- `NotificationService` und `UsersService` injizieren (mit `forwardRef()` für `UsersService` bei Bedarf)
- Private Methode `sendNewJobOfferNotification(jobOffer: JobOffer)` implementieren
- `create()` Methode erweitern: Nach erfolgreichem Speichern Notification senden
- Präferenz-Prüfung: `notificationPreferences?.newJobOffers !== undefined ? notificationPreferences.newJobOffers : false`

**Referenz:** Siehe `src/events/events.service.ts` Zeilen 304-359 (`sendNewEventNotification`)

**Wichtige Details:**

- JobOffer hat: `id`, `title`, `jobOfferCategoryId`
- Notification Body: `"{jobTitle} - {jobOfferCategoryId}"`
- Notification Title: `"Neues Job-Angebot"`

### 4. NewsService erweitern

**Datei:** `src/news/news.service.ts`

**Änderungen:**

- `NotificationService` injizieren (bereits `UsersService` vorhanden)
- Private Methode `sendNewNewsNotification(newsItem: NewsItem)` implementieren
- Alle drei `create*` Methoden erweitern:
  - `createTextNews()` → Notification senden
  - `createImageNews()` → Notification senden
  - `createPollNews()` → Notification senden
- Präferenz-Prüfung: `notificationPreferences?.newNews !== undefined ? notificationPreferences.newNews : false`

**Referenz:** Siehe `src/events/events.service.ts` Zeilen 304-359

**Wichtige Details:**

- NewsItem hat: `id`, `content` (für text/image), `question` (für poll), `type`
- Notification Body: Für Text/Image: `content`, für Poll: `question`
- Notification Title: `"Neue Nachricht verfügbar"`
- `categoryId` ist optional (nicht in NewsItem Interface vorhanden, daher optional)

### 5. SpecialPollsService erweitern

**Datei:** `src/special-polls/special-polls.service.ts`

**Änderungen:**

- `NotificationService` injizieren (bereits `UsersService` vorhanden)
- Private Methode `sendNewSurveyNotification(specialPoll: SpecialPoll)` implementieren
- `create()` Methode erweitern: Nach erfolgreichem Speichern Notification senden
- Präferenz-Prüfung: `notificationPreferences?.newSurveys !== undefined ? notificationPreferences.newSurveys : false`

**Referenz:** Siehe `src/events/events.service.ts` Zeilen 304-359

**Wichtige Details:**

- SpecialPoll hat: `id`, `title`
- Notification Body: `"{surveyTitle}"`
- Notification Title: `"Neue Umfrage verfügbar"`
- `categoryId` ist optional (nicht in SpecialPoll Interface vorhanden, daher optional)

### 6. Module erweitern

**Dateien:**

- `src/job-offers/job-offers.module.ts`
- `src/news/news.module.ts`
- `src/special-polls/special-polls.module.ts`

**Änderungen:**

- `NotificationsModule` importieren
- Bei circular dependencies: `forwardRef(() => NotificationsModule)` verwenden
- `UsersModule` muss bereits importiert sein (für `getAllUserProfilesWithIds()`)

**Referenz:** Siehe `src/events/events.module.ts` Zeilen 29 (`forwardRef(() => NotificationsModule)`)

### 7. Tests implementieren

**Neue/Erweiterte Test-Dateien:**

- `src/job-offers/application/services/job-offers.service.spec.ts`
- `src/news/news.service.spec.ts`
- `src/special-polls/special-polls.service.spec.ts`

**Test-Szenarien für jeden Service:**

1. **Notification wird gesendet wenn Präferenz aktiviert:**

   - Mock `getAllUserProfilesWithIds()` mit Usern, die Präferenz auf `true` haben
   - Mock `notificationService.sendToUser()`
   - Verifiziere, dass `sendToUser()` für jeden User aufgerufen wird

2. **Notification wird nicht gesendet wenn Präferenz deaktiviert:**

   - Mock `getAllUserProfilesWithIds()` mit Usern, die Präferenz auf `false` haben
   - Verifiziere, dass `sendToUser()` nicht aufgerufen wird

3. **Default-Verhalten (Präferenz undefined):**

   - Mock `getAllUserProfilesWithIds()` mit Usern ohne gesetzte Präferenz
   - Verifiziere, dass `sendToUser()` NICHT aufgerufen wird (Default: `false`)

4. **Error Handling:**

   - Mock `sendToUser()` um Fehler zu werfen
   - Verifiziere, dass Fehler geloggt werden, aber nicht propagiert werden

5. **Korrekte Payload-Struktur:**

   - Verifiziere, dass Notification mit korrektem `type`, `title`, `body` und `data` gesendet wird

**Referenz:** Siehe `src/events/events.service.spec.ts` für Test-Pattern

## Bereits implementierte Notifications (Referenz)

Folgende Notifications sind bereits implementiert und können als Referenz dienen:

- ✅ `NEW_EVENT`: `src/events/events.service.ts` Zeilen 304-359
- ✅ `NEW_BUSINESS`: `src/businesses/application/services/businesses.service.ts` Zeilen 215-269
- ✅ `FAV_EVENT_UPDATE`: `src/events/events.service.ts` Zeilen 361-444
- ✅ `DIRECT_CHAT_REQUEST`: `src/direct-chats/application/services/direct-chats.service.ts`
- ✅ `CONTACT_REQUEST_RESPONSE`: `src/contact/contact.service.ts`

## Technische Details

### Notification Payload Struktur

**NEW_JOB_OFFER:**

```typescript
{
  title: "Neues Job-Angebot",
  body: "{jobTitle} - {jobOfferCategoryId}",
  data: {
    type: "NEW_JOB_OFFER",
    jobOfferId: string,
    jobTitle: string,
    jobOfferCategoryId: string
  }
}
```

**NEW_NEWS:**

```typescript
{
  title: "Neue Nachricht verfügbar",
  body: "{newsTitle}", // content für text/image, question für poll
  data: {
    type: "NEW_NEWS",
    newsId: string,
    newsTitle: string,
    categoryId?: string
  }
}
```

**NEW_SURVEY:**

```typescript
{
  title: "Neue Umfrage verfügbar",
  body: "{surveyTitle}",
  data: {
    type: "NEW_SURVEY",
    surveyId: string,
    surveyTitle: string,
    categoryId?: string
  }
}
```

### Präferenz-Defaults

Gemäß `docs/notification-suggestions.md` und Benutzer-Anforderung:

- `newJobOffers`: Default `false` (wenn `undefined`)
- `newNews`: Default `false` (wenn `undefined`)
- `newSurveys`: Default `false` (wenn `undefined`)

**Hinweis:** Alle neuen Notification-Präferenzen haben Default `false` wenn `undefined`. Notifications werden nur gesendet, wenn die Präferenz explizit auf `true` gesetzt ist.

### Circular Dependencies

- `NotificationsModule` importiert bereits `UsersModule` mit `forwardRef()`
- Services, die `UsersService` injizieren, müssen möglicherweise `forwardRef()` verwenden
- Siehe `src/events/events.service.ts` Zeile 20 für Beispiel

## Abhängigkeiten

- `NotificationService` aus `NotificationsModule`
- `UsersService.getAllUserProfilesWithIds()` für User-Abruf
- `UsersModule` muss in allen drei Modulen importiert sein
- `NotificationsModule` muss in allen drei Modulen importiert sein

## Offene Fragen / Entscheidungen

1. **News Title:** Soll für Poll-News `question` oder `content` als `newsTitle` verwendet werden? Dokument sagt `newsTitle`, aber Poll-News hat `question` statt `content`.

   - **Empfehlung:** Für Poll-News `question` verwenden, für Text/Image `content`

2. **CategoryId:** News und Surveys haben keine `categoryId` im Interface. Soll diese optional bleiben oder später hinzugefügt werden?

   - **Empfehlung:** Optional lassen, da nicht im Interface vorhanden

3. **Filterung nach Stadt:** Dokument erwähnt optional Filterung nach Stadt. Soll dies initial implementiert werden?

   - **Empfehlung:** Nein, initial weglassen, später hinzufügen wenn benötigt

## Implementierungs-Reihenfolge

1. Notification Preferences erweitern
2. Notification Data Interfaces erstellen
3. JobOffersService erweitern + Tests
4. NewsService erweitern + Tests
5. SpecialPollsService erweitern + Tests
6. Module erweitern
7. Integration Tests

## Erfolgskriterien

- ✅ Alle drei Notification-Typen senden Notifications bei Erstellung
- ✅ Präferenz-Prüfung funktioniert korrekt (enabled/disabled/default)
- ✅ Alle Tests bestehen
- ✅ Keine circular dependency Fehler
- ✅ Logging für Debugging vorhanden
- ✅ Error Handling verhindert, dass Fehler die Hauptfunktionalität beeinträchtigen