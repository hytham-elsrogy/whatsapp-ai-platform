import {
  Controller, Get, Post, Body, Query, Res, Logger, HttpCode, SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { MessagesService } from '../messages/messages.service';
import { ContactsService } from '../contacts/contacts.service';
import { MessageStatus } from '../../common/enums';
import { IS_PUBLIC_KEY } from '../../common/guards/jwt-auth.guard';

const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly messagesService: MessagesService,
    private readonly contactsService: ContactsService,
  ) {}

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'التحقق من Webhook' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'استقبال رسائل WhatsApp الواردة' })
  async receiveWebhook(@Body() body: any) {
    this.logger.debug(`Webhook received: ${JSON.stringify(body)}`);

    const parsed = this.whatsappService.parseWebhookPayload(body);
    if (!parsed) return { status: 'ok' };

    for (const status of parsed.statuses) {
      try {
        await this.messagesService.updateStatus(status.id, status.status as MessageStatus);
      } catch (err) {
        this.logger.error(`Status update failed: ${err.message}`);
      }
    }

    for (const waMessage of parsed.messages) {
      try {
        const waContact = parsed.contacts.find((c: any) => c.wa_id === waMessage.from);
        const contactName = waContact?.profile?.name;
        const phone = waMessage.from;

        const contact = await this.contactsService.findOrCreate(phone, contactName);

        const enrichedMessage = {
          ...waMessage,
          mediaUrl: null,
        };

        if (['image', 'audio', 'video', 'document', 'sticker'].includes(waMessage.type)) {
          try {
            const mediaId = waMessage[waMessage.type]?.id;
            if (mediaId) {
              const mediaData = await this.whatsappService.getMediaUrl(mediaId);
              enrichedMessage.mediaUrl = mediaData;
            }
          } catch (e) {
            this.logger.warn(`Could not fetch media: ${e.message}`);
          }
        }

        await this.messagesService.handleIncoming(enrichedMessage, contact);

        if (waMessage.id) {
          try {
            await this.whatsappService.markMessageRead(waMessage.id);
          } catch (e) {}
        }
      } catch (err) {
        this.logger.error(`Failed to process incoming message: ${err.message}`, err.stack);
      }
    }

    return { status: 'ok' };
  }
}
