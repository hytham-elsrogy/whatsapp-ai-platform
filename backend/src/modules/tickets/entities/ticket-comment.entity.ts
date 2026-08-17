import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  // Nullable — a ticket's opening comment may be authored by the AI Agent
  // rather than a human user (see the AllowSystemAuthoredTicketComments migration).
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'is_internal', default: true })
  isInternal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
