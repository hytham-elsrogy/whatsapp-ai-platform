import { Injectable } from "@nestjs/common";
import { TicketsService } from "@/modules/tickets/tickets.service";
import {
  ActionContext,
  ActionDefinition,
  ActionResult,
} from "../action.interface";

@Injectable()
export class CreateTicketAction implements ActionDefinition {
  name = "createTicket";
  description =
    "Create a support ticket from this conversation for follow-up that does not need an immediate reply.";
  inputSchema = {
    type: "object" as const,
    properties: {
      category: { type: "string" },
      description: { type: "string" },
    },
    required: ["category", "description"],
  };

  constructor(private readonly ticketsService: TicketsService) {}

  async handler(
    input: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const ticket = await this.ticketsService.create(ctx.tenantId, null, {
      customerId: ctx.conversation.customerId,
      conversationId: ctx.conversation.id,
      departmentId: ctx.conversation.departmentId,
      category: String(input.category),
      description: String(input.description),
    });
    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    };
  }
}
