import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "./entities/message.entity";
import { MessageStatusEntity } from "./entities/message-status.entity";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageStatusEntity)
    private readonly statusRepo: Repository<MessageStatusEntity>,
  ) {}

  findByConversation(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { sentAt: "ASC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id, tenantId } });
    if (!message) throw new NotFoundException("Message not found");
    return message;
  }

  async create(data: Partial<Message>): Promise<Message> {
    const message = this.messageRepo.create(data);
    try {
      return await this.messageRepo.save(message);
    } catch (error) {
      // Meta may redeliver the same webhook; wa_message_id is unique, so a
      // duplicate insert here means this exact message was already stored.
      if (data.waMessageId && this.isUniqueViolation(error)) {
        const existing = await this.messageRepo.findOne({
          where: { waMessageId: data.waMessageId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (error as { code?: string })?.code === "23505";
  }

  async recordStatusUpdate(
    waMessageId: string,
    status: Message["status"],
    occurredAt: Date,
    rawPayload: Record<string, unknown>,
  ): Promise<void> {
    const message = await this.messageRepo.findOne({ where: { waMessageId } });
    if (!message) return;

    await this.statusRepo.save(
      this.statusRepo.create({
        messageId: message.id,
        status,
        occurredAt,
        rawPayload,
      }),
    );
    await this.messageRepo.update(message.id, { status });
  }
}
