import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { CreateSellerDto } from './dto/create-seller.dto';
import { SellerSetupDto } from './dto/seller-setup.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function withoutRefreshToken(result: {
  access_token: string;
  refresh_token: string;
  user: object;
}) {
  return { access_token: result.access_token, user: result.user };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(dto);
    res.cookie(COOKIE_NAME, result.refresh_token, COOKIE_OPTS);
    return withoutRefreshToken(result);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.refresh_token, COOKIE_OPTS);
    return withoutRefreshToken(result);
  }

  @Roles(Role.ADMIN)
  @Post('invite-seller')
  @HttpCode(HttpStatus.CREATED)
  inviteSeller(@Body() dto: CreateSellerDto) {
    return this.authService.inviteSeller(dto);
  }

  @Public()
  @Post('seller-setup')
  @HttpCode(HttpStatus.OK)
  async sellerSetup(
    @Body() dto: SellerSetupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.sellerSetup(dto);
    res.cookie(COOKIE_NAME, result.refresh_token, COOKIE_OPTS);
    return withoutRefreshToken(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies[COOKIE_NAME] as string | undefined;
    if (!raw) throw new UnauthorizedException('No refresh token');

    const result = await this.authService.refreshTokens(raw);
    res.cookie(COOKIE_NAME, result.refresh_token, COOKIE_OPTS);
    return withoutRefreshToken(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies[COOKIE_NAME] as string | undefined;
    if (raw) await this.authService.revokeToken(raw);
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }
}
