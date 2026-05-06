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
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────────

  @Public()
  @Get('products')
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
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
