import { Injectable } from '@nestjs/common';
import { TemplatesService } from '@/modules/templates/templates.service';
import { ActionContext, ActionDefinition, ActionResult } from '../action.interface';

@Injectable()
export class SendTemplateAction implements ActionDefinition {
  name = 'sendTemplate';
  description =
    'Send a pre-approved WhatsApp message template. Required when the 24h customer service window is closed.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      templateName: { type: 'string' },
      language: { type: 'string' },
      variables: { type: 'array', items: { type: 'string' } },
    },
    required: ['templateName', 'language'],
  };

  constructor(private readonly templatesService: TemplatesService) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const message = await this.templatesService.sendApprovedTemplate(
      ctx.tenantId,
      ctx.conversation.id,
      {
        templateName: String(input.templateName),
        language: String(input.language),
        variables: (input.variables as string[] | undefined) ?? [],
      },
      { type: 'ai' },
    );
    return { success: true, messageId: message.id };
  }
}
