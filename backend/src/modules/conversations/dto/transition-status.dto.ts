import { IsIn } from "class-validator";
import { ConversationStatus } from "../entities/conversation.entity";

const STATUSES: ConversationStatus[] = [
  "new",
  "bot",
  "ai",
  "waiting",
  "assigned",
  "in_progress",
  "pending_customer",
  "escalated",
  "resolved",
  "closed",
];

export class TransitionStatusDto {
  @IsIn(STATUSES)
  status: ConversationStatus;
}
