import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');

    const user = this.userRepository.create({ ...dto, email: dto.email.toLowerCase() });
    return this.userRepository.save(user);
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    role?: UserRole; departmentId?: string; isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, role, departmentId, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', { search: `%${search}%` });
    }
    if (role) qb.andWhere('user.role = :role', { role });
    if (departmentId) qb.andWhere('user.departmentId = :departmentId', { departmentId });
    if (isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive });

    const [users, total] = await qb.getManyAndCount();
    return { data: users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.email) dto.email = dto.email.toLowerCase();
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) throw new ForbiddenException('لا يمكنك حذف حسابك الخاص');
    const user = await this.findOne(id);
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async getStats() {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { isActive: true } });
    const online = await this.userRepository.count({ where: { isOnline: true, isActive: true } });
    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.isActive = true')
      .groupBy('user.role')
      .getRawMany();

    return { total, active, online, byRole };
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    await this.userRepository.update(userId, { avatarUrl });
    return this.findOne(userId);
  }
}
