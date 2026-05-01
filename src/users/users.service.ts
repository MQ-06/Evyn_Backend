import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // ↑ TypeORM gives you a Repository object for the User entity.
    // It has built-in methods: find, findOne, save, update, delete, etc.
    // @InjectRepository(User) tells NestJS which entity's repo to inject.
  ) {}

  // Find a user by their email address.
  // Used by AuthService during login to look up who's trying to sign in.
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
    // Returns null if no user found — AuthService handles that case.
  }

  // Find a user by their UUID.
  // Used to load the logged-in user's profile.
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  // Create and save a new user.
  // Partial<User> means you can pass any subset of User fields.
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    // ↑ .create() builds a User object in memory (no DB yet).
    return this.userRepo.save(user);
    // ↑ .save() writes it to the DB and returns the saved entity (with id, createdAt etc filled in).
  }

  // Update any fields on a user by their id.
  // Used by Admin to activate/deactivate, by Seller to complete setup.
 async update(id: string, data: Partial<User>): Promise<User | null> {
  await this.userRepo.update(id, data);
  return this.findById(id);
}   

  // Get all users — optionally filtered by role.
  // Used by Admin panel to list sellers or buyers.
  async findAll(role?: string): Promise<User[]> {
    if (role) {
      return this.userRepo.find({ where: { role: role as any } });
    }
    return this.userRepo.find();
  }
}