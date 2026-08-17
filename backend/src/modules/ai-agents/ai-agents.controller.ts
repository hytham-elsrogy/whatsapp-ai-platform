import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { AiAgentsService } from "./ai-agents.service";
import { CreateAiAgentDto } from "./dto/create-ai-agent.dto";
import { UpdateAiAgentDto } from "./dto/update-ai-agent.dto";

@ApiTags("ai-agents")
@ApiBearerAuth()
@Controller("ai-agents")
export class AiAgentsController {
  constructor(private readonly aiAgentsService: AiAgentsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.aiAgentsService.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.aiAgentsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("ai_agents.manage")
  create(@CurrentUser() user: User, @Body() dto: CreateAiAgentDto) {
    return this.aiAgentsService.create(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions("ai_agents.manage")
  update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateAiAgentDto,
  ) {
    return this.aiAgentsService.update(user.tenantId, id, dto);
  }
}
