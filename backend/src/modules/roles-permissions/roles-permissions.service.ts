import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class RolesPermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findSystemRoleByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name, tenant: IsNull() },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`System role "${name}" not found`);
    return role;
  }

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }
}
