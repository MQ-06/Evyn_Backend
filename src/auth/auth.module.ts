import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    // ↑ Import UsersModule so we can use UsersService here.
    // Remember UsersModule exports UsersService — that's why this works.

    PassportModule.register({ defaultStrategy: 'jwt' }),
    // ↑ Tells Passport the default strategy is JWT.

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') ?? '7d',
        },
      }),
      // ↑ registerAsync so we can read from .env via ConfigService.
      // If we used .register() directly, .env wouldn't be loaded yet.
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    // ↑ Register the strategy as a provider so Passport can discover it.
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard],
  // ↑ Export so other modules can use @UseGuards(JwtAuthGuard) without importing AuthModule everywhere.
  // Actually we'll export the guards via a separate approach — see next step.
})
export class AuthModule {}