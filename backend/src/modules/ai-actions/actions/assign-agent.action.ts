import { Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { UsersService } from "@/modules/users/users.service";
import { AssignmentService } from "@/modules/assignment/assignment.service";
import {
  ActionContext,
  ActionDefinition,
  ActionResult,
} from "../action.interface";

@Injectable()
export class AssignAgentAction implements ActionDefinition {
  name = "assignAgent";
  description =
    "Assign this conversation directly to a specific human agent by their email address.";
  inputSchema = {
    type: "object" as const,
    properties: {
      agentEmail: { type: "string", description: "The agent's login email" },
    },
    required: ["agentEmail"],
  };

  constructor(
    private readonly usersService: UsersService,
    private readonly assignmentService: AssignmentService,
  ) {}

  async handler(
    input: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const agent = await this.usersService.findByEmail(String(input.agentEmail));
    if (!agent || agent.tenantId !== ctx.tenantId)
      return { success: false, reason: "agent_not_found" };

    try {
      await this.assignmentService.assign(
        ctx.tenantId,
        ctx.conversation.id,
        agent.id,
        {
          type: "ai",
        },
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, reason: error.message };
      }
      throw error;
    }
    return { success: true, agentId: agent.id };
  }
}
