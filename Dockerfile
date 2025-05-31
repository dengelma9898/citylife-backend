FROM node:20-slim

# Build arguments
ARG NODE_ENV=prd
ARG PORT=3000

WORKDIR /app

# Install dependencies for Puppeteer
# Diese Abhängigkeiten sind notwendig, damit Chromium in einem Docker-Container korrekt funktioniert
RUN apt-get update && apt-get install -y \
    # Chromium Browser - der Hauptbrowser, den Puppeteer verwendet
    chromium \
    # Verschiedene Schriftarten für korrekte Darstellung von internationalen Zeichen
    fonts-ipafont-gothic \    # Japanische Schriftarten
    fonts-wqy-zenhei \        # Chinesische Schriftarten
    fonts-thai-tlwg \         # Thailändische Schriftarten
    fonts-kacst \             # Arabische Schriftarten
    fonts-freefont-ttf \      # Allgemeine Unicode-Schriftarten
    # X11-Bibliothek für die Darstellung von Webseiten
    libxss1 \
    --no-install-recommends \ # Reduziert die Image-Größe durch Vermeidung von empfohlenen Paketen
    && rm -rf /var/lib/apt/lists/* # Bereinigt apt-Cache für kleinere Image-Größe

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Copy pass templates
COPY pass-templates ./pass-templates

# Build the app
RUN npm run build:${NODE_ENV}

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
# Puppeteer-Konfiguration für Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true # Verhindert das Herunterladen von Chromium durch Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium # Pfad zur systemseitig installierten Chromium-Version

# Expose the port
EXPOSE ${PORT}

# Environment variables will be injected at runtime
CMD ["sh", "-c", "npm run start:${NODE_ENV}"]