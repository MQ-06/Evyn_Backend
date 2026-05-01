import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

// This interface describes what we put INSIDE the JWT token
export interface JwtPayload {
  sub: string;    // "sub" = subject = the user's ID (JWT standard field name)
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // ↑ PassportStrategy(Strategy) means "use the JWT strategy from passport-jwt"

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ↑ Look for the token in the "Authorization: Bearer <token>" header
      
      ignoreExpiration: false,
      // ↑ Reject tokens that have expired. Always set to false in production.
      
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
      // ↑ The secret key used to verify the token signature.
      // Must match the secret used when signing (in AuthService).
    });
  }

  // This method runs AFTER the token signature is verified.
  // The `payload` is the decoded token content (what we put in when signing).
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      // User was deleted or banned after token was issued
      throw new UnauthorizedException('Account not found or inactive');
    }

    // Whatever you return here gets attached to req.user
    // So in any controller, this.req.user = { id, email, role }
    return { id: user.id, email: user.email, role: user.role };
  }
}