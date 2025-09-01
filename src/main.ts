import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // Stripe webhook needs raw body
  app.use(
    '/api/webhooks/stripe',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf; // 👈 Capture raw body here
      },
    }),
  );

  // For all other routes
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Due-Tap API')
    .setDescription(
      'API for Due-Tap payment reminder system with Super Admin and Client panels',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('Super Admin', 'Super Admin management endpoints')
    .addTag('Client Dashboard', 'Client dashboard and profile endpoints')
    .addTag('Templates', 'Payment reminder template management')
    .addTag('End Users', 'Client end user management')
    .addTag('Subscriptions', 'Recurring payment subscriptions')
    .addTag('Payments', 'Payment processing and management')
    .addTag('Analytics', 'Analytics and reporting')
    .addTag('Settings', 'API keys and integration settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
