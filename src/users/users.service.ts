import { HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({ where: { email } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to find user by email');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({ where: { id } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findByInviteToken(token: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({ where: { inviteToken: token } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to find user by invite token');
    }
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const user = this.userRepo.create(data);
      return await this.userRepo.save(user);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      await this.userRepo.update(id, data);
      return this.findById(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async findAll(role?: string): Promise<User[]> {
    try {
      if (role) {
        return await this.userRepo.find({ where: { role: role as any } });
      }
      return await this.userRepo.find();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }
}
