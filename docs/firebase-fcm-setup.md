# Firebase Cloud Messaging (FCM) Setup

Diese Anleitung beschreibt, welche Konfigurationen in der Firebase Console vorgenommen werden müssen, damit Push-Notifications funktionieren.

## Übersicht

Das Backend verwendet Firebase Admin SDK, um Push-Notifications über Firebase Cloud Messaging (FCM) zu senden. Die folgenden Schritte müssen in der Firebase Console durchgeführt werden.

---

## 1. Firebase Cloud Messaging API aktivieren

**Wichtig:** Dieses Backend verwendet das **Firebase Admin SDK**, welches automatisch die moderne **FCM HTTP v1 API** verwendet. Die Legacy API ist nicht erforderlich.

### FCM HTTP v1 API (aktuell verwendet)

Das Backend verwendet bereits die moderne FCM v1 API über das Firebase Admin SDK:

- ✅ **Automatisch aktiviert** durch Verwendung des Admin SDKs
- ✅ **Sicherer:** Verwendet OAuth 2.0 Tokens statt statischer Server Keys
- ✅ **Mehr Features:** Platform-spezifische Felder, bessere Analytics
- ✅ **Keine Migration nötig:** Die Implementierung ist bereits auf dem neuesten Stand

### Legacy API (nicht verwendet)

Die "Legacy API" bezieht sich auf die direkten HTTP/XMPP APIs, die **nicht** von diesem Backend verwendet werden. Diese wurden im Juni 2024 eingestellt, betrifft aber nicht unsere Implementierung.

**Hinweis:** Falls Sie in der Firebase Console "Cloud Messaging API (Legacy)" sehen, können Sie diese ignorieren, da wir das Admin SDK verwenden, das automatisch die v1 API nutzt.

---

## 2. Service Account Berechtigungen prüfen

Das Backend verwendet Service Account Credentials (definiert in `GOOGLE_APPLICATION_CREDENTIALS`) für die **FCM HTTP v1 API**. Stellen Sie sicher, dass der Service Account folgende Berechtigungen hat:

1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
2. Wählen Sie Ihr Firebase-Projekt aus
3. Gehen Sie zu **IAM & Admin** → **Service Accounts**
4. Finden Sie den Service Account, der für Firebase verwendet wird
5. Prüfen Sie, dass folgende Rollen zugewiesen sind:
   - **Firebase Admin SDK Administrator Service Agent** (empfohlen)
   - Oder **Firebase Admin** (für vollständigen Zugriff)

**Wichtig für FCM v1 API:**
- Der Service Account benötigt die Berechtigung, OAuth 2.0 Access Tokens zu generieren
- Die Rolle `roles/firebase.admin` oder `roles/firebase.sdkAdminServiceAgent` enthält alle notwendigen Berechtigungen
- **Kein Server Key erforderlich:** Die v1 API verwendet keine statischen Server Keys mehr

---

## 3. iOS: APNs (Apple Push Notification Service) konfigurieren

Für iOS-Apps müssen APNs-Zertifikate in Firebase hochgeladen werden. Sie haben zwei Optionen:

### 3.1 APNs Authentication Key (.p8) - EMPFOHLEN

**Vorteile:**
- Funktioniert für alle Apps in Ihrem Apple Developer Account
- Muss nicht jährlich erneuert werden
- Einfacher zu verwalten

**Schritte zur Erstellung:**

1. **Gehen Sie zum Apple Developer Portal:**
   - https://developer.apple.com/account/
   - Melden Sie sich mit Ihrem Apple Developer Account an

2. **Navigieren Sie zu Keys:**
   - Klicken Sie auf **Certificates, Identifiers & Profiles** (oder direkt: https://developer.apple.com/account/resources/authkeys/list)
   - Wählen Sie **Keys** in der linken Sidebar
   - Klicken Sie auf das **+** Symbol (neuer Key)

3. **Key erstellen:**
   - Geben Sie einen **Key Name** ein (z.B. "Firebase APNs Key")
   - Aktivieren Sie **Apple Push Notifications service (APNs)**
   - Klicken Sie auf **Continue**
   - Bestätigen Sie die Erstellung

4. **Key herunterladen:**
   - **WICHTIG:** Laden Sie die `.p8` Datei sofort herunter - Sie können sie später nicht mehr herunterladen!
   - Notieren Sie sich die **Key ID** (wird angezeigt)
   - Notieren Sie sich Ihre **Team ID** (finden Sie oben rechts im Apple Developer Portal)

5. **In Firebase hochladen:**
   - Gehen Sie zur Firebase Console → **Project Settings** → **Cloud Messaging**
   - Scrollen Sie zu **Apple app configuration**
   - Klicken Sie auf **Upload** unter **APNs Authentication Key**
   - Laden Sie die `.p8` Datei hoch
   - Geben Sie die **Key ID** und **Team ID** ein
   - Klicken Sie auf **Upload**

### 3.2 APNs Certificate (.p12) - Alternative

**Vorteile:**
- Funktioniert auch, aber muss jährlich erneuert werden
- Pro App erforderlich

**Schritte zur Erstellung:**

1. **Gehen Sie zum Apple Developer Portal:**
   - https://developer.apple.com/account/
   - Melden Sie sich mit Ihrem Apple Developer Account an

2. **Navigieren Sie zu Certificates:**
   - Klicken Sie auf **Certificates, Identifiers & Profiles**
   - Wählen Sie **Certificates** in der linken Sidebar
   - Klicken Sie auf das **+** Symbol (neues Zertifikat)

3. **Zertifikat-Typ wählen:**
   - Wählen Sie **Apple Push Notification service SSL (Sandbox & Production)**
   - Klicken Sie auf **Continue**

4. **App ID auswählen:**
   - Wählen Sie die **App ID** Ihrer iOS-App aus
   - Klicken Sie auf **Continue**

5. **Certificate Signing Request (CSR) erstellen:**
   - Öffnen Sie **Keychain Access** auf Ihrem Mac
   - Gehen Sie zu **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - Geben Sie Ihre E-Mail-Adresse ein
   - Wählen Sie **Saved to disk**
   - Speichern Sie die `.certSigningRequest` Datei

6. **CSR hochladen:**
   - Laden Sie die `.certSigningRequest` Datei im Apple Developer Portal hoch
   - Klicken Sie auf **Continue**

7. **Zertifikat herunterladen:**
   - Laden Sie das `.cer` Zertifikat herunter
   - Doppelklicken Sie darauf, um es in Keychain Access zu importieren

8. **.p12 Datei exportieren:**
   - Öffnen Sie **Keychain Access**
   - Finden Sie das Zertifikat (Name Ihrer App)
   - Erweitern Sie es und wählen Sie sowohl das Zertifikat als auch den privaten Schlüssel aus
   - Rechtsklick → **Export 2 items...**
   - Wählen Sie Format: **Personal Information Exchange (.p12)**
   - Geben Sie ein Passwort ein (wird später benötigt)
   - Speichern Sie die `.p12` Datei

9. **In Firebase hochladen:**
   - Gehen Sie zur Firebase Console → **Project Settings** → **Cloud Messaging**
   - Scrollen Sie zu **Apple app configuration**
   - Klicken Sie auf **Upload** unter **APNs Certificates**
   - Laden Sie die `.p12` Datei hoch
   - Geben Sie das Passwort ein (falls erforderlich)

**Wichtig:** 
- Für Production-Apps benötigen Sie ein Production-Zertifikat
- Development-Zertifikate funktionieren nur für Development-Builds
- Das Zertifikat muss jährlich erneuert werden (Authentication Key nicht!)

---

## 4. Android: Firebase Cloud Messaging konfigurieren

Für Android-Apps ist normalerweise keine zusätzliche Konfiguration erforderlich, da FCM standardmäßig aktiviert ist. Stellen Sie jedoch sicher:

1. Die Android-App ist im Firebase-Projekt registriert
2. Die `google-services.json` Datei ist in der Android-App integriert
3. Die App hat die notwendigen Berechtigungen in der `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   ```

---

## 5. Notification Channels (Android)

Das Backend verwendet den Notification Channel `direct_messages` für Android. Stellen Sie sicher, dass dieser Channel in der Android-App erstellt wird:

```dart
// Flutter/Dart Beispiel
final androidChannel = AndroidNotificationChannel(
  'direct_messages',
  'Direct Messages',
  description: 'Notifications for direct chat messages',
  importance: Importance.high,
);

await flutterLocalNotificationsPlugin
    .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
    ?.createNotificationChannel(androidChannel);
```

---

## 6. Umgebungsvariablen prüfen

Stellen Sie sicher, dass folgende Umgebungsvariablen gesetzt sind:

```bash
# Firebase Konfiguration
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Service Account Credentials
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

Die `FIREBASE_MESSAGING_SENDER_ID` wird hauptsächlich vom Client verwendet. Für das Backend ist sie nicht kritisch, da das Admin SDK die Projekt-ID verwendet. Sie finden sie in der Firebase Console unter **Project Settings** → **General** → **Your apps**.

---

## 7. Testing

### 7.1 Test-Notification senden

Sie können eine Test-Notification direkt aus der Firebase Console senden:

1. Gehen Sie zu **Cloud Messaging** → **Send test message**
2. Geben Sie einen FCM-Token ein (vom Client-App)
3. Geben Sie Titel und Text ein
4. Klicken Sie auf **Test**

### 7.2 Backend-Logs prüfen

Wenn das Backend eine Notification sendet, sollten Sie in den Logs sehen:

```
[FcmNotificationService] Sending notification to user <userId>
[FcmNotificationService] Notification sent successfully to device <deviceId>
```

Bei Fehlern:
```
[FcmNotificationService] Error sending notification to device <deviceId>: <error>
```

---

## 8. Häufige Probleme

### Problem: "messaging/invalid-registration-token"

**Ursache:** Der FCM-Token ist ungültig oder abgelaufen.

**Lösung:** 
- Der Client muss einen neuen Token abrufen und registrieren
- Das Backend entfernt automatisch ungültige Tokens

### Problem: "messaging/registration-token-not-registered"

**Ursache:** Der Token wurde nicht registriert oder wurde bereits entfernt.

**Lösung:**
- Der Client muss den Token erneut registrieren
- Prüfen Sie, ob der Token korrekt im UserProfile gespeichert ist

### Problem: iOS-Notifications funktionieren nicht

**Ursache:** APNs-Zertifikat fehlt oder ist falsch konfiguriert.

**Lösung:**
- Laden Sie das APNs-Zertifikat oder Authentication Key hoch
- Stellen Sie sicher, dass es für die richtige Umgebung (Development/Production) ist
- Prüfen Sie die Key ID und Team ID

### Problem: Android-Notifications funktionieren nicht

**Ursache:** Notification Channel fehlt oder falsche Konfiguration.

**Lösung:**
- Stellen Sie sicher, dass der Channel `direct_messages` in der App erstellt wurde
- Prüfen Sie die Android-Berechtigungen
- Prüfen Sie, ob `google-services.json` korrekt integriert ist

---

## 9. Weitere Ressourcen

- [Firebase Cloud Messaging Dokumentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK für Node.js](https://firebase.google.com/docs/admin/setup)
- [APNs Authentication Key Setup](https://firebase.google.com/docs/cloud-messaging/ios/certs)

---

## Checkliste

- [ ] Service Account hat Firebase Admin SDK Administrator Service Agent Berechtigung
- [ ] Service Account JSON-Datei ist in `GOOGLE_APPLICATION_CREDENTIALS` konfiguriert
- [ ] APNs-Zertifikat/Authentication Key für iOS hochgeladen (falls iOS-App vorhanden)
- [ ] Android-App ist im Firebase-Projekt registriert (falls Android-App vorhanden)
- [ ] Notification Channel `direct_messages` ist in der Android-App erstellt
- [ ] Alle Umgebungsvariablen sind gesetzt (besonders `GOOGLE_APPLICATION_CREDENTIALS`)
- [ ] Test-Notification wurde erfolgreich gesendet

**Hinweis:** Die FCM HTTP v1 API wird automatisch durch das Firebase Admin SDK verwendet - keine zusätzliche Aktivierung erforderlich.
