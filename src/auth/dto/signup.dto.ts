import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../users/enums/role.enum';

export class SignupDto {
  @IsNotEmpty()          // field must be present and non-empty
  @IsString()
  name: string;

  @IsEmail()             // must be a valid email format
  email: string;

  @MinLength(8)          // minimum 8 characters
  @IsString()
  password: string;

  @IsOptional()          // phone is not required
  @IsString()
  phone?: string;

  // Note: role is NOT here — buyers always sign up as BUYER.
  // Sellers are invited by admin, not self-registered.
}