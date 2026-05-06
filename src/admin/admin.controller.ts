import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── SELLERS ──────────────────────────────────────────────────────────────────

  @Get('users/sellers')
  listSellers() {
    return this.adminService.listSellers();
  }

  @Get('users/sellers/:id')
  getSeller(@Param('id') id: string) {
    return this.adminService.getSeller(id);
  }

  @Patch('users/sellers/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleSeller(@Param('id') id: string) {
    return this.adminService.toggleSeller(id);
  }

  @Delete('users/sellers/:id')
  @HttpCode(HttpStatus.OK)
  deleteSeller(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteSeller(id, user.id);
  }

  // ─── BUYERS ───────────────────────────────────────────────────────────────────

  @Get('users/buyers')
  listBuyers() {
    return this.adminService.listBuyers();
  }

  @Get('users/buyers/:id')
  getBuyer(@Param('id') id: string) {
    return this.adminService.getBuyer(id);
  }

  @Patch('users/buyers/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleBuyer(@Param('id') id: string) {
    return this.adminService.toggleBuyer(id);
  }

  @Delete('users/buyers/:id')
  @HttpCode(HttpStatus.OK)
  deleteBuyer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteBuyer(id, user.id);
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────────

  @Get('products')
  listAllProducts() {
    return this.adminService.listAllProducts();
  }
}
