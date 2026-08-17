import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { GuardrailRules } from "../entities/ai-agent.entity";

export class CreateAiAgentDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  systemPrompt: string;

  @IsString()
  @MaxLength(100)
  model: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4000)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDepartments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedActions?: string[];

  @IsOptional()
  @IsObject()
  guardrailRules?: GuardrailRules;

  @IsOptional()
  @IsString()
  @IsIn(["auto", "ar", "en"])
  language?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
