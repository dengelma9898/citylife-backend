import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TimezoneInterceptor } from './core/interceptors/timezone.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
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
      // Erlaube localhost für lokale Entwicklung
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        corsLogger.debug(`Allowing localhost origin: ${origin}`);
        return callback(null, true);
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
