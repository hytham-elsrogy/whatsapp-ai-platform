import { Injectable, Logger } from '@nestjs/common';
import { DepartmentsService } from '@/modules/departments/departments.service';
import { ConversationsService } from '@/modules/conversations/conversations.service';
import { TagsService } from '@/modules/tags/tags.service';

/**
 * Selects which agent (if any) a conversation should go to, per the
 * department's configured strategy — see
 * docs/architecture/08-routing-architecture.md § 2.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly conversationsService: ConversationsService,
    private readonly tagsService: TagsService,
  ) {}

  /** conversationId is only required for skill_based — other strategies ignore it. */
  async selectAgent(departmentId: string, conversationId?: string): Promise<string | null> {
    const department = await this.departmentsService.findByIdUnscoped(departmentId);
    const agents = await this.departmentsService.getDepartmentAgents(departmentId);
    if (agents.length === 0) {
      this.logger.warn(`Department ${departmentId} has no agents to route to`);
      return null;
    }

    switch (department.routingStrategy) {
      case 'round_robin': {
        const index = department.lastAssignedIndex % agents.length;
        await this.departmentsService.advanceRoundRobinCursor(departmentId, index + 1);
        return agents[index].userId;
      }
      case 'least_active': {
        const counts = await Promise.all(
          agents.map(async (a) => ({
            userId: a.userId,
            count: await this.conversationsService.countActiveForAgent(a.userId),
          })),
        );
        counts.sort((a, b) => a.count - b.count);
        return counts[0].userId;
      }
      case 'skill_based': {
        if (!conversationId) return null;
        const tagNames = (await this.tagsService.listForConversation(conversationId)).map((t) => t.name);
        if (tagNames.length === 0) return null; // nothing to match on — falls back to unassigned, same as department_based

        const skilled = agents.filter((a) => (a.skills ?? []).some((skill) => tagNames.includes(skill)));
        if (skilled.length === 0) return null;

        const counts = await Promise.all(
          skilled.map(async (a) => ({
            userId: a.userId,
            count: await this.conversationsService.countActiveForAgent(a.userId),
          })),
        );
        counts.sort((a, b) => a.count - b.count);
        return counts[0].userId;
      }
      case 'department_based':
      case 'manual':
      default:
        return null;
    }
  }
}
