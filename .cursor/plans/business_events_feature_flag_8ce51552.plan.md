---
name: Business Events Feature Flag
overview: Implementierung eines neuen Feature Flags für die Event-Erstellung von Businesses. Das Feature Flag wird nach dem Pattern von DirectChatSettings implementiert und ermöglicht es, die Event-Erstellung für Businesses client-seitig zu steuern.
todos:
  - id: create-domain-entity
    content: Domain Entity BusinessEventsSettings erstellen (analog zu DirectChatSettings)
    status: completed
  - id: create-repository-interface
    content: Repository Interface BusinessEventsSettingsRepository erstellen
    status: completed
  - id: create-firebase-repository
    content: Firebase Repository Implementation erstellen mit removeUndefined, toPlainObject, toEntityProps
    status: completed
  - id: create-service
    content: Service BusinessEventsSettingsService mit getSettings, isFeatureEnabled, updateSettings erstellen
    status: completed
  - id: create-dto
    content: DTO UpdateBusinessEventsSettingsDto mit Validierung erstellen
    status: completed
  - id: extend-controller
    content: BusinessesController um GET und PATCH /businesses/events/settings Endpoints erweitern
    status: completed
  - id: update-module
    content: BusinessesModule um neue Provider und Exports erweitern
    status: completed
  - id: write-tests
    content: Tests für Service, Repository und Controller-Endpoints schreiben
    status: completed
---

# Business Events Feature Flag Implementation

## Übersicht

Es wird ein neues Feature Flag `businessEvents` implementiert, das die Event-Erstellung für Businesses steuert. Das Feature Flag folgt dem etablierten Pattern von `DirectChatSettings` und wird im Businesses-Modul integriert.

## Architektur

Das Feature Flag wird nach dem Domain-Driven Design Pattern implementiert:

```
businesses/
├── domain/
│   ├── entities/
│   │   └── business-events-settings.entity.ts (NEU)
│   └── repositories/
│       └── business-events-settings.repository.ts (NEU)
├── application/
│   ├── controllers/
│   │   └── businesses.controller.ts (ERWEITERN)
│   ├── services/
│   │   └── business-events-settings.service.ts (NEU)
│   └── dtos/
│       └── update-business-events-settings.dto.ts (NEU)
└── infrastructure/
    └── persistence/
        └── firebase-business-events-settings.repository.ts (NEU)
```

## Implementierungsschritte

### 1. Domain Entity erstellen

- **Datei**: `src/businesses/domain/entities/business-events-settings.entity.ts`
- **Pattern**: Analog zu `DirectChatSettings`
- **Eigenschaften**:
  - `id: string` (fest: `'business_events_settings'`)
  - `isEnabled: boolean`
  - `updatedAt: string`
  - `updatedBy?: string`
- **Methoden**: `create()`, `createDefault()`, `fromProps()`, `update()`, `toJSON()`

### 2. Repository Interface erstellen

- **Datei**: `src/businesses/domain/repositories/business-events-settings.repository.ts`
- **Methoden**: `get()`, `save()`

### 3. Firebase Repository Implementation

- **Datei**: `src/businesses/infrastructure/persistence/firebase-business-events-settings.repository.ts`
- **Collection**: `settings`
- **Document ID**: `business_events_settings`
- **Pattern**: Analog zu `FirebaseDirectChatSettingsRepository`
- **Features**:
  - `removeUndefined()` für Firebase-Kompatibilität
  - `toPlainObject()` für Serialisierung
  - `toEntityProps()` für Deserialisierung
  - Default-Wert: `isEnabled: true` wenn nicht vorhanden

### 4. Service erstellen

- **Datei**: `src/businesses/application/services/business-events-settings.service.ts`
- **Methoden**:
  - `getSettings(): Promise<BusinessEventsSettings>`
  - `isFeatureEnabled(): Promise<boolean>`
  - `updateSettings(isEnabled: boolean, updatedBy?: string): Promise<BusinessEventsSettings>`

### 5. DTO erstellen

- **Datei**: `src/businesses/application/dtos/update-business-events-settings.dto.ts`
- **Properties**: `isEnabled: boolean` (mit Validierung)

### 6. Controller erweitern

- **Datei**: `src/businesses/application/controllers/businesses.controller.ts`
- **Neue Endpoints**:
  - `GET /businesses/events/settings` - Feature Flag abrufen
  - `PATCH /businesses/events/settings` - Feature Flag aktualisieren (nur `super_admin`)
- **Guards**: `RolesGuard` für PATCH-Endpoint
- **Swagger**: API-Dokumentation hinzufügen

### 7. Module erweitern

- **Datei**: `src/businesses/businesses.module.ts`
- **Provider hinzufügen**:
  - `BusinessEventsSettingsService`
  - `BusinessEventsSettingsRepository` → `FirebaseBusinessEventsSettingsRepository`
- **Exports**: `BusinessEventsSettingsService` exportieren (für zukünftige Verwendung)

### 8. Tests erstellen

- **Service Tests**: `business-events-settings.service.spec.ts`
- **Repository Tests**: `firebase-business-events-settings.repository.spec.ts`
- **Controller Tests**: Erweiterung von `businesses.controller.spec.ts`
- **Test Coverage**:
  - Default-Wert wenn nicht vorhanden
  - Get/Update Operations
  - Authorization (super_admin only)
  - Error Handling

## Technische Details

### Firebase Collection Structure

```typescript
settings/
  └── business_events_settings/
      ├── isEnabled: boolean
      ├── updatedAt: string (ISO)
      └── updatedBy?: string
```

### API Endpoints

**GET /businesses/events/settings**

- **Auth**: Erforderlich (AuthGuard)
- **Response**: `BusinessEventsSettings` Entity

**PATCH /businesses/events/settings**

- **Auth**: Erforderlich (AuthGuard + RolesGuard)
- **Role**: `super_admin`
- **Body**: `UpdateBusinessEventsSettingsDto`
- **Response**: `BusinessEventsSettings` Entity

## Wichtige Hinweise

1. **Keine Backend-Validierung**: Das Feature Flag wird nur client-seitig geprüft. Es gibt keine Guards oder Validierungen in den Event-Endpoints.

2. **Default-Wert**: Wenn das Feature Flag nicht existiert, wird es automatisch mit `isEnabled: true` erstellt (wie bei DirectChatSettings).

3. **Immutability**: Die Entity verwendet readonly Properties und gibt neue Instanzen bei Updates zurück.

4. **Firebase Compatibility**: Alle `undefined` Werte werden zu `null` konvertiert vor dem Speichern.

5. **Feature Branch**: Die Implementierung erfolgt auf einem eigenen Feature Branch.

## Referenzen

- Pattern: `src/direct-chats/domain/entities/direct-chat-settings.entity.ts`
- Service Pattern: `src/direct-chats/application/services/direct-chat-settings.service.ts`
- Repository Pattern: `src/direct-chats/infrastructure/persistence/firebase-direct-chat-settings.repository.ts`
- Controller Pattern: `src/direct-chats/application/controllers/direct-chats.controller.ts` (Zeilen 34-50)