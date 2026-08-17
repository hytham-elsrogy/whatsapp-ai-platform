import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const PRIORITIES = ["low", "normal", "high", "urgent"];

export class CreateTicketDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: "low" | "normal" | "high" | "urgent";

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  // Tickets have no title/subject column in the schema — the ticket itself
  // is a tracking record; this becomes the first (non-internal) ticket_comments row.
  @IsString()
  description: string;
}
