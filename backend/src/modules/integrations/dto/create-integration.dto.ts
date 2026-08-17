import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import {
  IntegrationConfig,
  IntegrationType,
} from "../entities/integration.entity";

const TYPES: IntegrationType[] = ["odoo", "oracle_apex", "his", "custom"];

export class CreateIntegrationDto {
  @IsIn(TYPES)
  type: IntegrationType;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsObject()
  config: IntegrationConfig;

  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
