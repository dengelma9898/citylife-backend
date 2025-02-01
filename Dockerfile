FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Copy pass templates
COPY pass-templates ./pass-templates

# Build the app
RUN npm run build

# Environment variables will be injected at runtime
CMD ["npm", "run", "start:prod"]