import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

const CATEGORIES = ["utility", "marketing", "authentication"];

class TemplateVariableInput {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  exampleValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsIn(CATEGORIES)
  category: "utility" | "marketing" | "authentication";

  @IsString()
  @MaxLength(10)
  language: string;

  // Variable placeholders are written as {{1}}, {{2}}, ... in body, matching
  // Meta's own template syntax — variables[] below is just metadata (example
  // value + description) for each positional placeholder, in order.
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableInput)
  variables?: TemplateVariableInput[];
}
