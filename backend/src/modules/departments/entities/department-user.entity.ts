import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Department } from "./department.entity";
import { User } from "@/modules/users/entities/user.entity";

@Entity("department_users")
export class DepartmentUser {
  @PrimaryColumn({ name: "department_id" })
  departmentId: string;

  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @ManyToOne(() => Department, { onDelete: "CASCADE" })
  @JoinColumn({ name: "department_id" })
  department: Department;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "is_supervisor", default: false })
  isSupervisor: boolean;

  @Column({ type: "jsonb", nullable: true })
  skills?: string[];

  @Column({ name: "max_concurrent_conversations", default: 10 })
  maxConcurrentConversations: number;
}
