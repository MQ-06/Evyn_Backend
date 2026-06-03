import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly usersService: UsersService) {}

  async getProfile(userId: string) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch profile');
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new NotFoundException('User not found');

      return await this.usersService.update(userId, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new NotFoundException('User not found');

      const match = await bcrypt.compare(dto.currentPassword, user.password);
      if (!match) throw new UnauthorizedException('Current password is incorrect');

      const hashed = await bcrypt.hash(dto.newPassword, 12);
      await this.usersService.update(userId, { password: hashed });

      return { message: 'Password updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to change password');
    }
  }
}
