# Kuratierte Spots – Flutter: Admin-Sterne anzeigen, Toggle & Nutzer-Bewertung

Dieser Guide ergänzt [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md) (Listen, Suche, Detail, Keywords). Hier geht es um **Anzeige der Redaktionsbewertung**, **Nutzer-Aggregate**, den **Feature-Toggle** für Community-Bewertungen und das **einmalige** Absenden einer eigenen Bewertung.

Autoritative API-Übersicht: [curated-spots-admin-integration.md](./curated-spots-admin-integration.md) (Abschnitt Bewertungen).

---

## 1. Voraussetzungen

- **Firebase Auth:** wie im Lesen-Guide – jeder Request `Authorization: Bearer` mit `currentUser.getIdToken()`.
- **Response-Envelope:** JSON-Root enthält `data` und `timestamp`; immer `body['data']` auswerten.
- **BASE_URL:** umgebungsabhängig (siehe [README.md](../README.md)).

---

## 2. Datenmodell am Spot

Erweitert eure `CuratedSpot`-Klasse (siehe Lesen-Guide), falls noch nicht geschehen:

| Feld | Dart-Typ | Nutzen |
|------|----------|--------|
| `adminRating` | `int?` | Redaktion 1–5, `null` = nicht vergeben |
| `adminRatedAt` | `String?` | ISO-Zeit der ersten Vergabe |
| `userRatingAverage` | `double?` | Schnitt aller Nutzerstimmen |
| `userRatingCount` | `int` | Anzahl Nutzerstimmen (Default `0`) |

**Anzeige-Ideen**

- **Redaktion:** z. B. „Unsere Wertung“ + `adminRating` Sterne + optional formatiertes `adminRatedAt`.
- **Community:** wenn `userRatingCount > 0`: Durchschnitt (`userRatingAverage`) und „Basierend auf X Bewertungen“. Sonst Platzhalter „Noch keine Community-Bewertung“.

---

## 3. Feature-Toggle laden

Bevor ihr UI zum **Bewerten durch Nutzer:innen** zeigt, den Schalter lesen:

- **GET** `{baseUrl}/curated-spots/settings/user-ratings`
- **`data`:** `Map` mit `isEnabled` (bool), `updatedAt`, optional `updatedBy`.

```dart
class CuratedSpotsUserRatingsSettings {
  const CuratedSpotsUserRatingsSettings({
    required this.id,
    required this.isEnabled,
    required this.updatedAt,
    this.updatedBy,
  });

  final String id;
  final bool isEnabled;
  final String updatedAt;
  final String? updatedBy;

  static CuratedSpotsUserRatingsSettings fromJson(Map<String, dynamic> json) {
    return CuratedSpotsUserRatingsSettings(
      id: json['id'] as String? ?? 'curated_spots_user_ratings_settings',
      isEnabled: json['isEnabled'] as bool? ?? false,
      updatedAt: json['updatedAt'] as String? ?? '',
      updatedBy: json['updatedBy'] as String?,
    );
  }
}

Future<CuratedSpotsUserRatingsSettings> fetchUserRatingsSettings(String baseUrl) async {
  final envelope = await _getJson(Uri.parse('$baseUrl/curated-spots/settings/user-ratings'));
  return CuratedSpotsUserRatingsSettings.fromJson(
    _unwrapData(envelope) as Map<String, dynamic>,
  );
}
```

`_getJson` / `_unwrapData`: wie im [Lesen-Guide](./flutter-curated-spots-read-integration.md#3-http-helfer).

**Empfehlung:** Einstellung beim Öffnen der Spot-Detailseite oder einmal pro Session cachen; bei Pull-to-Refresh neu laden.

---

## 4. Eigene Nutzerbewertung: lesen & senden

Nur sinnvoll, wenn `settings.isEnabled == true`. Sonst liefern diese Endpunkte **503** – dann keine Bewertungs-UI anzeigen (oder Hinweis „Derzeit nicht verfügbar“).

### Eigene Abfrage

- **GET** `{baseUrl}/curated-spots/{id}/my-user-rating`
- **`data`:** `null` wenn noch nicht bewertet, sonst `{ "score": int, "ratedAt": string }`.

```dart
class MyCuratedSpotRating {
  const MyCuratedSpotRating({required this.score, required this.ratedAt});

  final int score;
  final String ratedAt;

  static MyCuratedSpotRating fromJson(Map<String, dynamic> json) {
    return MyCuratedSpotRating(
      score: (json['score'] as num).toInt(),
      ratedAt: json['ratedAt'] as String,
    );
  }
}

Future<MyCuratedSpotRating?> fetchMyCuratedSpotRating(String baseUrl, String spotId) async {
  final envelope = await _getJson(
    Uri.parse('$baseUrl/curated-spots/${Uri.encodeComponent(spotId)}/my-user-rating'),
  );
  final raw = _unwrapData(envelope);
  if (raw == null) return null;
  return MyCuratedSpotRating.fromJson(raw as Map<String, dynamic>);
}
```

*(Falls euer Backend `data: null` als JSON `null` liefert – entsprechend parsen; sonst leeres Objekt prüfen.)*

### Einmalig absenden

- **POST** `{baseUrl}/curated-spots/{id}/my-user-rating`
- **Body:** `{"score": <1–5>}`
- **Erfolg:** `data` wie oben (`score`, `ratedAt`).
- **409:** Nutzer hat diesen Spot **bereits** bewertet → keine zweite Abgabe; UI auf reinen Anzeigemodus schalten.

```dart
Future<MyCuratedSpotRating> submitMyCuratedSpotRating(
  String baseUrl,
  String spotId,
  int score,
) async {
  final token = await FirebaseAuth.instance.currentUser?.getIdToken();
  if (token == null) throw StateError('Nicht angemeldet');
  final res = await http.post(
    Uri.parse('$baseUrl/curated-spots/${Uri.encodeComponent(spotId)}/my-user-rating'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: jsonEncode({'score': score}),
  );
  if (res.statusCode == 409) {
    throw StateError('Bereits bewertet');
  }
  if (res.statusCode == 503) {
    throw StateError('Bewertungen derzeit deaktiviert');
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('POST my-user-rating → ${res.statusCode}: ${res.body}');
  }
  final map = jsonDecode(res.body) as Map<String, dynamic>;
  return MyCuratedSpotRating.fromJson(_unwrapData(map) as Map<String, dynamic>);
}
```

---

## 5. UI-Ablauf (Spot-Detail)

1. Spot laden (`GET /curated-spots/:id` oder aus Liste) → `adminRating`, `adminRatedAt`, `userRatingAverage`, `userRatingCount` anzeigen.
2. Parallel (oder danach): `fetchUserRatingsSettings`.
3. Wenn `!isEnabled`: keinen „Jetzt bewerten“-Block.
4. Wenn `isEnabled`:
   - `fetchMyCuratedSpotRating` aufrufen.
   - Wenn `null`: Sterne-Auswahl + „Senden“ (einmalig).
   - Wenn nicht `null`: nur „Deine Bewertung: X Sterne“ + `ratedAt`, kein erneutes Senden.
5. Nach erfolgreichem POST optional den Spot erneut laden oder `userRatingAverage`/`userRatingCount` lokal nicht exakt vorhersagen – einfacher ist **Spot-Detail refreshen**, damit Aggregate vom Server stimmen.

---

## 6. Fehler & Edge Cases

| HTTP | Bedeutung | Flutter-Reaktion |
|------|-----------|------------------|
| 503 | Toggle aus | Hinweis, kein POST |
| 409 | Schon bewertet | State mit `fetchMyCuratedSpotRating` abgleichen |
| 404 | Spot nicht aktiv/gelöscht | wie bestehendes Detail-Verhalten |
| 401 | Token | Login / Token erneuern |

---

## 7. Verknüpfung zur Hauptdoku

- Öffentliche Lese-Endpunkte und Keyword-Flows: [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md).
- Admin- und Toggle-Pfade (identische URLs): [curated-spots-admin-integration.md](./curated-spots-admin-integration.md).
- Web-Admin (Redaktion + Toggle): [curated-spots-ratings-web-integration.md](./curated-spots-ratings-web-integration.md).
