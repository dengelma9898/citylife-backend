# Flutter: City Pass Statistik

## Übersicht

Das Backend speichert bei jedem Partner-Scan (`PATCH /businesses/:id/scan`) ab Rollout zusätzlich einen Eintrag unter `users/{userId}/pass-scans`. Ältere Scans in `businesses.*.customers[]` erscheinen **nicht** in der Statistik. Pro Scan werden festgehalten:

- **`benefit`** – der Vorteilstext des Partners **zum Zeitpunkt des Scans** (Snapshot, nicht der aktuelle Business-Benefit)
- **`price`** – optional der vom Partner erfasste Betrag (z. B. Rechnungsbetrag)

Es gibt **keine** serverseitig berechnete „geschätzte Ersparnis“ (kein Prozent-Default). Eine Euro-Anzeige wie „ca. X € gespart“ muss die App später selbst ableiten – z. B. aus `price` und `benefit` – oder entfällt bis eine klare Regel existiert.

---

## Authentifizierung

Alle Endpunkte erfordern ein gültiges Firebase-ID-Token im Header:

```http
Authorization: Bearer <firebase_id_token>
```

Nur der eingeloggte Nutzer darf seine eigenen Statistiken abrufen (`userId` in der URL = `uid` aus dem Token).

---

## Pass-Statistik abrufen

```http
GET /users/{userId}/pass-stats?period=month
GET /users/{userId}/pass-stats?period=year
```

| Query | Werte | Default |
|-------|--------|---------|
| `period` | `month`, `year` | `month` |

### Beispiel-Response

```json
{
  "period": "month",
  "periodStart": "2026-05-01T00:00:00.000+02:00",
  "periodEnd": "2026-05-31T23:59:59.999+02:00",
  "benefitUseCount": 4,
  "recentScans": [
    {
      "id": "a1b2c3...",
      "userId": "firebaseUid",
      "customerId": "NSP-firebaseUid",
      "businessId": "business123",
      "businessName": "Café Beispiel",
      "scannedAt": "2026-05-20T14:30:00.000+02:00",
      "benefit": "10% auf alles",
      "price": 70,
      "numberOfPeople": 2
    }
  ]
}
```

| Feld | UI-Empfehlung |
|------|----------------|
| `benefitUseCount` | z. B. „Diesen Monat **4×** Vorteil genutzt“ |
| `recentScans[].benefit` | z. B. „10% auf alles“ beim jeweiligen Besuch |
| `recentScans[].price` | Optional anzeigen, wenn gesetzt (z. B. „70 €“) – Semantik: vom Partner erfasster Betrag, nicht automatisch „Ersparnis“ |

### Fehler

| Status | Bedeutung |
|--------|-----------|
| `401` | Kein/ungültiges Token oder `userId` ≠ eingeloggter User |

---

## Partner-Scan (unverändert)

```http
PATCH /businesses/{businessId}/scan
Content-Type: application/json

{
  "customerId": "NSP-firebaseUid",
  "userId": "firebaseUid",
  "price": 70,
  "numberOfPeople": 2
}
```

- **`price`**: optional; wird am Pass-Scan gespeichert, wenn angegeben.
- **`benefit`**: wird serverseitig aus dem aktuellen Business-Benefit beim Scan übernommen (bereits im `customers[]`-Eintrag).
- **`userId`**: optional; Auflösung über `customerId` möglich.

Die Statistik enthält **nur Scans ab Rollout** des Features (kein Import alter `business.customers[]`-Einträge).

---

## Dart-Model (Vorschlag)

```dart
class PassStats {
  final String period;
  final String periodStart;
  final String periodEnd;
  final int benefitUseCount;
  final List<PassScan> recentScans;
}

class PassScan {
  final String id;
  final String businessName;
  final String scannedAt;
  final String benefit;
  final double? price;
}
```
