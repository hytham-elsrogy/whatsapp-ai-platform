import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

export interface CreateUserInput {
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  password: string;
  language?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ["role", "role.permissions", "tenant"],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["role", "role.permissions", "tenant"],
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /** Tenant-scoped — use when `id` originates from unvalidated client input (see findById's equivalent doc comment on WhatsappNumbersService for why this distinction matters). */
  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: input.email.toLowerCase(), tenantId: input.tenantId },
    });
    if (existing)
      throw new ConflictException("Email already in use for this tenant");

    const user = this.userRepository.create({
      tenantId: input.tenantId,
      roleId: input.roleId,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await User.hashPassword(input.password),
      language: input.language ?? "ar",
    });
    return this.userRepository.save(user);
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }
}
