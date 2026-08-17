import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "./entities/department.entity";
import { DepartmentUser } from "./entities/department-user.entity";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentUser)
    private readonly departmentUserRepository: Repository<DepartmentUser>,
  ) {}

  findAll(tenantId: string): Promise<Department[]> {
    return this.departmentRepository.find({ where: { tenantId } });
  }

  async findOne(tenantId: string, id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId },
    });
    if (!department) throw new NotFoundException("Department not found");
    return department;
  }

  async findByIdUnscoped(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!department) throw new NotFoundException("Department not found");
    return department;
  }

  findByName(tenantId: string, name: string): Promise<Department | null> {
    return this.departmentRepository.findOne({ where: { tenantId, name } });
  }

  create(tenantId: string, dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepository.create({ ...dto, tenantId });
    return this.departmentRepository.save(department);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    await this.findOne(tenantId, id); // tenant-scope check
    await this.departmentRepository.update(id, dto);
    return this.findOne(tenantId, id);
  }

  getDepartmentAgents(departmentId: string): Promise<DepartmentUser[]> {
    return this.departmentUserRepository.find({
      where: { departmentId },
      relations: ["user"],
      order: { userId: "ASC" },
    });
  }

  async addAgent(
    departmentId: string,
    userId: string,
    isSupervisor = false,
  ): Promise<void> {
    const existing = await this.departmentUserRepository.findOne({
      where: { departmentId, userId },
    });
    if (existing) return;
    await this.departmentUserRepository.save(
      this.departmentUserRepository.create({
        departmentId,
        userId,
        isSupervisor,
      }),
    );
  }

  async advanceRoundRobinCursor(
    departmentId: string,
    nextIndex: number,
  ): Promise<void> {
    await this.departmentRepository.update(departmentId, {
      lastAssignedIndex: nextIndex,
    });
  }

  /** Explicit department_users.is_supervisor members, falling back to departments.supervisor_id. */
  async getSupervisorUserIds(departmentId: string): Promise<string[]> {
    const supervisors = await this.departmentUserRepository.find({
      where: { departmentId, isSupervisor: true },
    });
    if (supervisors.length > 0) return supervisors.map((s) => s.userId);

    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });
    return department?.supervisorId ? [department.supervisorId] : [];
  }
}
