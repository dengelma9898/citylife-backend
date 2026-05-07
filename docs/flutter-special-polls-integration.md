# Flutter – Special Polls (Umfragen)

Dieser Guide beschreibt die **Integration der Nürnbergspots-Flutter-App** mit der **Special-Polls-API**: Umfragen laden, optional nur hervorgehobene, Detail, **Antwort abgeben**, **Upvote togglen**.

**Admin / Super-Admin** (Anlegen, Status, Highlight, Moderation, Löschen): [special-polls-admin-integration.md](./special-polls-admin-integration.md)

**Backend:** [`src/special-polls/`](../src/special-polls/)  
**Auth & Rollen:** [.cursorrules](../.cursorrules)  
**Push bei neuer Umfrage:** [notification-suggestions.md](./notification-suggestions.md) (`NEW_SURVEY`, Präferenz `newSurveys`)

---

## 1. Voraussetzungen

### Base URL

Wie für andere APIs: umgebungsabhängiger Host inkl. ggf. Präfix (`/dev`, `/prd` …), siehe [README.md](../README.md) (`BASE_URL`).

### Authentifizierung

- **Jede** Anfrage: Header `Authorization: Bearer <FirebaseIdToken>`.
- Token z. B. `FirebaseAuth.instance.currentUser?.getIdToken()` (nach Login ggf. `forceRefresh: true`).
- Anonyme Firebase-User sind im Projekt ebenfalls „eingeloggt“ (gültiger Token).
- Ohne gültigen Token: **401**.

### Response-Envelope

```json
{
  "data": <Nutzlast>,
  "timestamp": "<ISO Berlin>"
}
```

In Dart nach `jsonDecode` immer **`body['data']`** verwenden.

### Erlaubte Rollen (App-Nutzer)

Für die hier beschriebenen **GET**- und **POST**-Routen reicht die normale Nutzerrolle (`user`) zusammen mit Admin/Super-Admin laut Backend.

### Sichtbarkeit (`ACTIVE` / `INACTIVE`)

- **`GET /special-polls`** und **`GET /special-polls/:id`** liefern für reine **App-Nutzer** (`user`) **nur** Umfragen mit Status **`ACTIVE`** (nach Normalisierung). **`INACTIVE`** erscheint nicht in Listen; Einzelabruf antwortet mit **404**.
- Mit einem **Admin-** oder **Super-Admin-Token** kommen **alle** Umfragen inkl. `INACTIVE` zurück (gleiche URLs, keine Extra-Parameter).

---

## 2. Endpunkte (App)

| Aktion | Methode | Pfad |
|--------|---------|------|
| Alle Umfragen | `GET` | `/special-polls` |
| Nur hervorgehobene | `GET` | `/special-polls?highlighted=true` |
| Eine Umfrage | `GET` | `/special-polls/:id` |
| Antwort senden | `POST` | `/special-polls/:id/responses` |
| Eigene Antwort(en) entfernen | `DELETE` | `/special-polls/:id/responses/me` |
| Upvote togglen | `POST` | `/special-polls/:id/responses/:responseId/upvote` |

---

## 3. Datenmodelle (Dart, empfohlen)

```dart
class SpecialPollResponse {
  const SpecialPollResponse({
    required this.id,
    required this.userId,
    required this.userName,
    required this.response,
    required this.createdAt,
    required this.upvotedUserIds,
  });

  final String id;
  final String userId;
  final String userName;
  final String response;
  final String createdAt;
  final List<String> upvotedUserIds;

  /// Anzeige: Anzahl Zustimmungen
  int get upvoteCount => upvotedUserIds.length;

  bool isUpvotedBy(String currentUserId) =>
      upvotedUserIds.contains(currentUserId);

  static SpecialPollResponse fromJson(Map<String, dynamic> json) {
    return SpecialPollResponse(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userName: json['userName'] as String? ?? '',
      response: json['response'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      upvotedUserIds: (json['upvotedUserIds'] as List<dynamic>? ?? [])
          .map((e) => e as String)
          .toList(),
    );
  }
}

class SpecialPoll {
  const SpecialPoll({
    required this.id,
    required this.title,
    required this.status,
    required this.isHighlighted,
    required this.responses,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  /// "ACTIVE" oder "INACTIVE" (App-Nutzer sehen praktisch nur "ACTIVE").
  final String status;
  final bool isHighlighted;
  final List<SpecialPollResponse> responses;
  final String createdAt;
  final String updatedAt;

  static SpecialPoll fromJson(Map<String, dynamic> json) {
    return SpecialPoll(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      isHighlighted: json['isHighlighted'] as bool? ?? false,
      responses: (json['responses'] as List<dynamic>? ?? [])
          .map((e) => SpecialPollResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}
```

### Hinweis zu `status` und Legacy-Daten

In Firestore können alte Dokumente noch **`CLOSED`** oder **`PENDING`** stehen haben. Das Backend liefert sie in der API als **`ACTIVE`**. **`INACTIVE`** ist der einzige Status, der normale Nutzer aus Liste und Detail **ausblendet** (bzw. **404** beim Detail).

### Antworten, Upvote, „meine Antwort löschen“

Nur für **sichtbare** Umfragen (`ACTIVE` für `user`): Bei **`INACTIVE`** liefern **`POST …/responses`**, **`POST …/upvote`** und **`DELETE …/responses/me`** **404** (wie beim Detail).

`responses` ist im **gleichen** JSON wie die Umfrage enthalten; zusätzliche Abfrage pro Antwort ist nicht nötig.

---

## 4. HTTP-Aufrufe

### 4.1 Liste laden

```http
GET /special-polls
Authorization: Bearer <token>
```

Optional nur Highlights:

```http
GET /special-polls?highlighted=true
```

**Parse:**

```dart
final list = (data as List<dynamic>)
    .map((e) => SpecialPoll.fromJson(e as Map<String, dynamic>))
    .toList();
```

### 4.2 Detail laden

```http
GET /special-polls/{pollId}
Authorization: Bearer <token>
```

**Parse:** `SpecialPoll.fromJson(data as Map<String, dynamic>)`.

### 4.3 Antwort abgeben

```http
POST /special-polls/{pollId}/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "response": "Mein Text…"
}
```

**Wichtig:** Der Body ist **kein** verschachteltes Objekt – nur das Feld **`response`** (String), siehe Backend-Controller.

**Response `data`:** vollständige aktualisierte `SpecialPoll` (inkl. neuer Eintrag mit neuer `id`).

Für normale Nutzer (`user`) ist das nur möglich, wenn die Umfrage **sichtbar** ist (**`ACTIVE`**). Bei **`INACTIVE`** antwortet das Backend mit **404** (siehe Abschnitt „Sichtbarkeit“ oben). Legacy **`PENDING`** / **`CLOSED`** in Firestore gelten nach Normalisierung wie **`ACTIVE`**.

### 4.4 Upvote togglen

```http
POST /special-polls/{pollId}/responses/{responseId}/upvote
Authorization: Bearer <token>
```

- **Kein** Body.
- **`responseId`** ist die **`id`** der Antwort aus `responses`, nicht der Index.
- Erneuter Aufruf mit demselben Nutzer **entfernt** den Upvote (Toggle).

**Response `data`:** aktualisierte `SpecialPoll`.

**Fehler:** **404**, wenn `responseId` unbekannt ist.

### 4.5 Eigene Antwort(en) entfernen

```http
DELETE /special-polls/{pollId}/responses/me
Authorization: Bearer <token>
```

- Entfernt **alle** Antwort-Einträge des authentifizierten Nutzers zu dieser Umfrage (Backend: `removeResponse`).

**Response `data`:** aktualisierte `SpecialPoll`.

---

## 5. UI-Empfehlungen

- **Highlight-Bereich:** `GET …?highlighted=true` für eine „Frage der Woche“-Kachel; vollständige Historie mit `GET /special-polls`.
- **Antworten sortieren:** z. B. nach `upvoteCount` absteigend, sekundär nach `createdAt`.
- **Upvote-Button:** Zustand aus `isUpvotedBy(currentUserId)`; nach erfolgreichem POST die zurückgegebene `SpecialPoll` in den State übernehmen (oder Detail neu laden).
- **Deep-Link aus Push:** Bei `NEW_SURVEY` liefert FCM `surveyId` und `surveyTitle` ([notification-suggestions.md](./notification-suggestions.md)) – Navigation zu `GET /special-polls/{surveyId}`.

---

## 6. Fehlerbehandlung (Kurz)

| HTTP | Bedeutung |
|------|-----------|
| **401** | Token erneuern / erneut anmelden |
| **403** | Rolle (selten bei normalen User-Routen) |
| **404** | Umfrage unsichtbar (**`INACTIVE`** für `user`), falsche ID, oder Antwort-ID ungültig |
| **400** | Body ungültig (z. B. `response` fehlt/leer) |

---

## 7. Verwandte Dokumentation

- Admin / Super-Admin API: [special-polls-admin-integration.md](./special-polls-admin-integration.md)
- Notifications: [notification-suggestions.md](./notification-suggestions.md)
