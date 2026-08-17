import { IsIn, IsOptional, IsString } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateDepartmentDto } from "./create-department.dto";

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @IsOptional()
  @IsString()
  knowledgeBaseId?: string | null;

  @IsOptional()
  @IsString()
  aiAgentId?: string | null;

  @IsOptional()
  @IsIn(["auto", "suggestion", "human_only"])
  aiReplyMode?: "auto" | "suggestion" | "human_only";

  @IsOptional()
  @IsIn([
    "round_robin",
    "least_active",
    "department_based",
    "manual",
    "skill_based",
  ])
  routingStrategy?:
    | "round_robin"
    | "least_active"
    | "department_based"
    | "manual"
    | "skill_based";
}
