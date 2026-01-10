# Mistral API Token Setup & Integration

## 1. Mistral API Token erhalten

### Schritt 1: Account erstellen

1. Gehen Sie zu [https://console.mistral.ai/](https://console.mistral.ai/)
2. Erstellen Sie ein kostenloses Konto oder loggen Sie sich ein
3. Bestätigen Sie Ihre E-Mail-Adresse

### Schritt 2: API Key generieren

1. Navigieren Sie zu **API Keys** im Dashboard
2. Klicken Sie auf **"Create API Key"**
3. Geben Sie einen Namen ein (z.B. "citylife-backend-production")
4. Kopieren Sie den generierten API Key **sofort** - er wird nur einmal angezeigt!

**WICHTIG:** Der API Key beginnt mit `mistral-` und sieht etwa so aus:
```
mistral-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Schritt 3: Billing einrichten (optional)

- Für Produktionsumgebungen sollten Sie ein Billing-Konto einrichten
- Mistral bietet ein kostenloses Kontingent, danach Pay-as-you-go
- Überwachen Sie die Nutzung im Dashboard

### Alternative: DeepInfra

Falls Sie DeepInfra als Alternative nutzen möchten:

1. Gehen Sie zu [https://deepinfra.com/](https://deepinfra.com/)
2. Erstellen Sie ein Konto
3. Generieren Sie einen API Key
4. Nutzen Sie `MISTRAL_BASE_URL=https://api.deepinfra.com/v1/openai`

## 2. Lokale Entwicklung

### .env Datei erstellen/bearbeiten

Erstellen Sie eine `.env` Datei im Projekt-Root (falls nicht vorhanden):

```bash
# Mistral AI API
MISTRAL_API_KEY=mistral-your-api-key-here
MISTRAL_BASE_URL=https://api.mistral.ai/v1  # Optional, Standard-Wert
```

**WICHTIG:** Fügen Sie `.env` zu `.gitignore` hinzu, damit der API Key nicht ins Repository gelangt!

### Testen der Konfiguration

```bash
# Starten Sie die Anwendung
npm run start:dev

# Testen Sie den Endpoint
curl -X POST http://localhost:3000/events/scrape/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"url": "https://eventfinder.de/nuernberg"}'
```

## 3. Docker Compose (Lokale Entwicklung)

### .env Datei für Docker

Die `.env` Datei wird automatisch von Docker Compose geladen:

```bash
# In docker-compose.yml wird bereits env_file verwendet
ENV_FILE=.env docker-compose up
```

Stellen Sie sicher, dass `MISTRAL_API_KEY` in Ihrer `.env` Datei vorhanden ist.

## 4. Docker Build & Deployment

### Option A: Environment-Variablen beim Docker Run

**Test-Umgebung:**
```bash
docker run -d --name nuernbergspots-test -p 3000:3000 --restart unless-stopped \
  -e PORT=3000 \
  -e NODE_ENV=dev \
  -e BASE_URL=/dev \
  -e MISTRAL_API_KEY=mistral-your-api-key-here \
  -e MISTRAL_BASE_URL=https://api.mistral.ai/v1 \
  dengelma/nuernbergspots-test
```

**Produktionsumgebung:**
```bash
docker run -d --name nuernbergspots -p 3100:3100 --restart unless-stopped \
  -e PORT=3100 \
  -e NODE_ENV=prd \
  -e BASE_URL=/prd \
  -e MISTRAL_API_KEY=mistral-your-production-api-key-here \
  -e MISTRAL_BASE_URL=https://api.mistral.ai/v1 \
  dengelma/nuernbergspots
```

### Option B: .env Datei auf dem Server

**Sicherer:** Erstellen Sie eine `.env.prod` Datei auf dem Server:

```bash
# Auf dem Server (z.B. /root/citylife-backend/.env.prod)
MISTRAL_API_KEY=mistral-your-production-api-key-here
MISTRAL_BASE_URL=https://api.mistral.ai/v1
```

Dann beim Docker Run:
```bash
docker run -d --name nuernbergspots -p 3100:3100 --restart unless-stopped \
  --env-file /root/citylife-backend/.env.prod \
  -e PORT=3100 \
  -e NODE_ENV=prd \
  -e BASE_URL=/prd \
  dengelma/nuernbergspots
```

## 5. CI/CD Pipeline Integration

### GitHub Actions / GitLab CI

**WICHTIG:** Nutzen Sie **Secrets** für API Keys, niemals hardcoded!

#### GitHub Actions Beispiel

Die Deployment-Pipeline ist bereits konfiguriert! Sie müssen nur die Secrets hinzufügen:

1. **Secrets hinzufügen:**
   - Gehen Sie zu Repository → Settings → Secrets and variables → Actions
   - Klicken Sie auf "New repository secret"
   - **Für Dev-Umgebung:**
     - Name: `MISTRAL_API_KEY_DEV`
     - Value: Ihr Mistral API Key für Test/Dev
     - Environment: `dev` (optional, für bessere Isolation)
   - **Für Produktionsumgebung:**
     - Name: `MISTRAL_API_KEY_PRD`
     - Value: Ihr Mistral API Key für Produktion
     - Environment: `prd` (optional, für bessere Isolation)

2. **Die Workflow-Datei ist bereits aktualisiert:**
   Die `.github/workflows/deployment.yml` verwendet bereits:
   ```yaml
   -e MISTRAL_API_KEY=${{ secrets.MISTRAL_API_KEY_DEV }}  # für dev
   -e MISTRAL_API_KEY=${{ secrets.MISTRAL_API_KEY_PRD }}   # für prd
   -e MISTRAL_BASE_URL=https://api.mistral.ai/v1
   ```

**WICHTIG:** 
- Verwenden Sie separate API Keys für Dev und Produktion (empfohlen)
- Oder verwenden Sie den gleichen Key für beide, dann setzen Sie beide Secrets auf den gleichen Wert

#### GitLab CI Beispiel

1. **CI/CD Variables hinzufügen:**
   - Gehen Sie zu Project → Settings → CI/CD → Variables
   - Klicken Sie auf "Add variable"
   - Key: `MISTRAL_API_KEY`
   - Value: Ihr Mistral API Key
   - Markieren Sie als "Protected" und "Masked"

2. **In .gitlab-ci.yml verwenden:**
```yaml
deploy:
  script:
    - docker buildx build --platform linux/amd64 \
        --build-arg NODE_ENV=prd \
        -t dengelma/nuernbergspots \
        --push .
    - |
      ssh root@87.106.208.51 << EOF
        docker stop nuernbergspots || true
        docker rm nuernbergspots || true
        docker pull dengelma/nuernbergspots
        docker run -d --name nuernbergspots -p 3100:3100 --restart unless-stopped \
          -e PORT=3100 \
          -e NODE_ENV=prd \
          -e BASE_URL=/prd \
          -e MISTRAL_API_KEY=${MISTRAL_API_KEY} \
          -e MISTRAL_BASE_URL=https://api.mistral.ai/v1 \
          dengelma/nuernbergspots
      EOF
  only:
    - main
```

## 6. Docker Compose aktualisieren

Aktualisieren Sie `docker-compose.yml` um Mistral-Variablen zu unterstützen:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    env_file:
      - ${ENV_FILE:-.env}
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - PORT=${PORT:-3000}
      # ... andere Variablen ...
      # Mistral AI API
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      - MISTRAL_BASE_URL=${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}
```

## 7. Sicherheitsbest Practices

### ✅ DO:
- ✅ Nutzen Sie Secrets Management (GitHub Secrets, GitLab Variables, etc.)
- ✅ Verwenden Sie separate API Keys für Test und Produktion
- ✅ Rotieren Sie API Keys regelmäßig
- ✅ Überwachen Sie API-Nutzung und Kosten
- ✅ Nutzen Sie `.env` Dateien, die nicht im Repository sind
- ✅ Setzen Sie Berechtigungen auf `.env` Dateien: `chmod 600 .env`

### ❌ DON'T:
- ❌ Committen Sie API Keys niemals ins Repository
- ❌ Hardcoden Sie API Keys im Code
- ❌ Teilen Sie API Keys in Chat/Email/Slack
- ❌ Nutzen Sie den gleichen API Key für Test und Produktion
- ❌ Loggen Sie API Keys (sie werden automatisch maskiert)

## 8. Verifizierung

### API Key testen

```bash
# Direkter API-Test
curl https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer YOUR_MISTRAL_API_KEY"

# Über den Backend-Endpoint
curl -X POST http://localhost:3000/events/scrape/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"url": "https://eventfinder.de/nuernberg"}'
```

### Logs prüfen

```bash
# Docker Logs
docker logs nuernbergspots-test

# Suchen Sie nach:
# - "MISTRAL_API_KEY nicht gesetzt" (Warnung, wenn Key fehlt)
# - "Mistral-Extraktion erfolgreich" (bei erfolgreicher Extraktion)
# - API-Fehler (bei ungültigem Key)
```

## 9. Troubleshooting

### Problem: "MISTRAL_API_KEY nicht gesetzt"

**Lösung:**
- Prüfen Sie, ob die Environment-Variable gesetzt ist: `echo $MISTRAL_API_KEY`
- Bei Docker: Prüfen Sie `docker inspect nuernbergspots | grep MISTRAL`
- Stellen Sie sicher, dass die Variable beim `docker run` übergeben wird

### Problem: "401 Unauthorized"

**Lösung:**
- API Key ist ungültig oder abgelaufen
- Generieren Sie einen neuen API Key im Mistral Dashboard
- Aktualisieren Sie die Environment-Variable

### Problem: "Rate limit exceeded"

**Lösung:**
- Mistral hat Rate Limits (abhängig vom Plan)
- Implementieren Sie Retry-Logic mit Exponential Backoff
- Überwachen Sie die Nutzung über `/events/scrape/llm/costs`

## 10. Kostenüberwachung

### Dashboard

- Mistral Dashboard: [https://console.mistral.ai/](https://console.mistral.ai/)
- Überwachen Sie Nutzung und Kosten regelmäßig

### API-Endpoint

```bash
# Kosten abrufen
curl http://localhost:3000/events/scrape/llm/costs \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Token-Verbrauch abrufen
curl http://localhost:3000/events/scrape/llm/tokens \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Zusammenfassung

1. **Token erhalten:** Mistral Console → API Keys → Create API Key
2. **Lokal:** `.env` Datei mit `MISTRAL_API_KEY` erstellen
3. **Docker:** Environment-Variable beim `docker run` übergeben oder `--env-file` nutzen
4. **CI/CD:** Secrets in GitHub/GitLab konfigurieren und in Workflow verwenden
5. **Sicherheit:** Niemals API Keys committen oder hardcoden!
