import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── BUYER ────────────────────────────────────────────────────────────────────

  @Roles(Role.BUYER)
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  placeOrder(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }

  @Roles(Role.BUYER)
  @Get('account/orders')
  getMyOrders(@CurrentUser() user: AuthUser) {
    return this.ordersService.getMyOrders(user.id);
  }

  // Shared: buyer sees own order, seller sees if their items are in it, admin sees all
  @Roles(Role.BUYER, Role.SELLER, Role.ADMIN)
  @Get('account/orders/:id')
  getOrderDetail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getOrderDetail(id, user.id, user.role);
  }

  // ─── SELLER / ADMIN ───────────────────────────────────────────────────────────

  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/orders')
  getSellerOrders(@CurrentUser() user: AuthUser) {
    return this.ordersService.getSellerOrders(user.id, user.role);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Patch('seller/orders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role, dto);
  }
}
