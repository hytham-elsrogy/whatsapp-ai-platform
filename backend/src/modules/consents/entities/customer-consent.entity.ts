import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Customer } from "@/modules/customers/entities/customer.entity";

export type ConsentStatus = "opted_in" | "opted_out" | "unknown";
export type ConsentType = "transactional" | "marketing";
export type ConsentSource = "webhook_optin" | "manual" | "imported";

@Entity("customer_consents")
export class CustomerConsent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  @Column({ name: "customer_id" })
  customerId: string;

  @Column({ name: "consent_status", length: 20 })
  consentStatus: ConsentStatus;

  @Column({ name: "consent_date", type: "timestamptz", nullable: true })
  consentDate?: Date | null;

  @Column({
    name: "consent_source",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  consentSource?: ConsentSource | null;

  @Column({ name: "consent_type", type: "varchar", length: 50, nullable: true })
  consentType?: ConsentType | null;

  @Column({ name: "opt_out_date", type: "timestamptz", nullable: true })
  optOutDate?: Date | null;

  @Column({
    name: "last_communication_at",
    type: "timestamptz",
    nullable: true,
  })
  lastCommunicationAt?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
