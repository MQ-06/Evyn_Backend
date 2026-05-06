import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('account/profile')
@Roles(Role.BUYER, Role.SELLER)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user.id, dto);
  }
}
