import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../enums/role.enum';

@Entity('users')         // ← this creates a table named "users" in PostgreSQL
export class User {

  @PrimaryGeneratedColumn('uuid')
  id: string;
  // Auto-generates a unique UUID like "a3f2c1d4-..." for every row.
  // Never needs to be set manually.

  @Column({ length: 120 })
  name: string;
  // VARCHAR(120) column. Required — NestJS will throw if you try
  // to save a user without a name.

  @Column({ unique: true })
  email: string;
  // PostgreSQL enforces uniqueness. Two users cannot have the same email.
  // Trying to insert a duplicate throws a DB error you can catch.

  @Column()
  password: string;
  // Stores the HASHED password (never plain text).
  // Hashing happens in AuthService — not here.

  @Column({
    type: 'enum',
    enum: Role,
  })
  role: Role;
  // PostgreSQL creates an ENUM type column.
  // Only accepts 'admin', 'seller', 'buyer' — anything else is a DB error.

  @Column({ nullable: true, length: 20 })
  phone: string;
  // nullable: true means this column can be NULL in the DB.
  // Optional field — buyers may skip it, sellers should fill it.

  @Column({ nullable: true, length: 120 })
  businessName: string;
  // Only used by Sellers. Buyers leave this null.

  @Column({ default: true })
  isActive: boolean;
  // When Admin deactivates a user → false.
  // Deactivated users cannot log in.
  // Sellers start as false until they complete setup.

  @Column({ nullable: true })
  inviteToken: string;
  // A random token emailed to new Sellers.
  // They use it to set their password.
  // Cleared after use.

  @Column({ nullable: true, type: 'timestamptz' })
  inviteExpiry: Date;
  // When the invite link expires (48 hours from creation).
  // timestamptz = timestamp WITH timezone — always recommended.

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
  // TypeORM sets this automatically when the row is first saved.
  // You never set this manually.

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
  // TypeORM updates this automatically every time the row changes.
  // You never set this manually.
}