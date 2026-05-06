import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity: number;
}
