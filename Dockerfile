FROM node:18-alpine

# Build arguments
ARG NODE_ENV=production
ARG PORT=3000

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Copy pass templates
COPY pass-templates ./pass-templates

# Build the app
RUN npm run build

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Expose the port
EXPOSE ${PORT}

# Environment variables will be injected at runtime
CMD ["sh", "-c", "npm run start:${NODE_ENV}"]