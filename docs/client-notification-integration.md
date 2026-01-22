# Client-Implementierungsanleitung: Direct-Chat Push-Notifications

Diese Anleitung beschreibt, wie die Flutter/Dart Client-App die Push-Notification-Funktionalität für Direct-Chats integrieren kann.

## Übersicht

Das Backend sendet automatisch Push-Notifications, wenn ein User eine neue Nachricht in einem Direct-Chat erhält. Der Client muss:

1. FCM-Token beim Backend registrieren
2. Push-Notifications empfangen und verarbeiten
3. Navigation zu Chats bei Notification-Tap implementieren

---

## 1. FCM-Token Registrierung

### 1.1 Token vom Gerät abrufen

Verwenden Sie Firebase Cloud Messaging, um den FCM-Token vom Gerät abzurufen:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

final FirebaseMessaging messaging = FirebaseMessaging.instance;

// Token abrufen
String? token = await messaging.getToken();
```

### 1.2 Token beim Backend registrieren

Registrieren Sie den Token beim Backend, sobald der User sich einloggt oder die App startet:

**Endpoint:** `POST /users/:userId/fcm-token`

**Request Body:**
```json
{
  "token": "fcm-token-string",
  "deviceId": "unique-device-id",
  "platform": "ios" | "android" | "web"
```

**Beispiel-Implementierung:**

```dart
Future<void> registerFcmToken(String userId, String token, String deviceId, String platform) async {
  final response = await http.post(
    Uri.parse('$baseUrl/users/$userId/fcm-token'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $firebaseToken',
    },
    body: jsonEncode({
      'token': token,
      'deviceId': deviceId,
      'platform': platform,
    }),
  );
  
  if (response.statusCode != 201) {
    throw Exception('Failed to register FCM token');
  }
}
```

**Wichtig:**
- `deviceId`: Eindeutige Geräte-ID (z.B. mit `device_info_plus` Package)
- `platform`: "ios", "android" oder "web"
- Token sollte bei jedem App-Start aktualisiert werden (Token kann sich ändern)

### 1.3 Token beim Logout entfernen

Entfernen Sie den Token beim Logout:

**Endpoint:** `DELETE /users/:userId/fcm-token/:deviceId`

```dart
Future<void> removeFcmToken(String userId, String deviceId) async {
  final response = await http.delete(
    Uri.parse('$baseUrl/users/$userId/fcm-token/$deviceId'),
    headers: {
      'Authorization': 'Bearer $firebaseToken',
    },
  );
  
  if (response.statusCode != 204) {
    throw Exception('Failed to remove FCM token');
  }
}
```

---

## 2. Push-Notification Handling

### 2.1 Notification-Handler implementieren

Implementieren Sie Handler für Foreground- und Background-Notifications:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

// Foreground Notifications
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Got a message whilst in the foreground!');
  print('Message data: ${message.data}');
  
  if (message.notification != null) {
    print('Message also contained a notification: ${message.notification}');
    // Zeige lokale Notification an
    _showLocalNotification(message);
  }
  
  // Verarbeite Notification Data
  _handleNotificationData(message.data);
});

// Background Notifications
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Handling a background message ${message.messageId}');
  _handleNotificationData(message.data);
}

void main() {
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  runApp(MyApp());
}
```

### 2.2 Notification Data Parsing

Die Notification enthält folgende Daten im `data` Feld:

```dart
void _handleNotificationData(Map<String, dynamic> data) {
  final type = data['type'];
  
  if (type == 'DIRECT_CHAT_MESSAGE') {
    final chatId = data['chatId'];
    final messageId = data['messageId'];
    final senderId = data['senderId'];
    
    // Navigiere zu Chat oder aktualisiere UI
    _navigateToChat(chatId);
  }
}
```

**Notification Data Struktur:**
- `type`: "DIRECT_CHAT_MESSAGE"
- `chatId`: ID des Chats
- `messageId`: ID der Nachricht
- `senderId`: ID des Absenders

### 2.3 Navigation zu Chat bei Notification-Tap

Implementieren Sie Navigation, wenn der User auf die Notification tippt:

```dart
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  print('A new onMessageOpenedApp event was published!');
  _handleNotificationTap(message.data);
});

// Für Notifications, die die App geöffnet haben
Future<void> checkInitialMessage() async {
  RemoteMessage? initialMessage = await FirebaseMessaging.instance.getInitialMessage();
  
  if (initialMessage != null) {
    _handleNotificationTap(initialMessage.data);
  }
}

void _handleNotificationTap(Map<String, dynamic> data) {
  if (data['type'] == 'DIRECT_CHAT_MESSAGE') {
    final chatId = data['chatId'];
    // Navigiere zu Chat-Screen
    navigatorKey.currentState?.pushNamed(
      '/direct-chat',
      arguments: {'chatId': chatId},
    );
  }
}
```

### 2.4 Badge-Counter aktualisieren (optional)

Für iOS können Sie den Badge-Counter aktualisieren:

```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

// Badge setzen
await flutterLocalNotificationsPlugin.show(
  0,
  message.notification?.title,
  message.notification?.body,
  NotificationDetails(
    iOS: DarwinNotificationDetails(
      badgeNumber: unreadCount,
    ),
  ),
);
```

---

## 3. Notification-Einstellungen

### 3.1 User-Präferenzen abrufen

Die Notification-Präferenzen sind im UserProfile gespeichert:

```dart
class NotificationPreferences {
  final bool directMessages;
  
  NotificationPreferences({required this.directMessages});
  
  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      directMessages: json['directMessages'] ?? true,
    );
  }
}
```

### 3.2 Mute-Funktion pro Chat

Um einen Chat stummzuschalten, muss die `mutedBy` Liste im DirectChat aktualisiert werden. Dies erfordert einen neuen Backend-Endpoint (aktuell nicht implementiert, kann später hinzugefügt werden).

**Geplante Implementierung:**
- `PATCH /direct-chats/:chatId/mute` - Chat stummschalten
- `PATCH /direct-chats/:chatId/unmute` - Chat wieder aktivieren

---

## 4. Vollständiges Beispiel

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  
  Future<void> initialize(String userId, String firebaseToken) async {
    // Token abrufen
    String? fcmToken = await _messaging.getToken();
    if (fcmToken == null) return;
    
    // Device ID abrufen
    String deviceId = await _getDeviceId();
    
    // Platform bestimmen
    String platform = Platform.isIOS ? 'ios' : Platform.isAndroid ? 'android' : 'web';
    
    // Token registrieren
    await _registerToken(userId, fcmToken, deviceId, platform, firebaseToken);
    
    // Notification Handler einrichten
    _setupNotificationHandlers();
  }
  
  Future<String> _getDeviceId() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      return androidInfo.id;
    } else if (Platform.isIOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      return iosInfo.identifierForVendor ?? 'unknown';
    }
    return 'web-${DateTime.now().millisecondsSinceEpoch}';
  }
  
  Future<void> _registerToken(
    String userId,
    String token,
    String deviceId,
    String platform,
    String firebaseToken,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/users/$userId/fcm-token'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $firebaseToken',
      },
      body: jsonEncode({
        'token': token,
        'deviceId': deviceId,
        'platform': platform,
      }),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to register FCM token');
    }
  }
  
  void _setupNotificationHandlers() {
    // Foreground
    _messaging.onMessage.listen((RemoteMessage message) {
      _handleNotification(message);
    });
    
    // Background
    FirebaseMessaging.onBackgroundMessage(_backgroundMessageHandler);
    
    // App geöffnet durch Notification
    _messaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationTap(message.data);
    });
    
    // Initial Message prüfen
    _checkInitialMessage();
  }
  
  void _handleNotification(RemoteMessage message) {
    // Zeige lokale Notification an
    // ...
    
    // Verarbeite Data
    _handleNotificationData(message.data);
  }
  
  void _handleNotificationData(Map<String, dynamic> data) {
    if (data['type'] == 'DIRECT_CHAT_MESSAGE') {
      final chatId = data['chatId'];
      // Aktualisiere Chat-Liste oder navigiere
    }
  }
  
  void _handleNotificationTap(Map<String, dynamic> data) {
    if (data['type'] == 'DIRECT_CHAT_MESSAGE') {
      final chatId = data['chatId'];
      // Navigiere zu Chat
    }
  }
  
  Future<void> _checkInitialMessage() async {
    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage.data);
    }
  }
  
  Future<void> removeToken(String userId, String deviceId, String firebaseToken) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/users/$userId/fcm-token/$deviceId'),
      headers: {
        'Authorization': 'Bearer $firebaseToken',
      },
    );
    
    if (response.statusCode != 204) {
      throw Exception('Failed to remove FCM token');
    }
  }
}

@pragma('vm:entry-point')
Future<void> _backgroundMessageHandler(RemoteMessage message) async {
  // Handle background message
}
```

---

## 5. Wichtige Hinweise

- **Token-Aktualisierung**: FCM-Tokens können sich ändern. Registrieren Sie den Token regelmäßig (z.B. bei jedem App-Start).
- **Multi-Device Support**: Ein User kann mehrere Geräte haben. Das Backend sendet Notifications an alle registrierten Geräte.
- **Offline-Notifications**: Notifications werden auch zugestellt, wenn die App geschlossen ist.
- **Notification-Einstellungen**: Respektieren Sie die User-Präferenzen. Das Backend prüft bereits, ob Notifications erlaubt sind.
- **Error Handling**: Implementieren Sie Fehlerbehandlung für Token-Registrierung und Notification-Verarbeitung.

---

## 6. Testing

1. **Token-Registrierung testen**: Prüfen Sie, ob der Token korrekt registriert wird
2. **Foreground-Notifications**: Testen Sie Notifications, wenn die App im Vordergrund ist
3. **Background-Notifications**: Testen Sie Notifications, wenn die App im Hintergrund ist
4. **Navigation**: Testen Sie, ob die Navigation zu Chats korrekt funktioniert
5. **Multi-Device**: Testen Sie mit mehreren Geräten desselben Users
