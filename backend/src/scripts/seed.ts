import 'dotenv/config';
import { IsNull } from 'typeorm';
import dataSource from '@/config/typeorm.datasource';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Role } from '@/modules/roles-permissions/entities/role.entity';
import { Permission } from '@/modules/roles-permissions/entities/permission.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Department } from '@/modules/departments/entities/department.entity';
import { DepartmentUser } from '@/modules/departments/entities/department-user.entity';
import {
  SYSTEM_ROLES,
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  AGENT_ROLE,
} from '@/common/constants/system-roles';

async function seed() {
  await dataSource.initialize();

  const roleRepo = dataSource.getRepository(Role);
  const permissionRepo = dataSource.getRepository(Permission);
  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);
  const departmentRepo = dataSource.getRepository(Department);
  const departmentUserRepo = dataSource.getRepository(DepartmentUser);

  const allPermissions = await permissionRepo.find();

  const rolesByName = new Map<string, Role>();
  for (const name of SYSTEM_ROLES) {
    let role = await roleRepo.findOne({ where: { name, tenant: IsNull() } });
    if (!role) {
      role = roleRepo.create({ name, isSystem: true });
      await roleRepo.save(role);
      console.log(`Created system role: ${name}`);
    }
    rolesByName.set(name, role);
  }

  function getRole(name: string): Role {
    const role = rolesByName.get(name);
    if (!role) throw new Error(`Role "${name}" was not seeded`);
    return role;
  }

  for (const name of [SUPER_ADMIN_ROLE, ADMIN_ROLE]) {
    const role = getRole(name);
    role.permissions = allPermissions;
    await roleRepo.save(role);
  }

  const tenantSlug = process.env.SEED_TENANT_SLUG || 'default';
  let tenant = await tenantRepo.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    tenant = tenantRepo.create({
      name: process.env.SEED_TENANT_NAME || 'Default Medical Center',
      slug: tenantSlug,
    });
    await tenantRepo.save(tenant);
    console.log(`Created tenant: ${tenant.name} (${tenant.slug})`);
  }

  let department = await departmentRepo.findOne({
    where: { tenantId: tenant.id, name: 'Customer Service' },
  });
  if (!department) {
    department = departmentRepo.create({
      tenantId: tenant.id,
      name: 'Customer Service',
      isActive: true,
    });
    await departmentRepo.save(department);
    console.log('Created default department: Customer Service');
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  let admin = await userRepo.findOne({ where: { email: adminEmail, tenantId: tenant.id } });
  if (!admin) {
    const superAdminRole = getRole(SUPER_ADMIN_ROLE);
    admin = userRepo.create({
      tenantId: tenant.id,
      roleId: superAdminRole.id,
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: await User.hashPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'),
    });
    await userRepo.save(admin);
    console.log(`Created super admin user: ${adminEmail}`);
  } else {
    console.log(`Super admin user already exists: ${adminEmail}`);
  }

  const agentRole = getRole(AGENT_ROLE);
  const agentSeeds = [
    { email: 'agent1@example.com', name: 'Agent One' },
    { email: 'agent2@example.com', name: 'Agent Two' },
  ];
  for (const seedAgent of agentSeeds) {
    let agent = await userRepo.findOne({ where: { email: seedAgent.email, tenantId: tenant.id } });
    if (!agent) {
      agent = userRepo.create({
        tenantId: tenant.id,
        roleId: agentRole.id,
        name: seedAgent.name,
        email: seedAgent.email,
        passwordHash: await User.hashPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'),
      });
      agent = await userRepo.save(agent);
      console.log(`Created agent user: ${seedAgent.email}`);
    }

    const membership = await departmentUserRepo.findOne({
      where: { departmentId: department.id, userId: agent.id },
    });
    if (!membership) {
      await departmentUserRepo.save(
        departmentUserRepo.create({ departmentId: department.id, userId: agent.id }),
      );
      console.log(`Added ${seedAgent.email} to Customer Service department`);
    }
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
