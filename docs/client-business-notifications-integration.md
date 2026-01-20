# Client-Implementierung: Business Notifications (Flutter)

## Übersicht

Integration von Push-Notifications für neue aktive Businesses in der Flutter-App. Das Backend sendet automatisch Notifications, wenn ein neues Business mit Status ACTIVE erstellt wird oder von PENDING zu ACTIVE wechselt.

---

## 1. Notification-Präferenz erweitern

### 1.1 NotificationPreferences Model aktualisieren

**Datei:** `lib/models/notification_preferences.dart` (oder ähnlich)

```dart
class NotificationPreferences {
  final bool directMessages;
  final bool newBusinesses; // NEU
  
  NotificationPreferences({
    required this.directMessages,
    this.newBusinesses = true, // Default: true
  });
  
  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      directMessages: json['directMessages'] ?? true,
      newBusinesses: json['newBusinesses'] ?? true, // NEU
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'directMessages': directMessages,
      'newBusinesses': newBusinesses, // NEU
    };
  }
}
```

---

## 2. Notification-Handler erweitern

### 2.1 Notification Data Parsing erweitern

**Datei:** `lib/services/notification_service.dart` (oder ähnlich)

Erweitern Sie die `_handleNotificationData()` Methode:

```dart
void _handleNotificationData(Map<String, dynamic> data) {
  final type = data['type'];
  
  if (type == 'DIRECT_CHAT_MESSAGE') {
    final chatId = data['chatId'];
    // ... bestehende Logik
  } else if (type == 'NEW_BUSINESS') { // NEU
    final businessId = data['businessId'];
    final businessName = data['businessName'];
    
    // Aktualisiere Business-Liste oder zeige Info
    _handleNewBusinessNotification(businessId, businessName);
  }
}
```

### 2.2 Navigation bei Notification-Tap

Erweitern Sie die `_handleNotificationTap()` Methode:

```dart
void _handleNotificationTap(Map<String, dynamic> data) {
  if (data['type'] == 'DIRECT_CHAT_MESSAGE') {
    final chatId = data['chatId'];
    navigatorKey.currentState?.pushNamed(
      '/direct-chat',
      arguments: {'chatId': chatId},
    );
  } else if (data['type'] == 'NEW_BUSINESS') { // NEU
    final businessId = data['businessId'];
    navigatorKey.currentState?.pushNamed(
      '/business-detail',
      arguments: {'businessId': businessId},
    );
  }
}
```

---

## 3. UI für Notification-Einstellungen erweitern

### 3.1 Settings Screen erweitern

**Datei:** `lib/screens/settings/notification_settings_screen.dart` (oder ähnlich)

Fügen Sie einen neuen Toggle für Business-Notifications hinzu:

```dart
SwitchListTile(
  title: Text('Neue Partner'),
  subtitle: Text('Benachrichtigungen für neue aktive Partner erhalten'),
  value: notificationPreferences.newBusinesses,
  onChanged: (value) {
    _updateNotificationPreference('newBusinesses', value);
  },
),
```

### 3.2 Backend-Update für Präferenzen

**Endpoint:** `PATCH /users/:userId/profile`

```dart
Future<void> updateNotificationPreferences(
  String userId,
  NotificationPreferences preferences,
) async {
  final response = await http.patch(
    Uri.parse('$baseUrl/users/$userId/profile'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $firebaseToken',
    },
    body: jsonEncode({
      'notificationPreferences': preferences.toJson(),
    }),
  );
  
  if (response.statusCode != 200) {
    throw Exception('Failed to update notification preferences');
  }
}
```

---

## 4. Vollständiges Beispiel

### Erweiterte Notification-Handler Implementierung

```dart
class NotificationService {
  // ... bestehende Methoden ...
  
  void _handleNotificationData(Map<String, dynamic> data) {
    final type = data['type'];
    
    switch (type) {
      case 'DIRECT_CHAT_MESSAGE':
        _handleDirectChatNotification(data);
        break;
      case 'NEW_BUSINESS': // NEU
        _handleNewBusinessNotification(data);
        break;
    }
  }
  
  void _handleNewBusinessNotification(Map<String, dynamic> data) {
    final businessId = data['businessId'];
    final businessName = data['businessName'];
    
    // Optional: Aktualisiere lokale Business-Liste
    // businessService.refreshBusinesses();
    
    // Optional: Zeige Snackbar oder Toast
    // _showInfoMessage('Neuer Partner: $businessName');
  }
  
  void _handleNotificationTap(Map<String, dynamic> data) {
    final type = data['type'];
    
    switch (type) {
      case 'DIRECT_CHAT_MESSAGE':
        final chatId = data['chatId'];
        navigatorKey.currentState?.pushNamed(
          '/direct-chat',
          arguments: {'chatId': chatId},
        );
        break;
      case 'NEW_BUSINESS': // NEU
        final businessId = data['businessId'];
        navigatorKey.currentState?.pushNamed(
          '/business-detail',
          arguments: {'businessId': businessId},
        );
        break;
    }
  }
}
```

---

## 5. Checkliste

- [ ] `NotificationPreferences` Model um `newBusinesses` erweitern
- [ ] `_handleNotificationData()` um `NEW_BUSINESS` Case erweitern
- [ ] `_handleNotificationTap()` um Navigation zu Business-Detail erweitern
- [ ] Settings-Screen um Toggle für Business-Notifications erweitern
- [ ] Backend-Update-Methode für Notification-Präferenzen testen
- [ ] Navigation zu Business-Detail-Seite testen
- [ ] Foreground- und Background-Notifications testen

---

## 6. Notification Data Struktur

**Type:** `NEW_BUSINESS`

**Data Fields:**
- `type`: `"NEW_BUSINESS"`
- `businessId`: ID des neuen Businesses
- `businessName`: Name des neuen Businesses

**Payload Beispiel:**
```json
{
  "title": "Neuer Partner verfügbar",
  "body": "Restaurant XYZ ist jetzt verfügbar",
  "data": {
    "type": "NEW_BUSINESS",
    "businessId": "abc123",
    "businessName": "Restaurant XYZ"
  }
}
```

---

## 7. Wichtige Hinweise

- **FCM-Token Registrierung**: Bereits vorhanden (siehe Direct-Chat Implementierung)
- **Präferenz-Default**: `newBusinesses` ist standardmäßig `true` (wie `directMessages`)
- **Navigation**: Route `/business-detail` muss existieren oder entsprechend angepasst werden
- **Business-Liste**: Optional kann die Business-Liste automatisch aktualisiert werden, wenn eine Notification empfangen wird
