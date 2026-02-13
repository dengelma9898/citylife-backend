---
name: Ostereiersuche Feature
overview: Implementierung eines zeitlich begrenzten Ostereiersuche-Features als Gewinnspiel mit kartendarstellung. Das Feature kombiniert Elemente aus Events (Koordinaten, Bild, Titel, Beschreibung), Advent Calendar (Teilnahme, Gewinner, Feature-Flag) und Businesses (Karten-Marker). Es wird per Feature-Flag aktivierbar/deaktivierbar sein.
todos: []
isProject: false
---

# Ostereiersuche (Easter Egg Hunt) Feature

## Überblick

Ein zeitlich begrenztes Gewinnspiel-Feature, bei dem Ostereier mit Koordinaten auf einer Karte angezeigt werden. Angemeldete User können am Gewinnspiel teilnehmen; am Ende des Zeitraums werden ein oder mehrere Gewinner ermittelt.

**Implementierung**: Auf einem Feature-Branch (z.B. `feature/easter-egg-hunt`).

## Architektur-Referenzen

Das Feature orientiert sich an drei bestehenden Modulen:


| Aspekt                     | Referenz                                                                                                                                                                                      | Dateien                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Koordinaten, Karten-Marker | [Event](src/events/interfaces/event.interface.ts), [Business](src/businesses/domain/entities/business.entity.ts)                                                                              | `location: { address, latitude, longitude }` bzw. `BusinessAddress`     |
| Gewinnspiel, Teilnahme     | [Advent Calendar](src/advent-calendar/)                                                                                                                                                       | Entity mit `participants[]`, `winners[]`, `addParticipant`, `addWinner` |
| Feature-Flag               | [Advent Calendar](src/advent-calendar/application/services/advent-calendar.service.ts#L109-L133), [DirectChatSettings](src/direct-chats/application/services/direct-chat-settings.service.ts) | `getFeatureActive()`, `setFeatureActive()`                              |
| Bild-Upload                | [Advent Calendar](src/advent-calendar/application/controllers/advent-calendar.controller.ts#L174-L209), [Events](src/events/events.controller.ts)                                             | `FirebaseStorageService.uploadFile()`, Pfad `easter-eggs/{id}/image/`   |


## Kern-Entität: Easter Egg

**Teilnahme pro Ei**: Jedes Osterei hat einen eigenen Preis. User nehmen pro Ei teil – ein User kann bei mehreren Eiern mitmachen. Die Teilnehmer- und Gewinner-Logik liegt **pro Osterei**, analog zum Adventskalender (wo jeder Tag ein eigener Eintrag mit eigener Auslosung ist).

```typescript
// Osterei als Karten-Marker mit eigenem Gewinnspiel
interface EasterEggProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  prizeDescription?: string;   // Was man bei diesem Ei gewinnen kann
  numberOfWinners?: number;    // Anzahl Gewinner pro Ei (Default: 1)
  startDate: string;           // ISO-Datum, ab wann dieses Ei aktiv ist
  endDate?: string;            // Optional – ISO-Datum, bis wann aktiv. Ohne endDate: keine Zeitbegrenzung
  location: {
    address: string;           // z.B. "Hauptmarkt 1, 90403 Nürnberg"
    latitude: number;
    longitude: number;
  };
  participants: string[];      // User-IDs, die bei diesem Ei teilnehmen
  winners: string[];           // User-IDs, Gewinner dieses Eis
  createdAt: string;
  updatedAt: string;
}
```

## Datenmodell

### 1. Easter Eggs Collection (`easterEggs`)

- Ein Osterei pro Dokument
- Felder: `title`, `description`, `imageUrl`, `prizeDescription`, `numberOfWinners`, `startDate`, `endDate`, `location`, `participants`, `winners`, `createdAt`, `updatedAt`

### 2. Easter Egg Hunt Feature-Status (`easterEggHunt/feature-status`)

- Ein Dokument für Feature-Flag und Startdatum (analog zu `adventCalendar/feature-status`)
- Felder:
  - `isFeatureActive: boolean`
  - `startDate: string` (ISO, ab wann Teilnahme möglich)

## API-Endpoints

### Öffentlich (Feature aktiv)


| Methode | Pfad                                    | Beschreibung                                                   | Rollen                |
| ------- | --------------------------------------- | -------------------------------------------------------------- | --------------------- |
| GET     | `/easter-egg-hunt/feature-status`       | Feature aktiv + startDate                                      | user, admin, business |
| GET     | `/easter-egg-hunt/eggs`                 | Ostereier (optional `?activeOnly=true` = nur gültige)          | user, admin, business |
| GET     | `/easter-egg-hunt/eggs/:id`             | Einzelnes Ei mit Details                                       | user, admin, business |
| PATCH   | `/easter-egg-hunt/eggs/:id/participate` | Teilnahme an diesem Ei (nur user, admin – keine business_user) | user, admin           |


### Admin


| Methode | Pfad                                     | Beschreibung                       | Rollen             |
| ------- | ---------------------------------------- | ---------------------------------- | ------------------ |
| PUT     | `/easter-egg-hunt/feature-status`        | Feature ein/aus + startDate        | admin, super_admin |
| POST    | `/easter-egg-hunt/eggs`                  | Osterei anlegen                    | admin, super_admin |
| PATCH   | `/easter-egg-hunt/eggs/:id`              | Osterei bearbeiten                 | admin, super_admin |
| DELETE  | `/easter-egg-hunt/eggs/:id`              | Osterei löschen                    | admin, super_admin |
| POST    | `/easter-egg-hunt/eggs/:id/image`        | Bild hochladen                     | admin, super_admin |
| POST    | `/easter-egg-hunt/eggs/:id/draw-winners` | Gewinner für dieses Ei auslosen    | admin, super_admin |
| PATCH   | `/easter-egg-hunt/eggs/:id/winners`      | Gewinner für dieses Ei hinzufügen  | admin, super_admin |
| GET     | `/easter-egg-hunt/eggs/:id/participants` | Teilnehmerliste dieses Eis (Admin) | admin, super_admin |
| GET     | `/easter-egg-hunt/statistics`            | Statistiken für Admin-Frontend     | admin, super_admin |


### Statistiken-Endpoint (Admin)

- **GET** `/easter-egg-hunt/statistics` – Aggregierte Kennzahlen zur Ostereiersuche
- Mögliche Felder: `totalEggs`, `activeEggs`, `totalParticipants`, `totalWinners`, `participantsPerEgg` (Array mit eggId, title, participantCount, winnerCount), etc.
- Anzeige im Admin-Frontend (Dashboard / Übersicht)

## Weitere relevante Themen

### 1. Teilnahme-Modell

- **Pro Ei**: User kann bei mehreren Eiern teilnehmen (je Ei ein eigener Preis)
- **Einmal pro Ei**: Pro Osterei kann ein User nur einmal teilnehmen (analog Adventskalender)
- **Nähe-Prüfung (Geofencing)**: Client-seitig – Handy hat GPS, Eier haben Koordinaten. Der Client berechnet die Distanz und zeigt „Teilnehmen“ nur an, wenn der User in der Nähe ist. Keine Backend-Logik nötig.

### 2. Anonymous User

- Gewinnspiele nur für User mit **UserProfile** – Anonymous User haben keines
- Prüfung: Bei Teilnahme (`participate`) `UsersService.getUserProfile(userId)` aufrufen – existiert kein Profil, Teilnahme ablehnen
- Kein separates Token-Check nötig: Fehlendes UserProfile identifiziert anonyme User

### 3. Benachrichtigungen (laut .cursorrules prüfen)

- **Winner Notification**: Push-Benachrichtigung an Gewinner pro Ei (mit Titel des Eies bzw. Preis)
- Nutzung von `NotificationService`, `NotificationPayload`
- Neue Datenstruktur z.B. `EASTER_EGG_HUNT_WINNER` mit eggId, eggTitle, prizeDescription
- Prüfung von `notificationPreferences` vor Versand

### 4. Rechtliches / DSGVO

- Gewinnspiel-Teilnahmebedingungen und Datenschutz
- Optional: eigene Flag/Text für „Teilnahmebedingungen akzeptiert“ beim Participate-Request

### 5. Zeitliche Gültigkeit (zwei Ebenen)

- **Feature-Ebene** (`easterEggHunt/feature-status`): `isFeatureActive`, `startDate` – ab wann Teilnahme möglich (kein endDate)
- **Ei-Ebene** (`EasterEgg.startDate`, `EasterEgg.endDate?`): Jedes Ei hat eigene Gültigkeit. `endDate` optional – ohne Angabe bleibt Ei ohne Zeitbegrenzung aktiv
- **Teilnahme**: Nur möglich wenn Feature aktiv, aktuelles Datum >= Feature-`startDate` **und** aktuelles Datum innerhalb Ei-Zeitraum (>= startDate, ggf. <= endDate)
- **Karten-Anzeige** (GET `/eggs`): Optional nur aktuell gültige Eier zurückgeben (Query-Parameter `?activeOnly=true`, Default: nur aktive)
- **drawWinners** pro Ei – idealerweise nach Gültigkeitsende des Eies (ei.endDate) oder manuell vom Admin

### 6. Reihenfolge der Eier

- Nicht erforderlich – Eier werden nur als Marker auf der Karte angezeigt, keine Listen-/Sortierlogik nötig

### 7. Koordinaten / Location

- **Admin Frontend**: Koordinaten werden im Client ermittelt – analog zu Partnern (Businesses) oder Events. Das Admin-UI bietet Adresssuche/Geocoding; Backend erhält `address`, `latitude`, `longitude` fertig vom Client.
- **Backend**: Kein LocationService nötig – speichert die übergebenen Koordinaten unverändert.
- **Vorauswahl Partner-Standorte**: Beim Erstellen eines Ostereis soll der Admin Partner-Standorte als Vorauswahl nutzen können (die meisten Eier liegen bei Partnern). Admin-Frontend lädt bestehende Businesses/Partner und bietet deren Adressen als Option – bei Auswahl werden address/latitude/longitude übernommen.

### 8. Guard für Feature

- Eigenen Guard `EasterEggHuntEnabledGuard` (analog [DirectChatEnabledGuard](src/direct-chats/application/guards/direct-chat-enabled.guard.ts))
- Endpoints außer `feature-status` und Admin-Operationen durch diesen Guard schützen

## Modulstruktur

```
src/easter-egg-hunt/
├── easter-egg-hunt.module.ts
├── domain/
│   ├── entities/
│   │   └── easter-egg.entity.ts
│   └── repositories/
│       └── easter-egg.repository.ts
├── application/
│   ├── controllers/
│   │   └── easter-egg-hunt.controller.ts
│   ├── services/
│   │   ├── easter-egg-hunt.service.ts    # Feature-Status, Teilnahme, Gewinner-Logik
│   │   └── easter-egg.service.ts         # CRUD für Ostereier
│   └── guards/
│       └── easter-egg-hunt-enabled.guard.ts
├── infrastructure/
│   └── persistence/
│       └── firebase-easter-egg.repository.ts
└── dto/
    ├── create-easter-egg.dto.ts        # inkl. prizeDescription, numberOfWinners, startDate, endDate
    ├── update-easter-egg.dto.ts
    ├── set-feature-status.dto.ts       # isFeatureActive, startDate
    └── easter-egg-response.dto.ts   # participantCount (nicht participants-Array) für öffentliche Antworten
```

Feature-Status (isFeatureActive, startDate) wird direkt in Firestore `easterEggHunt/feature-status` gespeichert – analog zum Adventskalender, ohne separates Contest-Repository.

## Abhängigkeiten

- `FirebaseModule` – Firestore, Storage
- `UsersModule` – UserProfile-Prüfung (Anonymous-Check), ggf. Winner-Benachrichtigungen
- `NotificationsModule` – Winner-Benachrichtigung (optional, aber empfohlen)

Kein `LocationModule` – Koordinaten kommen vom Admin-Frontend (analog zu Events/Partnern).

## Implementierungsdetails / Zu bedenken

- **Tests** (Pflicht): Unit-Tests für Services, Controller-Tests für Endpoints – laut .cursorrules zu jedem Feature
- **AppModule**: `EasterEggHuntModule` in [app.module.ts](src/app.module.ts) importieren
- **AddWinnerDto**: Wie Adventskalender – DTO mit `userId` für PATCH `/eggs/:id/winners`
- **GET `/eggs` und `/eggs/:id` (öffentlich)**: `participants`-Array nicht zurückgeben (Datenschutz). `participantCount` als Zahl mitliefern für Anzeige (z.B. „12 Teilnehmer“). Admin erhält vollständige Liste über `/eggs/:id/participants`
- **business_user**: Dürfen **nicht** teilnehmen – nur Rollen `user` und `admin` bei `participate`
- **Notification Preference**: Für Winner-Push neuer Key in `UserProfile.notificationPreferences` (z.B. `easterEggHuntWinner`), Default laut .cursorrules: `false`

