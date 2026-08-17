import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateWhatsappNumberDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  accessTokenSecretRef?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  chatbotFlowId?: string;

  @IsOptional()
  @IsString()
  aiAgentId?: string;

  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
