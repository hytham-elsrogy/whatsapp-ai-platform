import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { ChatbotFlowsService } from "./chatbot-flows.service";
import { CreateFlowDto } from "./dto/create-flow.dto";
import { SaveGraphDto } from "./dto/save-graph.dto";

@ApiTags("chatbot")
@ApiBearerAuth()
@Controller("chatbot-flows")
export class ChatbotFlowsController {
  constructor(private readonly service: ChatbotFlowsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.service.findOneWithGraph(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("chatbot.manage")
  create(@CurrentUser() user: User, @Body() dto: CreateFlowDto) {
    return this.service.create(user.tenantId, user.id, dto);
  }

  @Put(":id/graph")
  @RequirePermissions("chatbot.manage")
  saveGraph(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: SaveGraphDto,
  ) {
    return this.service.saveGraph(user.tenantId, id, dto);
  }

  @Post(":id/publish")
  @RequirePermissions("chatbot.manage")
  publish(@CurrentUser() user: User, @Param("id") id: string) {
    return this.service.publish(user.tenantId, id);
  }
}
