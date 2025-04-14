# citylife-backend

## Umgebungsvariablen

Die Anwendung verwendet verschiedene Umgebungsvariablen, die in der `.env` Datei konfiguriert werden müssen:

### Firebase Konfiguration
```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

### HERE Maps API Credentials
```
HERE_APP_ID=...
HERE_API_KEY=...
```

### Wallet Pass Zertifikate (base64 kodiert)
```
WALLET_WWDR_CERT=...
WALLET_SIGNER_CERT=...
WALLET_KEY_PASSPHRASE=...
```

### Umgebungskonfiguration
```
NODE_ENV=development|test|production
PORT=3000  # Test-Umgebung
PORT=3100  # Produktionsumgebung
```

## Start-Skripte

Die Anwendung kann in verschiedenen Umgebungen gestartet werden:

```bash
# Entwicklungsumgebung
npm run start:dev

# Testumgebung
npm run start:test

# Produktionsumgebung
npm run start:prod
```

## Docker Konfiguration

### Lokale Entwicklung mit Docker Compose

Die Anwendung kann mit Docker Compose in verschiedenen Umgebungen gestartet werden:

```bash
# Test-Umgebung
ENV_FILE=.env PORT=3000 NODE_ENV=test docker-compose up

# Produktionsumgebung
ENV_FILE=.env.prod PORT=3100 NODE_ENV=production docker-compose up
```

### Docker Build

#### Test-Umgebung
```bash
docker buildx build --platform linux/amd64 \
  --build-arg NODE_ENV=test \
  --build-arg PORT=3000 \
  -t dengelma/nuernbergspots-test \
  --push .
```

#### Produktionsumgebung
```bash
docker buildx build --platform linux/amd64 \
  --build-arg NODE_ENV=production \
  --build-arg PORT=3100 \
  -t dengelma/nuernbergspots \
  --push .
```

## Docker Deployment

### Test-Umgebung
1. `ssh root@87.106.208.51`
2. `docker stop nuernbergspots-test`
3. `docker rm nuernbergspots-test`
4. `docker pull dengelma/nuernbergspots-test`
5. `docker run -d --name nuernbergspots-test -p 3000:3000 --restart unless-stopped -e PORT=3000 -e NODE_ENV=test dengelma/nuernbergspots-test`

### Produktionsumgebung
1. `ssh root@87.106.208.51`
2. `docker stop nuernbergspots`
3. `docker rm nuernbergspots`
4. `docker pull dengelma/nuernbergspots`
5. `docker run -d --name nuernbergspots -p 3100:3100 --restart unless-stopped -e PORT=3100 -e NODE_ENV=production dengelma/nuernbergspots`

## Umgebungsvariablen in Docker

Die folgenden Umgebungsvariablen können beim Start des Containers übergeben werden:

- `NODE_ENV`: Die Umgebung (development|test|production)
- `PORT`: Der Port, auf dem die Anwendung läuft (3000 für Test, 3100 für Produktion)
- `ENV_FILE`: Die zu verwendende .env-Datei (.env für Test, .env.prod für Produktion)

Alle anderen Umgebungsvariablen werden aus der angegebenen .env-Datei geladen.