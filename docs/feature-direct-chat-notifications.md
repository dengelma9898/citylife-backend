# Feature: Direct-Chat Push-Notifications

## Übersicht

Implementierung von Push-Notifications für Direct-Chat Nachrichten mittels Firebase Cloud Messaging (FCM).

**Branch:** `feature/direct-chat-notifications`

---

## 🎯 Ziel

Wenn User A eine Nachricht an User B sendet, erhält User B eine Push-Notification auf seinem Gerät.

---

## 📋 Implementierungsschritte

### Phase 1: FCM-Token Management

#### 1.1 UserProfile Interface erweitern

**Datei:** `src/users/interfaces/user-profile.interface.ts`

```typescript
export interface UserProfile {
  // ... bestehende Felder ...
  
  // NEU: FCM Tokens für Push-Notifications (Multi-Device Support)
  fcmTokens?: FcmToken[];
}

export interface FcmToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
  lastUsedAt: string;
}
```

#### 1.2 DTOs erstellen

**Neue Datei:** `src/users/dto/register-fcm-token.dto.ts`

```typescript
export class RegisterFcmTokenDto {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
}
```

#### 1.3 Endpunkte im UsersController

**Datei:** `src/users/users.controller.ts`

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `POST` | `/users/:id/fcm-token` | FCM-Token registrieren |
| `DELETE` | `/users/:id/fcm-token/:deviceId` | FCM-Token entfernen (Logout) |

---

### Phase 2: Notification-Service erstellen

#### 2.1 Neues Modul: Notifications

**Struktur:**
```
src/notifications/
├── notifications.module.ts
├── application/
│   └── services/
│       └── notification.service.ts
├── domain/
│   └── interfaces/
│       └── notification-payload.interface.ts
└── infrastructure/
    └── fcm/
        └── fcm-notification.service.ts
```

#### 2.2 Notification Payload Interface

**Datei:** `src/notifications/domain/interfaces/notification-payload.interface.ts`

```typescript
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface DirectChatNotificationData {
  type: 'DIRECT_CHAT_MESSAGE';
  chatId: string;
  senderId: string;
  senderName: string;
  messageId: string;
}
```

#### 2.3 FCM Notification Service

**Datei:** `src/notifications/infrastructure/fcm/fcm-notification.service.ts`

```typescript
@Injectable()
export class FcmNotificationService {
  
  async sendToUser(
    userId: string, 
    payload: NotificationPayload
  ): Promise<void> {
    // 1. FCM-Tokens des Users aus UserProfile laden
    // 2. Notification an alle Geräte senden
    // 3. Ungültige Tokens entfernen (Token-Cleanup)
  }
  
  async sendToUsers(
    userIds: string[], 
    payload: NotificationPayload
  ): Promise<void> {
    // Batch-Versand für mehrere Empfänger
  }
}
```

**FCM Integration:**
```typescript
import * as admin from 'firebase-admin';

await admin.messaging().send({
  token: fcmToken,
  notification: {
    title: payload.title,
    body: payload.body,
  },
  data: payload.data,
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
      },
    },
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'direct_messages',
    },
  },
});
```

---

### Phase 3: Integration in Direct-Chats

#### 3.1 DirectMessagesService anpassen

**Datei:** `src/direct-chats/application/services/direct-messages.service.ts`

```typescript
@Injectable()
export class DirectMessagesService {
  constructor(
    // ... bestehende Dependencies ...
    private readonly notificationService: FcmNotificationService,
  ) {}

  async createMessage(
    userId: string,
    userName: string,
    chatId: string,
    dto: CreateDirectMessageDto,
  ): Promise<DirectMessage> {
    // ... bestehende Logik ...
    
    // NEU: Push-Notification an den anderen Teilnehmer senden
    const recipientId = chat.getOtherParticipantId(userId);
    if (recipientId) {
      await this.sendMessageNotification(recipientId, userName, dto.content, chatId, message.id);
    }
    
    return message;
  }

  private async sendMessageNotification(
    recipientId: string,
    senderName: string,
    content: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    const truncatedContent = content.length > 100 
      ? content.substring(0, 97) + '...' 
      : content;

    await this.notificationService.sendToUser(recipientId, {
      title: senderName,
      body: truncatedContent,
      data: {
        type: 'DIRECT_CHAT_MESSAGE',
        chatId,
        messageId,
        senderId: recipientId,
      },
    });
  }
}
```

#### 3.2 Module Dependencies aktualisieren

**Datei:** `src/direct-chats/direct-chats.module.ts`

```typescript
@Module({
  imports: [
    // ... bestehende Imports ...
    NotificationsModule, // NEU
  ],
  // ...
})
export class DirectChatsModule {}
```

---

### Phase 4: Notification-Einstellungen (Optional)

#### 4.1 User-Präferenzen erweitern

```typescript
export interface NotificationPreferences {
  directMessages: boolean;
  // Für zukünftige Erweiterungen:
  // newEvents: boolean;
  // businessOffers: boolean;
}
```

#### 4.2 Mute-Funktion pro Chat

**Erweiterung in DirectChat Entity:**
```typescript
export interface DirectChatProps {
  // ... bestehende Felder ...
  mutedBy?: string[]; // User-IDs die diesen Chat stummgeschaltet haben
}
```

---

## 🔄 Ablauf-Diagramm

```
┌─────────────┐     POST /direct-chats/:chatId/messages     ┌─────────────────────┐
│   User A    │ ─────────────────────────────────────────▶ │ DirectMessagesCtrl  │
│  (Sender)   │                                             └──────────┬──────────┘
└─────────────┘                                                        │
                                                                       ▼
                                                          ┌─────────────────────┐
                                                          │ DirectMessagesSvc   │
                                                          │  - createMessage()  │
                                                          └──────────┬──────────┘
                                                                     │
                              ┌──────────────────────────────────────┼──────────────────┐
                              ▼                                      ▼                  ▼
                   ┌──────────────────┐               ┌──────────────────┐   ┌──────────────────┐
                   │ DirectMessageRepo│               │ DirectChatsService│   │NotificationService│
                   │   - save()       │               │ - updateLastMsg() │   │  - sendToUser()  │
                   └──────────────────┘               └──────────────────┘   └────────┬─────────┘
                                                                                      │
                                                                                      ▼
                                                                           ┌──────────────────┐
                                                                           │   Firebase FCM   │
                                                                           └────────┬─────────┘
                                                                                    │
                                                                                    ▼
                                                                           ┌─────────────┐
                                                                           │   User B    │
                                                                           │ (Empfänger) │
                                                                           └─────────────┘
```

---

## 📁 Neue/Geänderte Dateien

### Neue Dateien
| Datei | Beschreibung |
|-------|--------------|
| `src/notifications/notifications.module.ts` | Modul-Definition |
| `src/notifications/application/services/notification.service.ts` | Abstraktion |
| `src/notifications/infrastructure/fcm/fcm-notification.service.ts` | FCM-Implementation |
| `src/notifications/domain/interfaces/notification-payload.interface.ts` | Interfaces |
| `src/users/dto/register-fcm-token.dto.ts` | DTO für Token-Registrierung |

### Geänderte Dateien
| Datei | Änderung |
|-------|----------|
| `src/users/interfaces/user-profile.interface.ts` | `fcmTokens` Feld hinzufügen |
| `src/users/users.controller.ts` | Token-Endpunkte hinzufügen |
| `src/users/users.service.ts` | Token-Management Methoden |
| `src/direct-chats/direct-chats.module.ts` | NotificationsModule importieren |
| `src/direct-chats/application/services/direct-messages.service.ts` | Notification-Aufruf |

---

## ✅ Akzeptanzkriterien

- [ ] User kann FCM-Token registrieren (`POST /users/:id/fcm-token`)
- [ ] User kann FCM-Token entfernen (`DELETE /users/:id/fcm-token/:deviceId`)
- [ ] Bei neuer Direct-Chat Nachricht erhält Empfänger Push-Notification
- [ ] Notification zeigt Absender-Name und Nachrichtenvorschau
- [ ] Klick auf Notification öffnet den entsprechenden Chat (via `data.chatId`)
- [ ] Multi-Device Support (Notification an alle Geräte des Users)
- [ ] Ungültige Tokens werden automatisch entfernt

---

## 🧪 Testfälle

1. **Token-Registrierung:** Neuer Token wird korrekt gespeichert
2. **Token-Update:** Bestehender Token für gleiches Device wird aktualisiert
3. **Nachricht senden:** Empfänger erhält Notification
4. **Sender erhält keine Notification:** Nur Empfänger wird benachrichtigt
5. **Offline-User:** Notification wird zugestellt wenn User online kommt
6. **Ungültiger Token:** Token wird nach fehlgeschlagenem Send entfernt

---

## 🚀 Rollout-Strategie

1. **Backend deployen** mit neuen Endpunkten
2. **Flutter-App Update** für Token-Registrierung beim Login
3. **Feature-Flag** (optional) zum schrittweisen Aktivieren

---

## 📝 Offene Fragen

- [ ] Soll es eine "Nicht stören" Zeit geben (z.B. nachts keine Notifications)?
- [ ] Soll der User Notifications pro Chat stummschalten können?
- [ ] Badge-Counter auf App-Icon aktualisieren?

