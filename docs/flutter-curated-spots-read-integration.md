# Flutter – Kuratierte Spots (nur Lesen)

Dieser Guide beschreibt die **Integration in die Nürnbergspots-Flutter-App**, wenn ihr **nur aktive Spots anzeigen** wollt (Listen, Suche, Detail, Keyword-Anzeige). Schreibende Admin-Endpunkte sind hier **nicht** enthalten.

**Autoritative API-Referenz** (Pfade, Felder, Fehlerfälle): [curated-spots-admin-integration.md](./curated-spots-admin-integration.md) – Abschnitte zu öffentlichen Lese-Routen und Spot-Keywords.

---

## 1. Voraussetzungen

### Base URL

Wie in der App bereits für andere APIs: Umgebungsabhängiger Host inkl. ggf. Präfix (`/dev`, `/prd` …), siehe [README.md](../README.md) (`BASE_URL`).

### Authentifizierung

- **Jede** Anfrage: Header `Authorization: Bearer <FirebaseIdToken>`.
- Token z. B. mit `FirebaseAuth.instance.currentUser?.getIdToken()` (bei Bedarf `forceRefresh: true` nach Login/Rollenwechsel).
- Ohne gültigen Token: **401** (globales `AuthGuard`).

### Response-Envelope

Alle JSON-Antworten sind eingepackt:

```json
{
  "data": <Nutzlast>,
  "timestamp": "<ISO Berlin>"
}
```

In Dart nach `jsonDecode` immer **`body['data']`** auswerten, nicht die Wurzel als Spot-Liste behandeln.

---

## 2. Datenmodelle (Dart, empfohlen)

Orientierung an der API und an Partner-Adressen; `status` ist in Lese-Antworten typischerweise `"ACTIVE"`.

```dart
class CuratedSpotAddress {
  const CuratedSpotAddress({
    required this.street,
    required this.houseNumber,
    required this.postalCode,
    required this.city,
    required this.latitude,
    required this.longitude,
  });

  final String street;
  final String houseNumber;
  final String postalCode;
  final String city;
  final double latitude;
  final double longitude;

  static CuratedSpotAddress fromJson(Map<String, dynamic> json) {
    return CuratedSpotAddress(
      street: json['street'] as String? ?? '',
      houseNumber: json['houseNumber'] as String? ?? '',
      postalCode: json['postalCode'] as String? ?? '',
      city: json['city'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
    );
  }
}

class CuratedSpot {
  const CuratedSpot({
    required this.id,
    required this.name,
    required this.nameLower,
    required this.descriptionMarkdown,
    required this.imageUrls,
    required this.keywordIds,
    required this.address,
    this.videoUrl,
    this.instagramUrl,
    required this.status,
    required this.isDeleted,
    required this.createdAt,
    required this.updatedAt,
    this.createdByUserId,
  });

  final String id;
  final String name;
  final String nameLower;
  final String descriptionMarkdown;
  final List<String> imageUrls;
  final List<String> keywordIds;
  final CuratedSpotAddress address;
  final String? videoUrl;
  final String? instagramUrl;
  final String status;
  final bool isDeleted;
  final String createdAt;
  final String updatedAt;
  final String? createdByUserId;

  static CuratedSpot fromJson(Map<String, dynamic> json) {
    return CuratedSpot(
      id: json['id'] as String,
      name: json['name'] as String,
      nameLower: json['nameLower'] as String? ?? '',
      descriptionMarkdown: json['descriptionMarkdown'] as String? ?? '',
      imageUrls: (json['imageUrls'] as List<dynamic>? ?? []).cast<String>(),
      keywordIds: (json['keywordIds'] as List<dynamic>? ?? []).cast<String>(),
      address: CuratedSpotAddress.fromJson(
        json['address'] as Map<String, dynamic>? ?? <String, dynamic>{},
      ),
      videoUrl: json['videoUrl'] as String?,
      instagramUrl: json['instagramUrl'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      isDeleted: json['isDeleted'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      createdByUserId: json['createdByUserId'] as String?,
    );
  }
}

class SpotKeyword {
  const SpotKeyword({
    required this.id,
    required this.name,
    required this.nameLower,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String nameLower;
  final String createdAt;
  final String updatedAt;

  static SpotKeyword fromJson(Map<String, dynamic> json) {
    return SpotKeyword(
      id: json['id'] as String,
      name: json['name'] as String,
      nameLower: json['nameLower'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}
```

---

## 3. HTTP-Helfer

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

Future<String?> _bearer() async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) return null;
  return user.getIdToken();
}

Future<Map<String, dynamic>> _getJson(Uri uri) async {
  final token = await _bearer();
  if (token == null) {
    throw StateError('Nicht angemeldet');
  }
  final res = await http.get(
    uri,
    headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    },
  );
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('GET $uri → ${res.statusCode}: ${res.body}');
  }
  final map = jsonDecode(res.body) as Map<String, dynamic>;
  return map;
}

dynamic _unwrapData(Map<String, dynamic> envelope) => envelope['data'];
```

*(Ihr könnt dieselbe Logik mit `dio` kapseln; wichtig ist nur: gleiche Header + `data` entpacken.)*

---

## 4. Endpunkte (nur Lesen)

### 4.1 Alle aktiven Spots

- **GET** `{baseUrl}/curated-spots`
- **Auth:** beliebiger angemeldeter User (keine Admin-Rolle).
- **Semantik:** nur `status == ACTIVE` und `isDeleted == false`.

```dart
Future<List<CuratedSpot>> fetchActiveCuratedSpots(String baseUrl) async {
  final envelope = await _getJson(Uri.parse('$baseUrl/curated-spots'));
  final raw = _unwrapData(envelope);
  final list = raw as List<dynamic>;
  return list
      .map((e) => CuratedSpot.fromJson(e as Map<String, dynamic>))
      .toList();
}
```

### 4.2 Suche (Name-Präfix + Keyword-IDs, UND-Logik)

- **GET** `{baseUrl}/curated-spots/search`
- **Query:**
  - `namePrefix` – optional.
  - `keywordIds` – optional; **mehrfach** erlaubt (UND über alle IDs).

**Encoding:**

- Mehrere Werte: `?keywordIds=id1&keywordIds=id2`
- oder ein Wert mit Komma: `?keywordIds=id1,id2`

```dart
Future<List<CuratedSpot>> searchCuratedSpots(
  String baseUrl, {
  String? namePrefix,
  List<String> keywordIds = const [],
}) async {
  final parts = <String>[];
  if (namePrefix != null && namePrefix.isNotEmpty) {
    parts.add('namePrefix=${Uri.encodeQueryComponent(namePrefix)}');
  }
  for (final id in keywordIds) {
    if (id.isNotEmpty) {
      parts.add('keywordIds=${Uri.encodeQueryComponent(id)}');
    }
  }
  final q = parts.isEmpty ? '' : '?${parts.join('&')}';
  final envelope = await _getJson(Uri.parse('$baseUrl/curated-spots/search$q'));
  final raw = _unwrapData(envelope) as List<dynamic>;
  return raw.map((e) => CuratedSpot.fromJson(e as Map<String, dynamic>)).toList();
}
```

*(Komma-separierte `keywordIds` in einem Query-Wert akzeptiert das Backend ebenfalls; wiederholter Key `keywordIds` ist für Clients oft am einfachsten. Die manuelle Query-Zusammenstellung vermeidet Einschränkungen von `Uri.queryParameters` bei wiederholten Keys.)*

### 4.3 Spot-Detail (nur aktiv)

- **GET** `{baseUrl}/curated-spots/{id}`
- **Pfad-ID:** `Uri(pathSegments: ['curated-spots', id])` oder `encodeURIComponent` bei seltenen Sonderzeichen in IDs.
- **Fehler:** **404**, wenn Spot nicht existiert, nicht aktiv oder gelöscht.

```dart
Future<CuratedSpot> fetchCuratedSpotById(String baseUrl, String id) async {
  final envelope = await _getJson(Uri.parse('$baseUrl/curated-spots/$id'));
  return CuratedSpot.fromJson(_unwrapData(envelope) as Map<String, dynamic>);
}
```

### 4.4 Keyword-Vorschläge (Autocomplete)

- **GET** `{baseUrl}/spot-keywords/suggest?q={prefix}&limit=20`
- **`q`:** Pflicht, nicht leer/Whitespace → sonst **400**.

```dart
Future<List<SpotKeyword>> suggestSpotKeywords(
  String baseUrl,
  String prefix, {
  int limit = 20,
}) async {
  final uri = Uri.parse('$baseUrl/spot-keywords/suggest').replace(
    queryParameters: {
      'q': prefix,
      'limit': limit.clamp(1, 50).toString(),
    },
  );
  final envelope = await _getJson(uri);
  final raw = _unwrapData(envelope) as List<dynamic>;
  return raw.map((e) => SpotKeyword.fromJson(e as Map<String, dynamic>)).toList();
}
```

### 4.5 Keyword nach ID (Anzeigenamen für Chips)

- **GET** `{baseUrl}/spot-keywords/{id}`
- Nutzen: aus `CuratedSpot.keywordIds` die **Namen** für die UI laden (parallel mit `Future.wait`).
- **404:** Keyword existiert nicht mehr → z. B. Chip-Label „Unbekannt“, ID dennoch behalten.

```dart
Future<SpotKeyword?> fetchSpotKeywordById(String baseUrl, String id) async {
  final token = await _bearer();
  if (token == null) throw StateError('Nicht angemeldet');
  final res = await http.get(
    Uri.parse('$baseUrl/spot-keywords/$id'),
    headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    },
  );
  if (res.statusCode == 404) return null;
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('GET spot-keywords/$id → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return SpotKeyword.fromJson(_unwrapData(envelope) as Map<String, dynamic>);
}
```

---

## 5. UI-Hinweise

- **Markdown:** `descriptionMarkdown` in der App rendern (z. B. `flutter_markdown`).
- **Karte / Navigation:** `address.latitude` / `address.longitude` und formatierte Zeile aus Straße, Hausnummer, PLZ, Ort.
- **Bilder / Video:** `imageUrls` als Galerie; `videoUrl` mit eurem Video-Player (externe URL).
- **Caching:** optional `cached_network_image`; Cache-Invalidierung bei Pull-to-refresh über erneuten `GET /curated-spots`.

---

## 6. Fehlerbilder (Lesen)

| HTTP | Typische Ursache |
|------|------------------|
| 401 | Kein oder abgelaufenes Firebase-Token |
| 400 | `spot-keywords/suggest` ohne gültiges `q` |
| 404 | `GET /curated-spots/:id` – Spot nicht öffentlich sichtbar |
| 404 | `GET /spot-keywords/:id` – Keyword fehlt |

---

## 7. Nächster Schritt

Wenn die Anzeige steht und ihr **Spots in der App anlegen** wollt: [flutter-curated-spots-create-integration.md](./flutter-curated-spots-create-integration.md) (Admin-Rolle, `POST`/`PATCH`, Multipart-Uploads).
