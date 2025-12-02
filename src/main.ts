import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { I18nMiddleware } from './i18n/i18n.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const i18nMiddleware = new I18nMiddleware();
  app.use(i18nMiddleware.use.bind(i18nMiddleware));

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      stopAtFirstError: false,
    }),
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Allow local network
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-lang',
      'Accept-Language',
    ],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Alkitab Aljamii API')
    .setDescription('The Alkitab Aljamii Backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env['PORT'] ?? 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port.toString()}`);
  console.log(
    `Swagger documentation: http://localhost:${port.toString()}/api/docs`,
  );
}

void bootstrap();
