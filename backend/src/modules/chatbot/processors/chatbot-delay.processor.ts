import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChatbotService } from '../chatbot.service';
import { CHATBOT_DELAY_QUEUE } from '../chatbot-delay.constants';

interface ChatbotDelayJobData {
  sessionId: string;
  nodeId: string;
}

@Processor(CHATBOT_DELAY_QUEUE)
export class ChatbotDelayProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatbotDelayProcessor.name);

  constructor(private readonly chatbotService: ChatbotService) {
    super();
  }

  async process(job: Job<ChatbotDelayJobData>): Promise<void> {
    await this.chatbotService.resumeAfterDelay(job.data.sessionId, job.data.nodeId);
    this.logger.debug(`Resumed session ${job.data.sessionId} after delay node ${job.data.nodeId}`);
  }
}
