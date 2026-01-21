# Client-Implementierung: Business User Notifications (Flutter)

## Übersicht

Integration von Push-Notifications für Business User in der Flutter-App. Das Backend sendet automatisch Notifications für:
- **BUSINESS_ACTIVATED**: Wenn ein Business von PENDING zu ACTIVE geschaltet wird
- **BUSINESS_CONTACT_REQUEST_RESPONSE**: Wenn ein Admin auf BUSINESS_CLAIM/BUSINESS_REQUEST Anfragen antwortet

---

## 1. Notification-Präferenzen erweitern

### BusinessUserNotificationPreferences Model

**Datei:** `lib/models/business_user_notification_preferences.dart`

```dart
class BusinessUserNotificationPreferences {
  final bool? businessActivated;
  final bool? businessContactRequestResponses;

  BusinessUserNotificationPreferences({
    this.businessActivated,
    this.businessContactRequestResponses,
  });

  factory BusinessUserNotificationPreferences.fromJson(Map<String, dynamic> json) {
    return BusinessUserNotificationPreferences(
      businessActivated: json['businessActivated'] as bool?,
      businessContactRequestResponses: json['businessContactRequestResponses'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (businessActivated != null) 'businessActivated': businessActivated,
      if (businessContactRequestResponses != null) 
        'businessContactRequestResponses': businessContactRequestResponses,
    };
  }
}
```

### BusinessUser Model erweitern

**Datei:** `lib/models/business_user.dart`

```dart
class BusinessUser {
  // ... bestehende Felder
  BusinessUserNotificationPreferences? notificationPreferences;
  List<FcmToken>? fcmTokens;

  BusinessUser({
    // ... bestehende Parameter
    this.notificationPreferences,
    this.fcmTokens,
  });

  factory BusinessUser.fromJson(Map<String, dynamic> json) {
    return BusinessUser(
      // ... bestehende Felder
      notificationPreferences: json['notificationPreferences'] != null
          ? BusinessUserNotificationPreferences.fromJson(json['notificationPreferences'])
          : null,
      fcmTokens: json['fcmTokens'] != null
          ? (json['fcmTokens'] as List).map((e) => FcmToken.fromJson(e)).toList()
          : null,
    );
  }
}
```

---

## 2. Notification-Handler erweitern

### Notification Data Parsing

**Datei:** `lib/services/notification_service.dart`

Erweitern Sie die `_handleNotificationData()` Methode:

```dart
void _handleNotificationData(Map<String, dynamic> data) {
  final type = data['type'];
  
  // ... bestehende Notification-Typen
  
  if (type == 'BUSINESS_ACTIVATED') {
    final businessId = data['businessId'];
    final businessName = data['businessName'];
    _handleBusinessActivatedNotification(businessId, businessName);
  } else if (type == 'BUSINESS_CONTACT_REQUEST_RESPONSE') {
    final contactRequestId = data['contactRequestId'];
    final requestType = data['requestType'];
    final businessId = data['businessId'];
    _handleBusinessContactRequestResponseNotification(
      contactRequestId, 
      requestType, 
      businessId,
    );
  }
}

void _handleBusinessActivatedNotification(String businessId, String businessName) {
  // Navigiere zur Business-Detail-Seite oder zeige Info
  // Beispiel: Navigator.pushNamed(context, '/business/$businessId');
}

void _handleBusinessContactRequestResponseNotification(
  String contactRequestId, 
  String requestType,
  String? businessId,
) {
  // Navigiere zur Contact Request Detail-Seite
  // Beispiel: Navigator.pushNamed(context, '/contact-requests/$contactRequestId');
}
```

### Navigation bei Notification-Tap

Erweitern Sie die `_handleNotificationTap()` Methode:

```dart
void _handleNotificationTap(Map<String, dynamic> data) {
  final type = data['type'];
  
  if (type == 'BUSINESS_ACTIVATED') {
    final businessId = data['businessId'];
    Navigator.pushNamed(context, '/business/$businessId');
  } else if (type == 'BUSINESS_CONTACT_REQUEST_RESPONSE') {
    final contactRequestId = data['contactRequestId'];
    Navigator.pushNamed(context, '/contact-requests/$contactRequestId');
  }
  
  // ... bestehende Navigation-Logik
}
```

---

## 3. API Integration

### Notification-Präferenzen aktualisieren

**Datei:** `lib/services/user_service.dart`

```dart
Future<void> updateBusinessUserNotificationPreferences(
  String userId,
  BusinessUserNotificationPreferences preferences,
) async {
  await http.patch(
    Uri.parse('$baseUrl/users/$userId/business-profile'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'notificationPreferences': preferences.toJson(),
    }),
  );
}
```

### FCM Token registrieren (für Business User)

```dart
Future<void> registerBusinessUserFcmToken(
  String userId,
  String token,
  String deviceId,
  String platform,
) async {
  await http.post(
    Uri.parse('$baseUrl/users/$userId/fcm-token'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'token': token,
      'deviceId': deviceId,
      'platform': platform,
    }),
  );
}
```

---

## 4. UI für Notification-Präferenzen

### Settings Screen erweitern

**Datei:** `lib/screens/settings/business_notification_settings.dart`

```dart
class BusinessNotificationSettings extends StatefulWidget {
  final BusinessUser businessUser;

  @override
  _BusinessNotificationSettingsState createState() => 
      _BusinessNotificationSettingsState();
}

class _BusinessNotificationSettingsState extends State<BusinessNotificationSettings> {
  bool? businessActivated;
  bool? businessContactRequestResponses;

  @override
  void initState() {
    super.initState();
    businessActivated = widget.businessUser.notificationPreferences?.businessActivated;
    businessContactRequestResponses = 
        widget.businessUser.notificationPreferences?.businessContactRequestResponses;
  }

  Future<void> _savePreferences() async {
    final preferences = BusinessUserNotificationPreferences(
      businessActivated: businessActivated,
      businessContactRequestResponses: businessContactRequestResponses,
    );
    
    await userService.updateBusinessUserNotificationPreferences(
      widget.businessUser.id,
      preferences,
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Einstellungen gespeichert')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Benachrichtigungen')),
      body: ListView(
        children: [
          SwitchListTile(
            title: Text('Business aktiviert'),
            subtitle: Text('Benachrichtigung wenn dein Business freigeschaltet wird'),
            value: businessActivated ?? false,
            onChanged: (value) => setState(() => businessActivated = value),
          ),
          SwitchListTile(
            title: Text('Antworten auf Business-Anfragen'),
            subtitle: Text('Benachrichtigung wenn Admin auf deine Anfragen antwortet'),
            value: businessContactRequestResponses ?? false,
            onChanged: (value) => setState(() => businessContactRequestResponses = value),
          ),
          ElevatedButton(
            onPressed: _savePreferences,
            child: Text('Speichern'),
          ),
        ],
      ),
    );
  }
}
```

---

## 5. Wichtige Hinweise

### Default-Verhalten
- **Alle Präferenzen sind standardmäßig `false`** (wenn `undefined`)
- Notifications werden **nur gesendet**, wenn die Präferenz explizit auf `true` gesetzt ist
- Business User müssen ihre Präferenzen aktivieren, um Notifications zu erhalten

### FCM Token Management
- Business User müssen FCM Tokens registrieren, um Notifications zu empfangen
- Verwenden Sie den gleichen Endpoint wie normale User: `POST /users/:id/fcm-token`
- Token bei Logout entfernen: `DELETE /users/:id/fcm-token/:deviceId`

### Notification Payload Struktur

**BUSINESS_ACTIVATED:**
```json
{
  "title": "Dein Business ist jetzt aktiv",
  "body": "{businessName} wurde freigeschaltet und ist jetzt sichtbar",
  "data": {
    "type": "BUSINESS_ACTIVATED",
    "businessId": "string",
    "businessName": "string",
    "previousStatus": "PENDING",
    "newStatus": "ACTIVE"
  }
}
```

**BUSINESS_CONTACT_REQUEST_RESPONSE:**
```json
{
  "title": "Antwort auf deine Business-Anfrage",
  "body": "Du hast eine Antwort auf deine {requestType} Anfrage erhalten",
  "data": {
    "type": "BUSINESS_CONTACT_REQUEST_RESPONSE",
    "contactRequestId": "string",
    "requestType": "BUSINESS_CLAIM" | "BUSINESS_REQUEST",
    "businessId": "string (optional)",
    "businessName": "string (optional)"
  }
}
```

---

**Erstellt:** 2024  
**Zuletzt aktualisiert:** 2024  
**Version:** 1.0
