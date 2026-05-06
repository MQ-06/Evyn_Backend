import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { CreateSellerDto } from './dto/create-seller.dto';
import { SellerSetupDto } from './dto/seller-setup.dto';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/entities/user.entity';

const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ─── BUYER SIGNUP ─────────────────────────────────────────────────────────────

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      phone: dto.phone,
      role: Role.BUYER,
      isActive: true,
    });

    return this.issueTokenPair(user);
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive)
      throw new UnauthorizedException('Account is deactivated');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokenPair(user);
  }

  // ─── ADMIN: INVITE SELLER ─────────────────────────────────────────────────────

  async inviteSeller(dto: CreateSellerDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const inviteToken = randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.usersService.create({
      name: dto.name,
      email: dto.email,
      businessName: dto.businessName,
      phone: dto.phone ?? null,
      role: Role.SELLER,
      isActive: false,
      password: '',
      inviteToken,
      inviteExpiry,
    });

    await this.mailService.sendSellerInvite(dto.email, dto.name, inviteToken);

    return { message: `Invite sent to ${dto.email}` };
  }

  // ─── SELLER: COMPLETE ACCOUNT SETUP ──────────────────────────────────────────

  async sellerSetup(dto: SellerSetupDto) {
    const user = await this.usersService.findByInviteToken(dto.token);
    if (!user) throw new BadRequestException('Invalid or expired invite link');

    if (!user.inviteExpiry || user.inviteExpiry < new Date()) {
      throw new BadRequestException('Invite link has expired');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const activated = await this.usersService.update(user.id, {
      password: hashed,
      isActive: true,
      inviteToken: null,
      inviteExpiry: null,
    });

    return this.issueTokenPair(activated!);
  }

  // ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

  async refreshTokens(rawToken: string) {
    const hash = this.hashToken(rawToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { token: hash },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) await this.refreshTokenRepo.delete(record.id);
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user || !user.isActive) {
      await this.refreshTokenRepo.delete(record.id);
      throw new UnauthorizedException('Account not found or deactivated');
    }

    // Rotate: delete old token, issue new pair
    await this.refreshTokenRepo.delete(record.id);
    return this.issueTokenPair(user);
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────

  async revokeToken(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    await this.refreshTokenRepo.delete({ token: hash });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async issueTokenPair(user: User) {
    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefresh = randomBytes(40).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        token: this.hashToken(rawRefresh),
        userId: user.id,
        expiresAt,
      }),
    );

    return {
      access_token,
      refresh_token: rawRefresh,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
