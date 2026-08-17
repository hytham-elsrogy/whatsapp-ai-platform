import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateKnowledgeBaseDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
