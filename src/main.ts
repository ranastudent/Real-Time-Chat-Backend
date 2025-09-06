// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Allow CORS (important if frontend is separate)
  app.enableCors({
    origin: '*', // change to your frontend URL later for security
  });

  // ✅ Attach WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const PORT = 5000;
  await app.listen(PORT);

  console.log(`🚀 HTTP server running at: http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready at: ws://localhost:${PORT}`);
}

bootstrap();
