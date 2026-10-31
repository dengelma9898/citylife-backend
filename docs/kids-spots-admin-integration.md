# Kids-Spots – Integration im Admin-Frontend

**Stand:** 31.10.2026  
**Geltungsbereich:** Nürnbergspots Admin-FE (`admin-fe`: React 19, TypeScript, Vite, shadcn/ui)  
**Ziel:** Die Redaktion kann Curated Spots im Admin-Frontend als Kids-Spots qualifizieren und die Website-URL pflegen.

Grundlagen:

- Architekturentscheidung: [ADR 0001 – Kids-Spots in CuratedSpot integrieren](./adr/0001-kids-spots-in-curated-spots-integrieren.md)
- Fachliche Definitionen: [`../CONTEXT.md`](../CONTEXT.md)
- Verbindliche Backend-Spezifikation: `backend/CONSTITUTION.md`, Abschnitt „Kuratierte Spots – Anlegen und Bearbeiten“

> **Wichtig:** Es gibt keine neue Admin-Route, keine neue Collection und keine eigene Kids-Spot-Entität. Kids-Spots sind normale Curated Spots mit einem zusätzlichen `kidsProfile` und der neuen `websiteUrl`.

---

## 1. Was im Admin-FE zu ändern ist

| Bereich im Admin-FE | Datei | Änderung |
|---|---|---|
| Datenmodell | `src/models/curated-spot.ts` | `KidsProfile`, Enums, `websiteUrl`, `kidsProfile`, `isKidsSpot`, `kidsNotificationSentAt` ergänzen |
| Formularlogik | `src/hooks/useCuratedSpotForm.ts` | State, Laden, Validieren und Speichern des Kids-Profils |
| Formular-UI | `src/components/curated-spots/CuratedSpotFormFields.tsx` | Neue Karte „Kids-Spot“ und Website-Feld |
| Spot-Liste | `src/pages/curated-spots/CuratedSpotList.tsx` | Kids-Badge und optionaler Kids-Filter |
| Service | `src/services/curatedSpotService.ts` | Keine neue Methode erforderlich; Create/PATCH liefern die neuen Felder automatisch mit |
| API-Endpunkte | `src/lib/api.ts` | Keine Änderung erforderlich |
| Spot-Keywords | `src/components/ui/*`, bestehende Keyword-Logik | Nicht für Kids-Ausstattung verwenden |

Der öffentliche Endpoint `GET /curated-spots/kids` ist für die Endnutzer-App. Er darf nicht für die Admin-Liste verwendet werden, weil er nur aktive, kids-sichtbare Spots mit mindestens einem Foto zurückgibt.

---

## 2. Datenmodell

Die Werte kommen als Strings aus der API. Im Admin-FE werden dazu passende String-Union-Typen ergänzt.

### 2.1 Typen in `src/models/curated-spot.ts`

```ts
export type KidsLocationType = 'INDOOR' | 'OUTDOOR' | 'BOTH';

export type KidsEquipmentTag =
  | 'DIAPER_CHANGING_FACILITY'
  | 'STROLLER_FRIENDLY'
  | 'NURSING_FRIENDLY'
  | 'PLAY_AREA'
  | 'CHILD_SEATS'
  | 'STEP_FREE_ACCESS';

export interface KidsProfile {
  locationType: KidsLocationType;
  /** Kleinkind: 0–5 Jahre */
  suitableForToddlers: boolean;
  /** Schulkind: ab 6 Jahren */
  suitableForSchoolKids: boolean;
  /** Eintritt für alle Parteien frei; Konsum vor Ort wird nicht betrachtet. */
  isFree: boolean;
  /** Redaktionelles Siegel; unabhängig von INDOOR/OUTDOOR/BOTH */
  isBadWeatherTip: boolean;
  equipmentTags: KidsEquipmentTag[];
}

export interface CuratedSpot {
  // bestehende Felder unverändert
  websiteUrl: string | null;
  kidsProfile: KidsProfile | null;
  /** Vom Backend abgeleitet: kidsProfile !== null. Nicht speichern und nie zurücksenden. */
  isKidsSpot: boolean;
  /** Zeitpunkt der einmalig gesendeten NEW_KIDS_SPOT-Push; null, solange keine gesendet wurde. */
  kidsNotificationSentAt: string | null;
}
```

Falls Mockdaten oder ältere Fixtures nicht sofort alle neuen Felder liefern, können die neuen Felder im Frontend-Typ vorübergehend optional (`websiteUrl?: string | null` usw.) definiert werden. Im Formular müssen sie aber nach dem Laden normalisiert werden.

### 2.2 DTOs

In `CreateCuratedSpotDto` ergänzen:

```ts
websiteUrl?: string;
kidsProfile?: KidsProfile;
```

Das bestehende `PatchCuratedSpotDto` erfordert eine ausdrückliche Ergänzung, damit Kids-Profile auch entfernt werden können:

```ts
websiteUrl: string | null;
kidsProfile: KidsProfile | null;
```

In der Formularlogik das bestehende `Partial`-Mapping so anpassen, dass diese beiden Felder wirklich `null` annehmen können. `isKidsSpot` und `kidsNotificationSentAt` gehören in kein Create- oder PATCH-DTO.

### 2.3 PATCH-Semantik – nicht verwechseln

| Gesendeter Wert | Bedeutung |
|---|---|
| `kidsProfile` fehlt im PATCH | Profil bleibt unverändert |
| `kidsProfile: null` | Kids-Profil entfernen; der Spot selbst bleibt bestehen |
| `kidsProfile: { ... }` | Kids-Profil vollständig ersetzen (kein Teil-PATCH einzelner Profilfelder) |
| `websiteUrl: null` | Website entfernen |
| `websiteUrl: ''` im Request | Nicht verwenden; leerer String schlägt in der Backend-Validierung fehl. Im Formular immer auf `null` normalisieren |

> Das Admin-FE baut beim Speichern ohnehin einen vollständigen PATCH-Body. Darum muss es `kidsProfile` im Edit-Fall bei jedem Speichern bewusst mitschicken: Objekt, wenn aktiviert, `null`, wenn deaktiviert. So kann ein versehentliches Offenlassen des Feldes nicht aus Versehen ein altes Profil erhalten.

### 2.4 Ausstattungs-Tags

Die Liste ist fest im Backend definiert. Es gibt dafür keinen Endpunkt, keine Verwaltung und keine freien Texteingaben.

Labels im Admin-FE:

| API-Wert | Label |
|---|---|
| `DIAPER_CHANGING_FACILITY` | Wickelmöglichkeit vorhanden |
| `STROLLER_FRIENDLY` | Kinderwagenfreundlich |
| `NURSING_FRIENDLY` | Stillmöglichkeit vorhanden |
| `PLAY_AREA` | Spielecke / Spielmöglichkeit |
| `CHILD_SEATS` | Kinderstühle vorhanden |
| `STEP_FREE_ACCESS` | Stufenloser Zugang |

Die Tags dienen aktuell nur zur Anzeige. Nicht als Filter implementieren und nicht mit den freien `SpotKeywords` (`keywordIds`/`newKeywordNames`) vermischen.

---

## 3. Formularlogik in `useCuratedSpotForm.ts`

### 3.1 Zusätzlicher State

Da „kein Kids-Profil“ und „Kids-Profil mit `isFree: false`“ unterschiedliche Zustände sind, reicht ein einzelnes Profil-Objekt ohne separaten Aktivierungszustand nicht aus:

```ts
const [websiteUrl, setWebsiteUrl] = useState('');
const [kidsEnabled, setKidsEnabled] = useState(false);
const [kidsLocationType, setKidsLocationType] = useState<KidsLocationType>('INDOOR');
const [suitableForToddlers, setSuitableForToddlers] = useState(false);
const [suitableForSchoolKids, setSuitableForSchoolKids] = useState(false);
const [kidsIsFree, setKidsIsFree] = useState(false);
const [kidsIsBadWeatherTip, setKidsIsBadWeatherTip] = useState(false);
const [kidsEquipmentTags, setKidsEquipmentTags] = useState<KidsEquipmentTag[]>([]);
const [kidsNotificationSentAt, setKidsNotificationSentAt] = useState<string | null>(null);
```

Die bestehenden Startwerte sind Standardwerte beim erstmaligen Aktivieren. Sie bedeuten nicht, dass ein Spot ohne Profil diese Werte besäße.

### 3.2 Spot laden

In `loadSpot()` zusätzlich:

```ts
setWebsiteUrl(spot.websiteUrl ?? '');
setKidsEnabled(spot.kidsProfile !== null);
setKidsLocationType(spot.kidsProfile?.locationType ?? 'INDOOR');
setSuitableForToddlers(spot.kidsProfile?.suitableForToddlers ?? false);
setSuitableForSchoolKids(spot.kidsProfile?.suitableForSchoolKids ?? false);
setKidsIsFree(spot.kidsProfile?.isFree ?? false);
setKidsIsBadWeatherTip(spot.kidsProfile?.isBadWeatherTip ?? false);
setKidsEquipmentTags(
  (spot.kidsProfile?.equipmentTags ?? []).filter(isKidsEquipmentTag),
);
setKidsNotificationSentAt(spot.kidsNotificationSentAt ?? null);
```

Mit einer lokalen Guard-Funktion `isKidsEquipmentTag(value)` werden unbekannte Werte aus älteren oder fehlerhaften Daten beim Laden verworfen statt an die UI weitergereicht.

### 3.3 Validierung im Formular

Die bestehende Hilfsfunktion `isValidHttpUrl` auch für `websiteUrl` verwenden. Die Backend-Validierung bleibt unverändert maßgeblich.

Vor dem Speichern zu prüfen:

1. Wenn `kidsEnabled === false`: keine Kids-Validierung durchführen; der gespeicherte Wert ist `null` (im Create-Fall Feld weglassen, siehe unten).
2. Wenn `kidsEnabled === true`: Mindestens eine der beiden Altersgruppen muss aktiv sein.
3. `websiteUrl` muss leer oder eine gültige http/https-URL sein.

Empfohlene Fehlermeldung, wenn beide Altersgruppen aus sind:

```text
Bitte mindestens eine Altersgruppe auswählen (Kleinkind oder Schulkind).
```

Im Gegensatz zu Indoor/Outdoor sind die beiden Altersgruppen kein „Entweder-oder“: Beide dürfen und sollen bei geeigneten Spots gleichzeitig aktiv sein.

### 3.4 Profil für Requests zusammenbauen

```ts
const buildKidsProfile = (): KidsProfile | null => {
  if (!kidsEnabled) return null;

  return {
    locationType: kidsLocationType,
    suitableForToddlers,
    suitableForSchoolKids,
    isFree: kidsIsFree,
    isBadWeatherTip: kidsIsBadWeatherTip,
    equipmentTags: [...kidsEquipmentTags],
  };
};
```

#### Neuer Spot (`POST /curated-spots`)

- `kidsEnabled === false`: `kidsProfile` nicht in den Request aufnehmen.
- `kidsEnabled === true`: vollständiges Profil mitsenden.
- Leere Website im Create-Request weglassen; sonst getrimmte URL senden.

#### Bestehender Spot (`PATCH /curated-spots/:id`)

- `kidsProfile: buildKidsProfile()` immer mitsenden (Objekt oder `null`).
- `websiteUrl: websiteUrl.trim() || null` immer mitsenden.

#### Beispiel-Payload

```json
{
  "name": "Beispielspielplatz",
  "descriptionMarkdown": "...",
  "address": {
    "street": "Hauptstraße",
    "houseNumber": "1",
    "postalCode": "90403",
    "city": "Nürnberg",
    "latitude": 49.45,
    "longitude": 11.08
  },
  "status": "ACTIVE",
  "websiteUrl": "https://beispiel.de",
  "kidsProfile": {
    "locationType": "OUTDOOR",
    "suitableForToddlers": true,
    "suitableForSchoolKids": true,
    "isFree": true,
    "isBadWeatherTip": false,
    "equipmentTags": ["STROLLER_FRIENDLY", "STEP_FREE_ACCESS"]
  }
}
```

Kids-Profil entfernen:

```json
{
  "kidsProfile": null
}
```

---

## 4. Formular-UI in `CuratedSpotFormFields.tsx`

### 4.1 Website-Feld

In der vorhandenen Karte „Links & Medien“ ein drittes URL-Feld „Website-URL“ ergänzen – mit demselben Verhalten wie das Instagram-Feld:

```tsx
<div className="space-y-2">
  <Label htmlFor="website-url" className="text-foreground">
    Website-URL
  </Label>
  <Input
    id="website-url"
    type="url"
    value={websiteUrl}
    onChange={e => setWebsiteUrl(e.target.value)}
    className={cn(inputPreset)}
    placeholder="https://…"
    disabled={!isAdminOrSuperAdmin}
  />
</div>
```

Hinweis in der Karte: Die App zeigt priorisiert die Website und sonst Instagram. Öffnungszeiten und Preise müssen daher nicht zusätzlich gepflegt werden.

### 4.2 Neue Karte „Kids-Spot“

Eine eigene Karte nach „Spot-Keywords“ (vor „Links & Medien“) einfügen. Die Karte ist auch dann zu rendern, wenn kein Profil existiert – sonst kann die Redaktion keinen Spot erstmalig qualifizieren.

Aufbau:

1. **Schalter „Als Kids-Spot führen“** (`kidsEnabled`)
   - Aus: Der Rest der Karte ist deaktiviert/ausgegraut, mit Hinweistext, dass der Spot kein Kids-Spot ist.
   - An: Alle Profilfelder werden aktiv.
2. **Standorttyp** – `Select` mit drei Optionen:
   | Wert | Label |
   |---|---|
   | `INDOOR` | Indoor (drinnen) |
   | `OUTDOOR` | Outdoor (draußen) |
   | `BOTH` | Beides (drinnen und draußen) |

   Kein Ja/Nein-Schalter und kein Paar aus zwei Booleans: `BOTH` ist ein eigener Wert. Beispiele: Tiergarten mit Tropenhaus, Bad mit Innen- und Außenbereich.

   In der App wirkt die Auswahl so: Filter „Indoor“ findet `INDOOR` und `BOTH`, Filter „Outdoor“ findet `OUTDOOR` und `BOTH`.
3. **Geeignet für** – zwei getrennte Schalter, die gleichzeitig an sein dürfen:
   - „Kleinkind (0–5 Jahre)“
   - „Schulkind (ab 6 Jahren)“

   Das Formular muss verhindern, dass beide gleichzeitig aus sind (siehe Validierung).
4. **Kostenlos** – Schalter mit Hilfetext:

   > „Kostenlos = Eintritt für alle frei (Kinder und Begleitpersonen). Konsum vor Ort, z. B. im Kindercafé, zählt nicht.“

   Damit ist klar, dass ein Museum mit kostenlosem Kindereintritt, aber Eintritt für Erwachsene, **nicht** kostenlos ist.
5. **Schlechtwetter-Tipp** – Schalter mit Hilfetext:

   > „Redaktionelles Siegel für Spots, die sich bei Regen besonders lohnen. Unabhängig von Indoor/Outdoor – auch ein überdachter Outdoor-Spot kann ein Schlechtwetter-Tipp sein.“
6. **Ausstattung** – die sechs festen Tags als Mehrfachauswahl, z. B. mit der vorhandenen `SelectableBadge`-Komponente oder Checkboxen. Kein Freitextfeld, keine Vorschlags-Suche, keine neuen Tags zur Laufzeit.
7. **Hinweis zur Push (nur im Edit-Modus):**
   - Zeigt `kidsNotificationSentAt` gesetzt ist: „Die ‚Neuer Kids-Spot‘-Push wurde am … gesendet und wird für diesen Spot nicht erneut gesendet.“
   - Ist das Profil aktiv, aber der Spot noch nicht kids-sichtbar: Das Frontend kann aus geladenen Daten anzeigen, was noch fehlt (Status nicht `ACTIVE` und/oder noch kein Foto). Die Push wird gesendet, sobald der Spot durch Speichern, Aktivieren oder den ersten Foto-Upload kids-sichtbar wird.

### 4.3 Wann ist ein Spot in der Kids-Ansicht?

Für Hinweise und Badges ist diese Unterscheidung wichtig:

| Zustand | Bedeutung |
|---|---|
| `kidsProfile === null` | Kein Kids-Spot |
| Profil gesetzt, aber Status `PENDING` oder kein Foto | Kids-Spot, aber noch **nicht** in der Kids-Ansicht sichtbar |
| Profil gesetzt, Status `ACTIVE`, mindestens ein Bild | Kids-sichtbar |

Die Sichtbarkeitsregel gilt nur für `GET /curated-spots/kids` (App). In Admin-Listen erscheinen alle Spots weiterhin über `/curated-spots/admin`.

### 4.4 Reihenfolge von Status und Foto-Upload – Push-Verhalten

Beim Anlegen lädt das bestehende Formular zuerst den Spot und danach Bilder hoch. Ein Spot ist erst kids-sichtbar, wenn **beides** vorhanden ist: Status `ACTIVE` und mindestens ein Foto. Daher gilt:

- Beim Create mit Profil, aber ohne Foto: noch keine Push.
- Beim späteren Aktivieren mit vorhandem Foto: Push.
- Beim nachträglichen Setzen des Profils an einem aktiven Spot mit Foto: Push.
- Beim ersten Upload eines Fotos an aktivem Spot mit Profil: Push.
- Bei reinen Text-, Korrektur- oder Filteränderungen: keine Push.
- Beim Deaktivieren und erneuten Aktivieren: keine zweite Push.
- Beim Entfernen und erneuten Setzen des Profils: keine zweite Push.

Das Admin-FE löst die Push nicht selbst aus. Es darf keinen eigenen Notification-Request senden und muss auch nicht auf die Push warten: Wenn der Backend-Versand fehlschlägt, ist das Speichern trotzdem erfolgreich.

---

## 5. Spot-Liste

In `src/pages/curated-spots/CuratedSpotList.tsx` pro Spot:

- Ein „Kids-Spot“-Badge anzeigen, wenn `spot.isKidsSpot === true` ist (zur Not aus `spot.kidsProfile !== null` ableiten).
- Für Kids-Spots ohne Foto oder mit Status `PENDING` zusätzlich einen dezenten Hinweis anzeigen, z. B. „noch nicht in Kids-Ansicht sichtbar“ (mit Grund: Foto fehlt / nicht aktiv). Das erspart der Redaktion das Rätseln, warum ein qualifizierter Spot in der App fehlt.
- Optional: ein Client-Filter „Nur Kids-Spots“ auf der bereits geladenen Admin-Liste. Dafür ist kein API-Aufruf nötig, und `GET /curated-spots/kids` wird nicht verwendet.

Keine weiteren Listenaktionen sind erforderlich. Aktivieren und Löschen bleiben unverändert.

---

## 6. Fehlerverhalten

Mit der globalen `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) führen Backend-validierte Fehler zu HTTP 400, z. B.:

- `locationType` fehlt oder hat einen unbekannten Wert, wenn ein Profil gesendet wird
- beide Altersgruppen sind `false`
- `equipmentTags` enthält einen unbekannten oder doppelten Wert
- `websiteUrl` ist keine gültige URL
- Unbekannte Felder werden gesendet (also niemals `isKidsSpot` oder `kidsNotificationSentAt` mitsenden)

Das Admin-FE zeigt diese Fehler wie bisher über `showUserFriendlyError` an. Kein Retry und keine Sonderbehandlung für Kids-Felder – lediglich die clientseitige Vorabprüfung (Altersgruppen, URL) verhindert die häufigsten 400er.

Die bestehenden Rollenregeln bleiben unverändert: Nur `admin` oder `super_admin` dürfen speichern; das Formular bleibt für andere Rollen deaktiviert.

---

## 7. Tests im Admin-FE

Vorhandene Testdateien anpassen und neue Fälle ergänzen. Die Reihenfolge in `npm run validate`: `type-check`, `lint`, `format:check`, Vitest.

| Testdatei | Zu testende Fälle |
|---|---|
| `src/services/__tests__/curatedSpotService.test.ts` | Create/PATCH senden `websiteUrl` und `kidsProfile` mit; PATCH mit `kidsProfile: null` entfernt das Profil; keine neuen Endpunkte |
| Formular-/Hook-Tests (bestehender `useCuratedSpotForm`-Test bzw. Formulartests ergänzen) | Laden: Profil und Website vorbefüllen. Aktivieren: Standardwerte. Speichern bei deaktiviertem Schalter sendet `kidsProfile: null`. Beide Altersgruppen aus blockiert das Speichern. Leere Website wird im Edit zu `null`. `isKidsSpot`/`kidsNotificationSentAt` werden nie gesendet |
| `src/pages/curated-spots/__tests__/CuratedSpotList.test.tsx` | Kids-Badge bei gesetztem Profil; Hinweis „noch nicht sichtbar“ ohne Foto oder mit `PENDING`; kein Badge ohne Profil |
| E2E (Playwright) | Spot anlegen → Kids-Profil aktivieren, Altersgruppe und Tag wählen → speichern → erneut öffnen und Vorbefüllung prüfen → Profil deaktivieren → weiterhin `null` |

**Wichtig für Mockdaten:** Service- und Listentests bauen lokale Spot-Fixtures. Neue Pflichtfelder im `CuratedSpot`-Typ müssen in diesen Fixtures ergänzt werden (oder die Felder im Typ vorübergehend optional bleiben), sonst schlägt der Type-Check fehl.

---

## 8. Abnahmecheckliste

- [ ] Neuer Spot mit Kids-Profil lässt sich anlegen und nach dem Öffnen korrekt vorbefüllt anzeigen.
- [ ] Spot ohne Kids-Profil taucht ohne Kids-Badge auf und sendet beim Speichern kein Profil.
- [ ] Bestehender Spot lässt sich nachträglich qualifizieren.
- [ ] Das Profil lässt sich deaktivieren und ist nach erneutem Laden wirklich entfernt (`null`).
- [ ] Indoor/Outdoor/Both und beide Altersgruppen werden korrekt gespeichert.
- [ ] Keine Altersgruppe → clientseitige Fehlermeldung, kein gespeichertes ungültiges Profil.
- [ ] `websiteUrl` lässt sich setzen, ändern und leeren.
- [ ] Ausstattungs-Tags lassen sich mehrfach auswählen und exakt wieder abwählen; kein Freitext-Tag möglich.
- [ ] Kids-Spot ohne Foto wird in der Liste als „noch nicht sichtbar“ markiert.
- [ ] Nach Aktivieren eines aktiven Kids-Spots mit Foto erscheint die Push genau einmal bei Nutzern mit aktivem `newKidsSpots`-Toggle (Testgerät/Testnutzer).
- [ ] Wiederholtes Speichern/Aktivieren löst keine zweite Push aus.
- [ ] `npm run validate` ist grün.

---

## 9. Nicht Teil dieser Integration

- Keine Änderung an `src/lib/api.ts` und keine neue Seite/Route im Admin-FE.
- Keine Tags-Verwaltung und kein `GET /spot-keywords` für Ausstattung.
- Keine Migration: Bestehende Spots bleiben ohne Profil, bis die Redaktion sie einzeln qualifiziert.
- Kein Versand von Push-Nachrichten aus dem Admin-FE.
- Endnutzer-App (Kids-Ansicht, Profil-Toggle `newKidsSpots`, Deep-Link) ist ein separates Vorhaben.
