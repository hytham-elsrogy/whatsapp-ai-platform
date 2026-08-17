import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const frontendUrl = configService.get<string>('frontendUrl');

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useWebSocketAdapter(new IoAdapter(app));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatsApp CRM API')
    .setDescription('نظام إدارة محادثات WhatsApp للمؤسسات - WhatsApp Omnichannel CRM')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'المصادقة وإدارة الجلسات')
    .addTag('users', 'إدارة المستخدمين')
    .addTag('departments', 'إدارة الأقسام')
    .addTag('contacts', 'إدارة جهات الاتصال')
    .addTag('conversations', 'إدارة المحادثات')
    .addTag('messages', 'الرسائل')
    .addTag('whatsapp', 'تكامل WhatsApp Business API')
    .addTag('templates', 'قوالب الردود')
    .addTag('notifications', 'الإشعارات')
    .addTag('reports', 'التقارير والإحصائيات')
    .addTag('settings', 'إعدادات النظام')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`🚀 WhatsApp CRM Backend running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
