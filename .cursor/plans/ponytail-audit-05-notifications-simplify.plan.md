---
name: Ponytail Audit 05 – Notifications vereinfachen
overview: Abstract NotificationService und Micro-Interface-Dateien konsolidieren
status: pending
created: 2026-06-20
phase: 5
effort: S
impact: "~-90 LOC"
isProject: true
---

# Phase 05 – Notifications vereinfachen

## Ziel

Notification-Layer verschlanken ohne Verhalten zu ändern.

## Ist-Zustand

- `NotificationService` – abstract class mit 2 Methoden, **eine** Implementierung: `FcmNotificationService`
- 12 Dateien à 5–7 Zeilen unter `src/notifications/domain/interfaces/*-notification-data.interface.ts`

## Schritte

### 1. Abstract Class entfernen

- [ ] `FcmNotificationService` implementiert direkt ohne `extends NotificationService`
- [ ] `notifications.module.ts`: `FcmNotificationService` als `NotificationService`-Token providen **oder** überall `FcmNotificationService` injizieren
- [ ] Alle `@Inject(NotificationService)` / Constructor-Injection-Pfade prüfen
- [ ] `notification.service.ts` (abstract) löschen

### 2. Notification-Data-Interfaces konsolidieren

- [ ] Alle `*-notification-data.interface.ts` in `notification-payload.interface.ts` als Union/Map mergen:

```typescript
export type NotificationData =
  | BusinessNotificationData
  | EventNotificationData
  | ...;
```

- [ ] Imports in `FcmNotificationService` und sendenden Services aktualisieren
- [ ] Einzeldateien löschen

### 3. Tests

- [ ] Bestehende Notification-Specs anpassen (Mocks, Imports)
- [ ] Preference-Tests unverändert grün halten (`.cursorrules`)

## Validierung

```bash
rg "extends NotificationService|notification-data.interface" src
npm test -- notifications
```

## Risiken

- **Niedrig:** Rein strukturell, kein API- oder FCM-Verhalten ändern
- **Doku:** `docs/client-notification-integration.md` prüfen ob Typnamen referenziert werden

## Erwarteter Impact

~−90 LOC, 11 Dateien weniger
