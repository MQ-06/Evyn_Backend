import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductsService, PRODUCT_CHANGED } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────────

  @Public()
  @Get('products')
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  // SSE — must be declared before products/:slug to avoid slug matching "events"
  @Public()
  @Sse('products/events')
  productEvents(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, PRODUCT_CHANGED).pipe(
      map((data) => ({ data }) as MessageEvent),
    );
  }

  @Public()
  @Get('products/:slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // ─── SELLER ───────────────────────────────────────────────────────────────────

  @Roles(Role.SELLER)
  @Post('seller/products')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @Roles(Role.SELLER)
  @Get('seller/products')
  findMine(@CurrentUser() user: AuthUser) {
    return this.productsService.findBySeller(user.id);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/products/:id')
  findOneForSeller(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findOneBySeller(id, user.id, user.role);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Patch('seller/products/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.id, user.role, dto);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Delete('seller/products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user.id, user.role);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Patch('seller/products/:id/toggle')
  toggleActive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.toggleActive(id, user.id, user.role);
  }
}
