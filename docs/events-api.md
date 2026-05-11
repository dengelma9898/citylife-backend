# Events API – Status und Freigabe

Diese Dokumentation ergänzt die bestehenden Hinweise in [notification-suggestions.md](notification-suggestions.md) zu `NEW_EVENT` und `FAV_EVENT_UPDATE`.

## Authentifizierung

Alle Routen unter `/events` setzen wie im restlichen Backend ein gültiges Firebase-ID-Token voraus (inkl. anonymer Konten mit Token).

## Event-Status (`status`)

| Wert | Bedeutung |
|------|-----------|
| `ACTIVE` | Öffentlich in Listen (`GET /events`, `GET /events/by-ids`) und per `GET /events/:id` lesbar (sofern nicht eingeschränkt). |
| `PENDING` | Erstellt, aber noch nicht freigegeben; erscheint **nicht** in der öffentlichen Eventliste. |

**Abwärtskompatibilität:** Fehlt das Feld `status` in Firestore, wird das Event wie `ACTIVE` behandelt.

## Erstellung

- **Super Admin / Admin** (`userType` im User-Profil): neu erstellte Events sind **sofort** `ACTIVE`; `NEW_EVENT` wird gesendet (siehe Präferenzen in `.cursorrules`).
- **Alle anderen registrierten Nutzer** (inkl. Business- und normale User-Profile): neuer Status **`PENDING`**; **keine** `NEW_EVENT`-Push beim Erstellen.
- **Anonyme Firebase-Nutzer** (`sign_in_provider === 'anonymous'`): **keine** Erstellung oder Änderung von Events (`403`).

Erstellung erfolgt u. a. über:

- `POST /events`
- `POST /events/users/:id` – Ziel-ID muss der aufrufenden UID entsprechen oder der Aufrufer ist Admin; Zuordnung über `business_users.eventIds` **oder** `users.createdEventIds`.
- `POST /events/businesses/:id` – Aufrufer muss zu diesem Business berechtigt sein (Business-User mit `businessIds` oder Admin).

## Öffentliche Lesbarkeit

- `GET /events` – nur `ACTIVE` (und Legacy ohne `status`).
- `GET /events/by-ids?ids=…` – nur öffentlich sichtbare Events (keine `PENDING`).
- `GET /events/:id` – `PENDING` liefert **404** für Nicht-Admins; **Admin/Super Admin** darf Pending-Events lesen (intern `includePendingInResult`).

## „Meine“ Events (inkl. Pending)

- `GET /events/users/:id` – nur eigene UID oder Admin; liefert Events aus `business_users.eventIds` und `users.createdEventIds` mit **`includeAllStatuses: true`** (also inkl. Pending).

## Business-Events

- `GET /events/businesses/:id` – wenn der Aufrufer das Business verwalten darf (gleiche Logik wie bei Erstellung) oder Admin ist, werden alle Status geliefert; sonst nur öffentlich sichtbare.

## Freigabe (Admin)

- `GET /events/pending` – nur `admin` / `super_admin`: Liste aller `PENDING`-Events.
- `PATCH /events/:id/approve` – nur `admin` / `super_admin`: setzt `PENDING` → `ACTIVE` und löst **einmalig** `NEW_EVENT` aus (analog Freigabe bei Businesses).

Ablehnung ohne eigenen Status: Ein Admin kann ein unerwünschtes Event per `DELETE /events/:id` entfernen (siehe Berechtigung: Pending nur Ersteller/Admin).

## CSV-Import

`POST /events/import/csv` legt Events als **`ACTIVE`** an (Admin-/Importpfad). Anonyme Aufrufer erhalten `403`.

## Benachrichtigungen

- **NEW_EVENT:** nur bei `ACTIVE`-Erstellung oder nach **`PATCH /events/:id/approve`** (nicht bei Erstellung mit `PENDING`).
- **FAV_EVENT_UPDATE:** nur wenn **alt und neu** öffentlich sichtbar sind (`ACTIVE` bzw. fehlendes `status`); nicht bei reinen Pending-Änderungen.

Siehe [notification-suggestions.md](notification-suggestions.md) Abschnitte *NEW_EVENT* und *FAV_EVENT_UPDATE*.
