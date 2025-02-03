import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // Import JwtAuthGuard

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const jwtSecret = configService.get<string>('jwtSecret');

  app.enableCors(); // Enable CORS

  const config = new DocumentBuilder()
    .setTitle('سیستم مدیریت نمرات')
    .setDescription('API برای مدیریت نمرات و اعتراضات دانشجویان')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);


  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();