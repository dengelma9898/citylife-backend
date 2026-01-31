import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TimezoneInterceptor } from './core/interceptors/timezone.interceptor';
import { useContainer } from 'class-validator';
import helmet from 'helmet';

async function bootstrap() {
  // Log-Level basierend auf Umgebung konfigurieren
  // Umgebungsvariablen direkt aus process.env lesen, da ConfigService erst nach App-Erstellung verfügbar ist
  const nodeEnv = process.env.NODE_ENV;
  const logLevel = process.env.LOG_LEVEL;

  // Bestimme das Log-Level:
  // - In Produktion: 'warn' (nur warn und error)
  // - Wenn LOG_LEVEL=debug gesetzt: 'debug' (alle Logs)
  // - Standard: 'log' (log, warn, error, aber keine debug)
  const loggerLevels: ('log' | 'error' | 'warn' | 'debug' | 'verbose')[] =
    logLevel === 'debug'
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : nodeEnv === 'prd'
        ? ['error', 'warn']
        : ['log', 'error', 'warn'];

  const app = await NestFactory.create(AppModule, {
    logger: loggerLevels,
  });

  // Security-Headers mit Helmet hinzufügen
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Für Swagger UI Kompatibilität
    }),
  );

  const configService = app.get(ConfigService);

  // Enable class-validator to use NestJS's dependency injection container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable CORS
  const allowedLocalhostPorts = ['5173', '3000', '4200']; // Erlaubte Ports für lokale Entwicklung
  const allowedOrigins: string[] = ['http://localhost:5173']; // Local Frontend Development
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
  }
  const corsLogger = new Logger('CORS');
  corsLogger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  app.enableCors({
    origin: (origin, callback) => {
      // Erlaube Anfragen ohne Origin für OPTIONS-Requests (Preflight) und andere legitime Anfragen
      if (!origin) {
        corsLogger.debug('Request without origin - allowing (likely OPTIONS preflight)');
        return callback(null, true);
      }
      // Erlaube localhost nur für spezifische Ports (Sicherheitsverbesserung)
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        try {
          const url = new URL(origin);
          const port = url.port || (url.protocol === 'https:' ? '443' : '80');
          if (allowedLocalhostPorts.includes(port)) {
            corsLogger.debug(`Allowing localhost origin: ${origin}`);
            return callback(null, true);
          }
          corsLogger.debug(`Blocking localhost origin with non-allowed port: ${origin}`);
        } catch {
          corsLogger.debug(`Invalid localhost origin format: ${origin}`);
        }
      }
      // Prüfe erlaubte Origins
      if (allowedOrigins.includes(origin)) {
        corsLogger.debug(`Allowing configured origin: ${origin}`);
        return callback(null, true);
      }
      corsLogger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Globalen TimezoneInterceptor hinzufügen
  app.useGlobalInterceptors(new TimezoneInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Nürnbergspots API')
    .setDescription('The Nürnbergspots API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Get port from environment variable or use default
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
