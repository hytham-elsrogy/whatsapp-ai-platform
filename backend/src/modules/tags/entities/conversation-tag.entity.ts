import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { Tag } from "./tag.entity";

@Entity("conversation_tags")
export class ConversationTag {
  @PrimaryColumn({ name: "conversation_id" })
  conversationId: string;

  @PrimaryColumn({ name: "tag_id" })
  tagId: string;

  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @ManyToOne(() => Tag, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tag_id" })
  tag: Tag;
}
