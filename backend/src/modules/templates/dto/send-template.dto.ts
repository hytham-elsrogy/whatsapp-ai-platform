import { IsArray, IsOptional, IsString } from "class-validator";

export class SendTemplateDto {
  @IsString()
  templateName: string;

  @IsString()
  language: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
