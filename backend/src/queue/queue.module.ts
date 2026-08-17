import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

export const WHATSAPP_INBOUND_QUEUE = "whatsapp-inbound";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("redis.host", "localhost"),
          port: config.get<number>("redis.port", 6379),
          password: config.get<string>("redis.password", "") || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: WHATSAPP_INBOUND_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
