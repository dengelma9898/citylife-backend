# Direct Chat API - Client Dokumentation

## Basis-URL
`/direct-chats`

## Feature Toggle
Das Direct Chat Feature kann vom Admin aktiviert/deaktiviert werden. Bei deaktiviertem Feature geben alle Endpoints (außer Settings) `503 Service Unavailable` zurück.

---

## Request DTOs (vom Client gesendet)

### 1. CreateDirectChatDto
**Endpoint:** `POST /direct-chats`

```typescript
{
  invitedUserId: string;  // Pflicht - ID des eingeladenen Users
}
```

**Beispiel:**
```json
{
  "invitedUserId": "user-123"
}
```

---

### 2. CreateDirectMessageDto
**Endpoint:** `POST /direct-chats/:chatId/messages`

```typescript
{
  content: string;      // Pflicht - Nachrichteninhalt (max. 5000 Zeichen)
  imageUrl?: string;    // Optional - URL des Bildes (max. 1 MB)
}
```

**Beispiel:**
```json
{
  "content": "Hello, how are you?",
  "imageUrl": "https://storage.example.com/images/photo.jpg"
}
```

---

### 3. UpdateDirectMessageDto
**Endpoint:** `PATCH /direct-chats/:chatId/messages/:messageId`

```typescript
{
  content: string;      // Pflicht - Aktualisierter Nachrichteninhalt (max. 5000 Zeichen)
  imageUrl?: string;    // Optional - URL des Bildes (max. 1 MB)
}
```

**Beispiel:**
```json
{
  "content": "Updated message content"
}
```

---

### 4. UpdateDirectMessageReactionDto
**Endpoint:** `PATCH /direct-chats/:chatId/messages/:messageId/reactions`

```typescript
{
  type: string;  // Pflicht - Emoji als Reaktion
}
```

**Beispiel:**
```json
{
  "type": "👍"
}
```

**Hinweis:** Gleiches Emoji erneut senden entfernt die Reaktion (Toggle-Verhalten).

---

### 5. UpdateDirectChatSettingsDto (nur Admin)
**Endpoint:** `PATCH /direct-chats/settings`

```typescript
{
  isEnabled: boolean;  // Pflicht - Feature aktiviert/deaktiviert
}
```

**Beispiel:**
```json
{
  "isEnabled": false
}
```

---

## Response DTOs (vom Server zurückgegeben)

### DirectChat Response

```typescript
{
  id: string;                    // Chat-ID
  creatorId: string;             // ID des Chat-Erstellers
  invitedUserId: string;         // ID des eingeladenen Users
  creatorConfirmed: boolean;     // Immer true
  invitedConfirmed: boolean;     // true wenn Einladung angenommen
  status: "pending" | "active";  // Chat-Status
  lastMessage?: {                // Letzte Nachricht (optional)
    content: string;
    senderId: string;
    sentAt: string;              // ISO 8601 Timestamp
  };
  createdAt: string;             // ISO 8601 Timestamp
  updatedAt: string;             // ISO 8601 Timestamp
  
  // Zusätzliche Felder bei GET-Anfragen:
  otherParticipantName?: string;              // Name des anderen Teilnehmers
  otherParticipantProfilePictureUrl?: string; // Profilbild-URL
}
```

---

### DirectMessage Response

```typescript
{
  id: string;           // Nachrichten-ID
  chatId: string;       // Zugehörige Chat-ID
  senderId: string;     // ID des Absenders
  senderName: string;   // Name des Absenders
  content: string;      // Nachrichteninhalt
  imageUrl?: string;    // Bild-URL (optional)
  isEditable: boolean;  // true wenn eigene Nachricht
  reactions?: [         // Reaktionen (optional)
    {
      userId: string;   // User der reagiert hat
      type: string;     // Emoji
    }
  ];
  createdAt: string;    // ISO 8601 Timestamp
  updatedAt: string;    // ISO 8601 Timestamp
  editedAt?: string;    // ISO 8601 Timestamp (wenn bearbeitet)
}
```

---

### DirectChatSettings Response

```typescript
{
  id: string;           // Immer "direct_chat_settings"
  isEnabled: boolean;   // Feature aktiviert/deaktiviert
  updatedAt: string;    // ISO 8601 Timestamp
  updatedBy?: string;   // User-ID des letzten Änderers
}
```

---

## API Endpoints Übersicht

| Methode | Endpoint | Beschreibung | Body |
|---------|----------|--------------|------|
| `GET` | `/direct-chats/settings` | Feature-Status abrufen | - |
| `PATCH` | `/direct-chats/settings` | Feature Toggle (Admin) | `UpdateDirectChatSettingsDto` |
| `POST` | `/direct-chats` | Chat-Anfrage erstellen | `CreateDirectChatDto` |
| `GET` | `/direct-chats` | Alle eigenen Chats abrufen | - |
| `GET` | `/direct-chats/pending` | Ausstehende Anfragen | - |
| `GET` | `/direct-chats/:id` | Einzelnen Chat abrufen | - |
| `PATCH` | `/direct-chats/:id/confirm` | Anfrage annehmen | - |
| `DELETE` | `/direct-chats/:id` | Chat löschen/ablehnen | - |
| `POST` | `/direct-chats/:chatId/messages` | Nachricht senden | `CreateDirectMessageDto` |
| `GET` | `/direct-chats/:chatId/messages` | Nachrichten abrufen | - |
| `PATCH` | `/direct-chats/:chatId/messages/:messageId` | Nachricht bearbeiten | `UpdateDirectMessageDto` |
| `DELETE` | `/direct-chats/:chatId/messages/:messageId` | Nachricht löschen | - |
| `PATCH` | `/direct-chats/:chatId/messages/:messageId/reactions` | Reaktion toggle | `UpdateDirectMessageReactionDto` |

---

## User Blocking Endpoints

| Methode | Endpoint | Beschreibung | Body |
|---------|----------|--------------|------|
| `POST` | `/users/:id/blocked-users` | User blockieren | `{ "userIdToBlock": "user-123" }` |
| `DELETE` | `/users/:id/blocked-users/:blockedUserId` | User entblockieren | - |
| `GET` | `/users/:id/blocked-users` | Blockierte User abrufen | - |

---

## HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| `200` | Erfolg |
| `201` | Erfolgreich erstellt |
| `204` | Erfolgreich gelöscht (kein Body) |
| `400` | Ungültige Anfrage / User bereits blockiert / Chat existiert bereits |
| `403` | Keine Berechtigung / Von User blockiert |
| `404` | Nicht gefunden |
| `503` | Feature deaktiviert |

---

## Chat-Flow

1. **User A** erstellt Chat-Anfrage an **User B** → Status: `pending`
2. **User B** sieht Anfrage unter `/direct-chats/pending`
3. **User B** kann:
   - Annehmen: `PATCH /direct-chats/:id/confirm` → Status: `active`
   - Ablehnen: `DELETE /direct-chats/:id` → Chat wird gelöscht
4. Bei `active` Status können beide User Nachrichten senden
5. Jeder Teilnehmer kann den Chat jederzeit löschen (`DELETE`)
6. Bei Löschung werden alle Nachrichten mit gelöscht
