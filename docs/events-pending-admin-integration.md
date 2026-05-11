# Pending Events – Integration Admin-Web

Kurzanleitung für die Admin-Oberfläche. Vollständige API-Felder und Regeln siehe [events-api.md](events-api.md).

## Voraussetzungen

- **Firebase ID-Token** in jedem Request: Header `Authorization: Bearer <token>`.
- Der angemeldete Nutzer benötigt im Firestore-Profil **`userType`: `admin` oder `super_admin`**. Nur diese Rollen dürfen die Pending-Liste lesen und freigeben (Backend: `RolesGuard` + `@Roles('admin', 'super_admin')` auf den entsprechenden Routen).

## Pending-Events laden

```
GET /events/pending
```

**Antwort:** Array von Events mit `status: "PENDING"` (gleiche Event-Struktur wie überall sonst).

**Typische Nutzung in der UI:** eigene Ansicht „Freigaben“ oder Badge mit Anzahl `(response.length)`. Die öffentliche Liste `GET /events` enthält **keine** Pending-Events.

## Einzelnes Event prüfen (Detail)

Solange das Event noch `PENDING` ist:

```
GET /events/:id
```

Für Admin/Super-Admin liefert das Backend auch Pending-Einträge. Ohne Admin-Rolle wäre die Antwort für Pending **404**.

## Freigeben

```
PATCH /events/:id/approve
```

- Leerer Body ist ausreichend.
- Wirkung: `PENDING` → `ACTIVE`; danach wird **einmal** die Push-Logik **`NEW_EVENT`** ausgelöst (je nach Nutzer-Präferenzen).
- Ist das Event nicht `PENDING` (z. B. bereits aktiv), antwortet das Backend mit einem **Fehler** (nicht erfolgreiche Freigabe) – idealerweise Hinweis in der UI („bereits freigegeben“).

## Ablehnung / Entfernen

Es gibt **keinen** gesonderten „Reject“-Status. Unpassende Einträge entfernen:

```
DELETE /events/:id
```

- Nur mit berechtigtem Aufruf (wie bei anderen Event-Mutationen; Pending: u. a. Ersteller oder Admin nach Backend-Regeln).

## Hinweise fürs Admin-Frontend

| Thema | Empfehlung |
|-------|------------|
| Liste vs. Detail | Liste über `GET /events/pending`, Details/Kalenderüberblick über `GET /events/:id`. |
| Nach Freigabe | Eintrag aus der Pending-Liste entfernen bzw. Liste neu laden; optional Link zur öffentlichen Event-Ansicht. |
| Öffentliche Karte/Liste im Admin | Weiterhin `GET /events` nutzen – zeigt nur freigegebene Events. |

## Referenz

- [events-api.md](events-api.md) – Status, Sichtbarkeit, Benachrichtigungen  
- [.cursorrules](.cursorrules) – Auth, Rollen (`RolesGuard`)
