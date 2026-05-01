import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    // ↑ We need UsersService to find/create users in DB
    
    private jwtService: JwtService,
    // ↑ JwtService signs and verifies tokens
  ) {}

  // ─── SIGNUP (Buyers only self-register) ─────────────────────────────────────

  async signup(dto: SignupDto) {
    // Check if email already taken
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
      // ConflictException → HTTP 409
    }

    // Hash the password — NEVER save plain text
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    // 12 = "salt rounds". Higher = slower = harder to brute-force.
    // 12 is industry standard. Don't go below 10.

    // Create the user — always as BUYER (role cannot be chosen on signup)
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      role: Role.BUYER,
      isActive: true,
    });

    // Return a token immediately so they're logged in right after signup
    return this.generateTokenResponse(user);
  }

  // ─── LOGIN (All roles use same endpoint) ─────────────────────────────────────

  async login(dto: LoginDto) {
    // Step 1: Find the user
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
      // Don't say "email not found" — that reveals which emails exist (security risk)
    }

    // Step 2: Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Step 3: Compare the provided password against the stored hash
    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    // bcrypt.compare() hashes the incoming password and compares — constant time
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Step 4: Generate and return the JWT
    return this.generateTokenResponse(user);
  }

  // ─── HELPER: Sign the JWT ─────────────────────────────────────────────────────

  private generateTokenResponse(user: any) {
    const payload = {
      sub: user.id,       // "sub" = subject (standard JWT claim)
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    // jwtService.sign() creates the token using JWT_SECRET from your .env
    // The token expires based on JWT_EXPIRES_IN from your .env (e.g. "7d")

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      // Never send the password back, even hashed
    };
  }
}