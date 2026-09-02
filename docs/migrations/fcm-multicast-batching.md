# Migration: FCM via `sendEachForMulticast` (Group B Follow-up)

> Status: **Deferred / Follow-up** – NICHT umgesetzt im Performance-Paket 2026-09.
> Grund: Siehe Entscheidung im Performance-Review 2026-09 (B1). Zuerst wurde der Concurrency-Limiter umgesetzt (sanft, API-neutral). Diese Migration packt dieselben FCM-Sends in Batches, um die Zahl der HTTP-Aufrufe drastisch zu senken.

---

## 1. Ausgangslage

### 1.1 Heutige Implementierung

`src/notifications/application/services/notification.service.ts`:

- `sendToUser(userId, payload)`: lädt FCM-Tokens des Users und ruft für **jedes Token einzeln** `getMessaging().send({...})` auf (mit Concurrency-Limiter seit Performance-Paket 2026-09).
- `sendToUsers(userIds, payload)`: `Promise.all` über `sendToUser`.
- Ungültige Tokens (Codes `messaging/invalid-registration-token`, `messaging/registration-token-not-registered`) werden danach per `usersService.removeFcmToken(userId, deviceId)` entfernt.

### 1.2 Zielerreichung durch Multicast

`getMessaging().sendEachForMulticast(message)` mit `MulticastMessage` (Feld `tokens: string[]`):

- **Ein** HTTP-Aufruf für bis zu **500 Tokens**.
- Antwort `BatchResponse`: `{ successCount, failureCount, responses: [{ messageId, error }] }`.
- Fehlercodes pro `responses[i]` = `error?.code`; Index `i` korrespondiert mit `tokens[i]`.

Ersparnis: 1 Aufruf statt N. Für „Neues Event“/„Neues Business“ (fan-out an alle User, je 1+ Token) wird die Last von 10⁴–10⁵ Sends auf einige Dutzend Batches reduziert.

---

## 2. Nicht-verhandelbare Constraints (Backward-Compat)

- Öffentliche Methoden `sendToUser(userId, payload)` und `sendToUsers(userIds, payload)` behalten **exakt** Signatur + Verhalten (gleiche Payload-Inhalte, gleiches Logging, gleiche Invalid-Token-Bereinigung).
- Aufrufer (`events.service.ts`, `businesses.service.ts`) bleiben unverändert.
- Keine Änderung an `NotificationPayload` (Field-Contract).
- `data`-Payload bleibt pro Message gleich (gilt heute schon pro `sendToUser`).

---

## 3. Schritt-für-Schritt-Plan

### Phase 1 – Vorbereitung / Verifikation

- [ ] FCM v1 API aktiv (bereits dokumentiert, CONSTITUTION §4.2). Kein Legacy-Key nötig.
- [ ] **Test-Feuerprobe:** `sendEachForMulticast` mit 1 Test-Token aus der Firebase Console; BatchResponse-Werte beobachten (`successCount`, `failureCount`, `error.code`).

### Phase 2 – Refactor: private Chunk-Helper

- [ ] Neuer privater Helper in `NotificationService`:
  ```typescript
  private async sendMulticastChunk(
    tokens: FcmToken[],            // pro User
    payload: NotificationPayload,
  ): Promise<{ sent: number; invalidDeviceIds: string[] }>
  ```
  - Batch-Größe: `const CHUNK_SIZE = 500;` (FCM-Limit).
  - Chunken über `tokens`-Array in Slice-Größen von 500.
  - Pro Chunk: `sendEachForMulticast({ tokens: chunk.map(t => t.token), notification: {...payload}, data: {...} })`.
  - **Plattform-Felder** (`apns`, `android`) wie bisher setzen – `MulticastMessage` unterstützt dieselben Felder.
  - Fehler-Mapping: über `response.responses` iterieren; bei `error` den Code prüfen und bei Invalid-Token-Codes das `deviceId` aus `chunk[i].deviceId` sammeln.
  - `successCount` entsprechend hochzählen.
  - **Chunk-Concurrency klein halten:** Chunks **sequenziell** oder mit kleinem Limiter (z. B. 2–4 gleichzeitig) verarbeiten, damit das Backend nicht durch eigene Sends überlastet wird.

### Phase 3 – `sendToUser` auf Multicast umstellen

- [ ] `sendToUser` ersetzt den bisherigen Einzel-Send-Loop durch `sendMulticastChunk(tokens, payload)`.
- [ ] Invalid-Device-IDs wie bisher an `removeFcmToken(userId, deviceId)` geben (Batch-Bereinigung mit `Promise.all`, wie seit Performance-Paket 2026-09).
- [ ] Logging-Formate beibehalten (`[FCM] Found N FCM tokens …`, `Completed sending to user …`), damit Monitoring-Dashboards nicht brechen.
- [ ] **Wichtig:** Fehler auf Chunk-Ebene (`messaging/...` andere Codes, RPC-Fehler) so behandeln wie bisher: loggen, nicht die ganze Send-Kette abbrechen.

### Phase 4 – `sendToUsers` prüfen

- [ ] Bleibt strukturell `Promise.all` über `sendToUser`. Keine Änderung nötig, da `sendToUser` jetzt intern batched.
- [ ] Optional (nur falls nötig, Messung erforderlich): eigenen Concurrency-Limiter für die `sendToUser`-Ebene ergänzen (aktuell nicht nötig, `sendToUsers` wird nur von wenigen Admin/Event-Pfaden genutzt).

### Phase 5 – Bereinigung

- [ ] Alte Helper (`sendWithConcurrency` bzw. dessen Kern) entfernen, wenn kein Nutzer mehr existiert.
- [ ] Dead-Code-Suche: `getMessaging().send(` darf nach der Migration **nicht mehr** im Notification-Service vorkommen.

---

## 4. Risk & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Batch-Limit 500 Tokens überschritten | Chunking hart auf 500 (CONSTANT). |
| Mischung gültiger/ungültiger Tokens im selben Batch | `BatchResponse` behandelt das nativ; nur die Fehler-Indizes bereinigen. |
| APNs/Android-Felder pro Token unterschiedlich | Heute schon identisch pro `sendToUser`; kein Regressionsrisiko. Wenn später differenziert: `sendEach` (Message pro Token) als Fallback behalten. |
| Doppel-Push bei erneuten Sends | Verhalten identisch zum heutigen `send()`-Einzelaufruf. |
| Logging-Bruch | Log-Format unverändert lassen (siehe Phase 3). |

---

## 5. Testabdeckung

- [ ] Unit-Test `notification.service.spec.ts`:
  - Fake `getMessaging`/`sendEachForMulticast` (jest.mock von `firebase-admin/messaging`).
  - Mocks: `usersService.getFcmTokens`, `removeFcmToken`.
  - Fälle: 0 Tokens; 1 Token; exakt 500; 501 (2 Chunks); Mixed valid/invalid (→ `invalidDeviceIds` korrekt); gesamter Batch-Wurf.
  - Assertion: `sendEachForMulticast` wurde mit geschnittenen `tokens`-Arrays aufgerufen; Invalid-Device-IDs entfernt; Logs enthalten `[FCM]`.
- [ ] Smoke-Test gegen echtes FCM (1 Gerät) vor Merge.

---

## 6. Abschätzung (nach Migration)

| Metrik | Heute | Nach Migration |
|--------|-------|----------------|
| Sends pro „Neues Event“ (N User) | N | ⌈N/500⌉ |
| Invalid-Token-Bereinigung | pro Token 1 DB-Update | pro User 1 `Promise.all` über wenige Invalid-IDs |
| Netzaufwand Backend→FCM | Hoch | Minimal |

---

**Letzte Aktualisierung:** 2026-09-02
**Gehört zu:** Performance-Review 2026-09 (B1 Follow-up) – siehe `docs/migrations/events-server-side-queries.md` (Group C).