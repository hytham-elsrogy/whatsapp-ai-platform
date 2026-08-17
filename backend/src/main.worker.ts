import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Worker entrypoint: same module graph as the API (`main.ts`), but no HTTP
 * listener — this process exists only to run BullMQ job processors
 * (webhook inbound processing, SLA sweep, chatbot delay resume). It stays
 * alive via its DB/Redis connections and the active BullMQ Worker
 * connections, not an HTTP server.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Worker running — consuming BullMQ queues, no HTTP listener');

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
