import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { TagScope } from "../entities/tag.entity";

export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsIn(["conversation", "customer"])
  scope?: TagScope;
}
