import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SellerSetupDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
