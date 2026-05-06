# Flutter – Kuratierte Spots anlegen und pflegen

Dieser Guide beschreibt die **Schreib- und Upload-Endpunkte** für kuratierte Spots, wenn die Flutter-App Nutzern mit **Admin- oder Super-Admin-Rolle** das Anlegen direkt in der App ermöglichen soll.

**Voraussetzung:** Lesende Integration ist verstanden (Response-Envelope `data`, Firebase-Token, Modelle) – siehe [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md).

**Autoritative API-Referenz** (Felder, Keyword-Semantik, Fehler): [curated-spots-admin-integration.md](./curated-spots-admin-integration.md).

---

## 1. Rollen und Sicherheit

### Backend

Alle folgenden Routen sind mit `@Roles('admin', 'super_admin')` geschützt (siehe [`.cursorrules`](../.cursorrules), `RolesGuard`).

- **403**, wenn der angemeldete User **keine** dieser Rollen hat (`userType` im Firestore-Userprofil).
- **401**, wenn kein gültiges Firebase-Token mitgeschickt wird.

### Flutter-App

- **Feature-Flag / UI:** Erstell- und Bearbeiten-Oberfläche nur anzeigen, wenn das Profil `admin` oder `super_admin` ist (dieselbe Logik wie fürs Backend – der Server enforced ohnehin).
- **Token:** `getIdToken()` vor jedem Schreibaufruf; nach Rollenänderung ggf. `forceRefresh: true`.

---

## 2. Gemeinsame technische Basis

### Base URL & Header

Wie in der Lese-Integration: `BASE_URL` aus eurer App-Konfiguration.

Schreibende JSON-Requests:

```text
Authorization: Bearer <idToken>
Content-Type: application/json
Accept: application/json
```

### Response-Envelope

Wie überall im Backend:

```json
{ "data": <Rückgabe>, "timestamp": "…" }
```

Nach `POST`/`PATCH`/`DELETE` enthält `data` den aktualisierten **`CuratedSpot`** (gleiche JSON-Struktur wie in der Lese-Integration).

### Datenmodelle

Übernehmt **`CuratedSpot`**, **`CuratedSpotAddress`**, **`SpotKeyword`** aus dem [Lese-Guide](./flutter-curated-spots-read-integration.md) (Abschnitt „Datenmodelle“). Für Schreibvorgänge braucht ihr zusätzlich nur serialisierbare Maps (`toJson()`), z. B.:

```dart
Map<String, dynamic> addressToJson(CuratedSpotAddress a) => {
      'street': a.street,
      'houseNumber': a.houseNumber,
      'postalCode': a.postalCode,
      'city': a.city,
      'latitude': a.latitude,
      'longitude': a.longitude,
    };
```

---

## 3. Admin-Lesezugriff (Entwürfe & alle Status)

Für Formulare „Spot bearbeiten“ oder Listen inkl. **PENDING**:

| Methode | Pfad | `data` |
|--------|------|--------|
| GET | `{baseUrl}/curated-spots/admin` | `List<CuratedSpot>` (nur `isDeleted == false`) |
| GET | `{baseUrl}/curated-spots/admin/{id}` | ein `CuratedSpot` inkl. nicht aktiver Status |

Auth und Header wie bei GET in der Lese-Integration; **403** ohne Admin-Rolle.

---

## 4. Spot anlegen – `POST /curated-spots`

**Body (JSON):** Pflichtfelder **`name`**, **`descriptionMarkdown`**, **`address`** (verschachtelt, alle Teilfelder Pflicht wie bei Partner-Adressen). Optional: `keywordIds`, `newKeywordNames`, `videoUrl`, `instagramUrl`, `status` (Default serverseitig meist `PENDING`).

**Minimalbeispiel:**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

Future<CuratedSpot> createCuratedSpot(
  String baseUrl, {
  required String name,
  required String descriptionMarkdown,
  required CuratedSpotAddress address,
  List<String> keywordIds = const [],
  List<String> newKeywordNames = const [],
  String? videoUrl,
  String? instagramUrl,
  String status = 'PENDING',
}) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final body = <String, dynamic>{
    'name': name,
    'descriptionMarkdown': descriptionMarkdown,
    'address': addressToJson(address),
    if (keywordIds.isNotEmpty) 'keywordIds': keywordIds,
    if (newKeywordNames.isNotEmpty) 'newKeywordNames': newKeywordNames,
    if (videoUrl != null) 'videoUrl': videoUrl,
    if (instagramUrl != null) 'instagramUrl': instagramUrl,
    'status': status,
  };
  final res = await http.post(
    Uri.parse('$baseUrl/curated-spots'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: jsonEncode(body),
  );
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('POST curated-spots → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return CuratedSpot.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

**Hinweis `newKeywordNames`:** Server legt fehlende Keywords an und merged die IDs in `keywordIds` (Details: Admin-Doku, Abschnitt POST).

---

## 5. Spot aktualisieren – `PATCH /curated-spots/{id}`

Alle Felder optional; nur mitgeschickte Keys ändern sich.

- **`address`:** wenn gesetzt, wird das **gesamte** Adressobjekt ersetzt (vollständiges JSON).
- **`keywordIds`:** wenn gesetzt, **ersetzt** das die gesamte Keyword-Liste.
- **`newKeywordNames`:** nicht-leeres Array → Namen auflösen/anlegen, IDs werden **zur bestehenden Liste hinzugefügt** (nach etwaigem `keywordIds` im selben Request; siehe Admin-Doku).

```dart
Future<CuratedSpot> patchCuratedSpot(
  String baseUrl,
  String id,
  Map<String, dynamic> patch,
) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final res = await http.patch(
    Uri.parse('$baseUrl/curated-spots/$id'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: jsonEncode(patch),
  );
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('PATCH curated-spots/$id → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return CuratedSpot.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

**Beispiele:** Freigabe `{ "status": "ACTIVE" }`, Adresse ersetzen mit `{ "address": { … } }`.

---

## 6. Bilder hochladen – `POST /curated-spots/{id}/images`

- **Content-Type:** `multipart/form-data`
- **Feldname:** `images` (mehrere Teile mit gleichem Namen, bis zu **20** Dateien pro Request)
- **Antwort:** aktualisierter `CuratedSpot` mit angehängten URLs in `imageUrls`

**Server-Validierung** (globaler [`FileValidationPipe`](../src/core/pipes/file-validation.pipe.ts), Stand Codebasis): **JPEG/PNG**, max. **1 MB** pro Datei.

```dart
import 'package:http/http.dart' as http;

Future<CuratedSpot> uploadCuratedSpotImages(
  String baseUrl,
  String spotId,
  List<String> imageFilePaths,
) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final uri = Uri.parse('$baseUrl/curated-spots/$spotId/images');
  final request = http.MultipartRequest('POST', uri);
  request.headers['Authorization'] = 'Bearer $token';
  request.headers['Accept'] = 'application/json';
  for (final path in imageFilePaths) {
    request.files.add(await http.MultipartFile.fromPath('images', path));
  }
  final streamed = await request.send();
  final res = await http.Response.fromStream(streamed);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('POST images → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return CuratedSpot.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

**400**, wenn keine Dateien gesendet wurden.

---

## 7. Video hochladen – `POST /curated-spots/{id}/video`

- **multipart/form-data**
- **Feldname:** `file` (genau **eine** Datei)
- **Antwort:** `CuratedSpot` mit gesetztem `videoUrl`

**Server-Validierung:** [`VideoFileValidationPipe`](../src/core/pipes/video-file-validation.pipe.ts) – **MP4**, **WebM**, **QuickTime (MOV)**, **M4V**; maximal **10 MB** pro Datei.

```dart
Future<CuratedSpot> uploadCuratedSpotVideo(
  String baseUrl,
  String spotId,
  String videoFilePath,
) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final uri = Uri.parse('$baseUrl/curated-spots/$spotId/video');
  final request = http.MultipartRequest('POST', uri);
  request.headers['Authorization'] = 'Bearer $token';
  request.headers['Accept'] = 'application/json';
  request.files.add(await http.MultipartFile.fromPath('file', videoFilePath));
  final streamed = await request.send();
  final res = await http.Response.fromStream(streamed);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('POST video → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return CuratedSpot.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

Alternativ bleibt `videoUrl`/`instagramUrl` rein per **`PATCH`** setzbar (öffentliche URL).

---

## 8. Spot-Keyword manuell anlegen – `POST /spot-keywords`

**Body:** `{ "name": "…" }` (max. 120 Zeichen, nicht leer).

**Verhalten:** Existiert bereits ein Keyword mit gleichem `nameLower`, liefert das Backend das **bestehende** Dokument (kein Duplikat).

```dart
Future<SpotKeyword> createSpotKeyword(String baseUrl, String name) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final res = await http.post(
    Uri.parse('$baseUrl/spot-keywords'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: jsonEncode({'name': name}),
  );
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('POST spot-keywords → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return SpotKeyword.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

---

## 9. Soft-Delete – `DELETE /curated-spots/{id}`

- Setzt `isDeleted: true`; Datensatz bleibt in Firestore.
- **Response:** eingepackter aktualisierter `CuratedSpot` (kein HTTP 204).

```dart
Future<CuratedSpot> softDeleteCuratedSpot(String baseUrl, String id) async {
  final token = await FirebaseAuth.instance.currentUser!.getIdToken();
  final res = await http.delete(
    Uri.parse('$baseUrl/curated-spots/$id'),
    headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    },
  );
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('DELETE curated-spots/$id → ${res.statusCode}: ${res.body}');
  }
  final envelope = jsonDecode(res.body) as Map<String, dynamic>;
  return CuratedSpot.fromJson(envelope['data'] as Map<String, dynamic>);
}
```

---

## 10. Empfohlener Ablauf in der App

1. **`POST /curated-spots`** mit Text, **Pflicht-Adresse**, Keywords (IDs und/oder `newKeywordNames`).
2. Mit zurückgegebener **`id`:** **`POST …/images`** (eine oder mehrere Runden bis zur gewünschten Galerie).
3. Optional: **`POST …/video`** oder URLs per **`PATCH`**.
4. Wenn inhaltlich fertig: **`PATCH`** mit `{ "status": "ACTIVE" }` zur Freigabe in der öffentlichen Liste (`GET /curated-spots` aus dem Lese-Guide).

---

## 11. Typische Fehler

| HTTP | Situation |
|------|-----------|
| 400 | Validierung (`class-validator`), z. B. fehlende `address`-Felder, ungültige URL, leerer `name`, keine Dateien bei Bild-Upload |
| 401 | Token fehlt/ungültig |
| 403 | Keine Admin-/Super-Admin-Rolle |
| 404 | Unbekannte Spot-ID bei `PATCH` / Upload / `DELETE` |

---

## 12. Querverweise

- Öffentliche Anzeige (Listen, Suche, Detail): [flutter-curated-spots-read-integration.md](./flutter-curated-spots-read-integration.md)
- HTTP-Details & Tabellen: [curated-spots-admin-integration.md](./curated-spots-admin-integration.md)
- Projektregeln (Tests, Guards): [.cursorrules](../.cursorrules)
