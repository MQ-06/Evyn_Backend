import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-().]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;
}
