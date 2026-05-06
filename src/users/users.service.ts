import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // It has built-in methods: find, findOne, save, update, delete, etc.
  ) {}

  // Find a user by their email address.
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByInviteToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { inviteToken: token } });
  }

  // Create and save a new user.
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  // Update any fields on a user by their id.
 async update(id: string, data: Partial<User>): Promise<User | null> {
  await this.userRepo.update(id, data);
  return this.findById(id);
}   

  // Get all users — optionally filtered by role.
  async findAll(role?: string): Promise<User[]> {
    if (role) {
      return this.userRepo.find({ where: { role: role as any } });
    }
    return this.userRepo.find();
  }
}