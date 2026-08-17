import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'whatsapp_crm',
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  // Create default department
  const deptResult = await ds.query(`
    INSERT INTO departments (id, name, description, "isActive", color)
    VALUES (gen_random_uuid(), 'عام', 'القسم العام', true, '#25D366')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  const deptId = deptResult[0]?.id;
  console.log('Department:', deptId ? 'Created' : 'Already exists');

  // Create super admin
  const hash = await bcrypt.hash('Admin@123456', 12);
  const existing = await ds.query(`SELECT id FROM users WHERE email = 'admin@whatsapp-crm.com'`);

  if (existing.length === 0) {
    await ds.query(`
      INSERT INTO users (id, email, password, name, role, "isActive", "twoFactorEnabled", "isOnline", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'admin@whatsapp-crm.com', $1, 'Super Admin', 'super_admin', true, false, false, NOW(), NOW())
    `, [hash]);
    console.log('Super admin created: admin@whatsapp-crm.com / Admin@123456');
  } else {
    console.log('Super admin already exists');
  }

  await ds.destroy();
  console.log('Seed completed!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
