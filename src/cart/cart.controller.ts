import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('cart')
@Roles(Role.BUYER) // every route in this controller requires a logged-in buyer
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthUser) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  addToCart(@CurrentUser() user: AuthUser, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.id, dto);
  }

  @Patch(':itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@Param('itemId') itemId: string, @CurrentUser() user: AuthUser) {
    return this.cartService.removeItem(user.id, itemId);
  }
}
