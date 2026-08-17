import { IsString } from "class-validator";

export class AssignConversationDto {
  @IsString()
  agentId: string;
}

export class TransferConversationDto {
  @IsString()
  departmentId: string;
}
