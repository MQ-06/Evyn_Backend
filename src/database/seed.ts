import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [User],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({
    where: { email: process.env.ADMIN_EMAIL },
  });

  if (existing) {
    console.log('Admin already exists — skipping seed');
    await AppDataSource.destroy();
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminPassword || !adminEmail) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = userRepo.create({
    name: 'Admin',
    email: adminEmail,
    password: hashedPassword,
    role: Role.ADMIN,
    isActive: true,
  });

  await userRepo.save(admin);
  console.log(`Admin created: ${adminEmail}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});