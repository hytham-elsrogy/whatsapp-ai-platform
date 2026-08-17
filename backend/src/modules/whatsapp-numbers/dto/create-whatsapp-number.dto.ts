import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWhatsappNumberDto {
  @IsString()
  @MaxLength(50)
  phoneNumberId: string;

  @IsString()
  @MaxLength(50)
  wabaId: string;

  @IsString()
  @MaxLength(30)
  displayNumber: string;

  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(255)
  accessTokenSecretRef: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  chatbotFlowId?: string;

  @IsOptional()
  @IsString()
  aiAgentId?: string;
}
