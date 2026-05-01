import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    // ↑ Automatically strips any property NOT in the DTO.
    // If someone sends { "role": "admin" } in signup body, it's silently removed.
    
    forbidNonWhitelisted: true,
    // ↑ Instead of silently stripping, throw a 400 error if unknown fields are sent.
    // Catches bugs in frontend calls early.
    
    transform: true,
    // ↑ Auto-converts incoming data types. e.g. "5" becomes 5 if the DTO says number.
  }));

  await app.listen(3000);
}
bootstrap();