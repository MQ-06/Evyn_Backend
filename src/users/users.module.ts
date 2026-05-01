import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  // ↑ This registers the User entity with TypeORM FOR THIS MODULE ONLY.
  // Without this line, UsersService cannot inject the User repository.

  providers: [UsersService],
  // ↑ Makes UsersService available for dependency injection inside this module.

  controllers: [UsersController],
  // ↑ Registers the controller so NestJS handles its routes.

  exports: [UsersService],
  // ↑ IMPORTANT — this lets OTHER modules (like AuthModule) use UsersService.
  // Without exports, UsersService is private to this module only.
})
export class UsersModule {}