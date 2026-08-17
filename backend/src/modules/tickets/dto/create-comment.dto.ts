import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateTicketCommentDto {
  @IsString()
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
