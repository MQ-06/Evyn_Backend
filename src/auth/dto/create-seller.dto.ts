import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSellerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  businessName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
